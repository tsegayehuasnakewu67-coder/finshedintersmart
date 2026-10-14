const MINUTES_PER_DAY = 24 * 60;

export const toMinutes = (hour, minute) => Number(hour) * 60 + Number(minute);

export const getShiftDurationMinutes = (startHour, startMinute, endHour, endMinute) => {
  const start = toMinutes(startHour, startMinute);
  const end = toMinutes(endHour, endMinute);
  return end > start ? end - start : end + MINUTES_PER_DAY - start;
};

export const getShiftPreview = (shift) => {
  const grossMinutes = getShiftDurationMinutes(
    shift.startHour,
    shift.startMinute,
    shift.endHour,
    shift.endMinute,
  );
  const lunchMinutes = shift.lunchEnabled ? Number(shift.lunchDuration) : 0;
  const deadlineTotal = toMinutes(shift.startHour, shift.startMinute) + Number(shift.gracePeriod);
  const deadlineMinute = deadlineTotal % MINUTES_PER_DAY;

  return {
    grossMinutes,
    netMinutes: Math.max(0, grossMinutes - lunchMinutes),
    deadlineHour: Math.floor(deadlineMinute / 60),
    deadlineMinute: deadlineMinute % 60,
  };
};

export const validateShiftForm = (shift) => {
  const fields = [
    ['startHour', 0, 23],
    ['startMinute', 0, 59],
    ['gracePeriod', 5, 20],
    ['endHour', 0, 23],
    ['endMinute', 0, 59],
    ['lunchStartHour', 0, 23],
    ['lunchStartMinute', 0, 59],
    ['lunchDuration', shift.lunchEnabled ? 1 : 0, 180],
    ['beforeLunchStartHour', 0, 23],
    ['beforeLunchStartMinute', 0, 59],
    ['beforeLunchEndHour', 0, 23],
    ['beforeLunchEndMinute', 0, 59],
    ['afterLunchStartHour', 0, 23],
    ['afterLunchStartMinute', 0, 59],
    ['afterLunchEndHour', 0, 23],
    ['afterLunchEndMinute', 0, 59],
  ];

  for (const [field, min, max] of fields) {
    if (!Number.isInteger(Number(shift[field])) || Number(shift[field]) < min || Number(shift[field]) > max) {
      return `${field} must be an integer between ${min} and ${max}.`;
    }
  }

  const start = toMinutes(shift.startHour, shift.startMinute);
  const duration = getShiftDurationMinutes(
    shift.startHour,
    shift.startMinute,
    shift.endHour,
    shift.endMinute,
  );
  if (duration <= 0 || duration >= MINUTES_PER_DAY) {
    return 'Shift start and end times must define a duration between 1 minute and 24 hours.';
  }

  const offset = (hour, minute) => {
    const clockMinutes = toMinutes(hour, minute);
    const difference = clockMinutes - start;
    return difference < 0 && shift.endHour * 60 + shift.endMinute < start
      ? difference + MINUTES_PER_DAY
      : difference;
  };
  const beforeStartDifference = toMinutes(shift.beforeLunchStartHour, shift.beforeLunchStartMinute) - start;
  const beforeStartOffset = shift.endHour * 60 + shift.endMinute < start && beforeStartDifference < -MINUTES_PER_DAY / 2
    ? beforeStartDifference + MINUTES_PER_DAY
    : beforeStartDifference;
  const beforeEnd = offset(shift.beforeLunchEndHour, shift.beforeLunchEndMinute);
  const afterStart = offset(shift.afterLunchStartHour, shift.afterLunchStartMinute);
  const afterEnd = offset(shift.afterLunchEndHour, shift.afterLunchEndMinute);

  if (beforeEnd <= beforeStartOffset || beforeEnd > duration) {
    return 'The before-lunch window must be ordered and its end must fall within the shift.';
  }
  if (afterEnd <= afterStart || afterEnd > duration) {
    return 'The after-lunch window must be ordered and end within the shift.';
  }
  if (shift.lunchEnabled) {
    const lunchStart = offset(shift.lunchStartHour, shift.lunchStartMinute);
    const lunchEnd = lunchStart + Number(shift.lunchDuration);
    if (lunchStart < 0 || lunchStart < beforeEnd || lunchEnd > afterStart || lunchEnd > duration) {
      return 'Lunch must start after the before-lunch window and finish before the after-lunch window and shift end.';
    }
  } else if (beforeEnd > afterStart) {
    return 'The before-lunch window must end before the after-lunch window starts.';
  }

  return '';
};
