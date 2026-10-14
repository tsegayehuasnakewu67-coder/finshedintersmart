const { getAddisAbabaDateString, getAddisAbabaMinutes } = require('./ethiopianTime');

const MINUTES_PER_DAY = 24 * 60;

const toMinutes = (hour, minute) => Number(hour) * 60 + Number(minute);

const getShiftBounds = (shift) => {
  const start = toMinutes(shift.startHour, shift.startMinute);
  const end = toMinutes(shift.endHour, shift.endMinute);
  const overnight = end < start;
  const endOffset = end + (overnight ? MINUTES_PER_DAY : 0);
  return { start, end, endOffset, duration: endOffset - start, overnight };
};

const getSessionEndMinutes = (shift) => toMinutes(
  shift.afterLunchEndHour ?? shift.endHour,
  shift.afterLunchEndMinute ?? shift.endMinute,
);

const getShiftElapsedMinutes = (date, shift) => {
  const bounds = getShiftBounds(shift);
  const clockMinutes = getAddisAbabaMinutes(date);
  const sessionEnd = getSessionEndMinutes(shift);
  const overnight = sessionEnd < bounds.start;
  const sessionDuration = sessionEnd + (overnight ? MINUTES_PER_DAY : 0) - bounds.start;
  if (!overnight || clockMinutes >= bounds.start) return clockMinutes - bounds.start;
  if (clockMinutes < sessionEnd) return clockMinutes + MINUTES_PER_DAY - bounds.start;

  const beforeStartWindow = bounds.start - 60;
  if (clockMinutes >= beforeStartWindow && beforeStartWindow >= sessionEnd) {
    return clockMinutes - bounds.start;
  }
  return sessionDuration + clockMinutes - sessionEnd;
};

const getShiftOffset = (hour, minute, shift) => {
  const { start, overnight } = getShiftBounds(shift);
  const clockMinutes = toMinutes(hour, minute);
  return clockMinutes < start && overnight
    ? clockMinutes + MINUTES_PER_DAY - start
    : clockMinutes - start;
};

const getSignedShiftOffset = (hour, minute, shift) => {
  const { start, overnight } = getShiftBounds(shift);
  let offset = toMinutes(hour, minute) - start;
  if (overnight && offset < -MINUTES_PER_DAY / 2) offset += MINUTES_PER_DAY;
  else if (overnight && offset > MINUTES_PER_DAY / 2) offset -= MINUTES_PER_DAY;
  return offset;
};

const getAttendanceDate = (date, shift) => {
  const today = getAddisAbabaDateString(date);
  const bounds = getShiftBounds(shift);
  const sessionEnd = getSessionEndMinutes(shift);
  if (sessionEnd >= bounds.start || getAddisAbabaMinutes(date) >= sessionEnd) return today;

  const previousDay = new Date(`${today}T00:00:00.000Z`);
  previousDay.setUTCDate(previousDay.getUTCDate() - 1);
  return previousDay.toISOString().slice(0, 10);
};

const getGrossDurationMinutes = (shift) => getShiftBounds(shift).duration;

const getNetDurationMinutes = (shift) => Math.max(
  0,
  getGrossDurationMinutes(shift) - (shift.lunchEnabled ? Number(shift.lunchDuration) : 0),
);

const getCompletedWorkMinutes = (record, shift) => {
  const minutesBetween = (start, end) => {
    if (!start || !end) return 0;
    return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  };

  if (!shift.lunchEnabled) {
    return record.checkInTime && record.checkOutTime
      ? minutesBetween(record.checkInTime, record.checkOutTime)
      : null;
  }

  const hasMorningSession = record.checkInTime && record.checkOutTime;
  const hasAfternoonSession = record.afterLunchCheckIn && record.afterLunchCheckOut;
  if (!hasMorningSession && !hasAfternoonSession) return null;
  const morningMinutes = minutesBetween(record.checkInTime, record.checkOutTime);
  const afternoonMinutes = minutesBetween(record.afterLunchCheckIn, record.afterLunchCheckOut);
  return morningMinutes + afternoonMinutes;
};

const calculateAttendanceStatus = (date, shift) => {
  const lateMinutes = Math.max(
    0,
    Math.floor(getShiftElapsedMinutes(date, shift)) - Number(shift.gracePeriod || 0),
  );
  return lateMinutes === 0
    ? { status: 'Present', lateMinutes: 0 }
    : { status: 'Late', lateMinutes };
};

const validateShiftSettings = (shift) => {
  const bounds = getShiftBounds(shift);
  if (bounds.duration <= 0 || bounds.duration >= MINUTES_PER_DAY) {
    return 'Shift start and end times must define a duration between 1 minute and 24 hours.';
  }

  const startOffset = (hour, minute) => getShiftOffset(hour, minute, shift);
  const beforeStart = toMinutes(shift.beforeLunchStartHour, shift.beforeLunchStartMinute) - bounds.start;
  const beforeStartOffset = bounds.overnight && beforeStart < -MINUTES_PER_DAY / 2
    ? beforeStart + MINUTES_PER_DAY
    : beforeStart;
  const beforeEndOffset = startOffset(shift.beforeLunchEndHour, shift.beforeLunchEndMinute);
  const afterStartOffset = startOffset(shift.afterLunchStartHour, shift.afterLunchStartMinute);
  const afterEndOffset = startOffset(shift.afterLunchEndHour, shift.afterLunchEndMinute);

  if (beforeEndOffset <= beforeStartOffset || beforeEndOffset > bounds.duration) {
    return 'The before-lunch window must be ordered and its end must fall within the shift.';
  }
  if (afterEndOffset <= afterStartOffset || afterEndOffset > bounds.duration) {
    return 'The after-lunch window must be ordered and end within the shift.';
  }

  if (shift.lunchEnabled) {
    if (!Number.isInteger(Number(shift.lunchDuration)) || Number(shift.lunchDuration) < 1) {
      return 'Lunch duration must be between 1 and 180 minutes when lunch is enabled.';
    }
    const lunchStartOffset = startOffset(shift.lunchStartHour, shift.lunchStartMinute);
    const lunchEndOffset = lunchStartOffset + Number(shift.lunchDuration);
    if (
      lunchStartOffset < 0
      || lunchStartOffset < beforeEndOffset
      || lunchEndOffset > afterStartOffset
      || lunchEndOffset > bounds.duration
    ) {
      return 'Lunch must start after the before-lunch window and finish before the after-lunch window and shift end.';
    }
  } else if (beforeEndOffset > afterStartOffset) {
    return 'The before-lunch window must end before the after-lunch window starts.';
  }

  return null;
};

module.exports = {
  getShiftBounds,
  getSessionEndMinutes,
  getShiftElapsedMinutes,
  getShiftOffset,
  getSignedShiftOffset,
  getAttendanceDate,
  getGrossDurationMinutes,
  getNetDurationMinutes,
  getCompletedWorkMinutes,
  calculateAttendanceStatus,
  validateShiftSettings,
};
