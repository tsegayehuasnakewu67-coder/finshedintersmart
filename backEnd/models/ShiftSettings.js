/**
 * ShiftSettings — singleton document (only one record ever exists).
 * Stores work-hour configuration that drives Present/Late calculation.
 *
 * startHour / startMinute : official start time (local 24-h)
 * gracePeriod             : extra minutes allowed before marking Late
 * endHour / endMinute     : official end / checkout time
 */
const mongoose = require('mongoose');

const shiftSettingsSchema = new mongoose.Schema({
  // We use a fixed key so findOneAndUpdate upserts a single doc
  _key: { type: String, default: 'default', unique: true },

  startHour:   { type: Number, default: 8,  min: 0, max: 23 },  // 08:30 default
  startMinute: { type: Number, default: 30, min: 0, max: 59 },
  gracePeriod: { type: Number, default: 5,  min: 5, max: 20 },  // minutes

  endHour:     { type: Number, default: 17, min: 0, max: 23 },  // 17:00 default
  endMinute:   { type: Number, default: 0,  min: 0, max: 59 },

  // Lunch break
  lunchEnabled:      { type: Boolean, default: false },
  lunchStartHour:    { type: Number, default: 12, min: 0, max: 23 },
  lunchStartMinute:  { type: Number, default: 0,  min: 0, max: 59 },
  lunchDuration:     { type: Number, default: 60, min: 1, max: 180 }, // minutes

  // Attendance windows and employee event notifications
  beforeLunchStartHour:   { type: Number, default: 8, min: 0, max: 23 },
  beforeLunchStartMinute: { type: Number, default: 30, min: 0, max: 59 },
  beforeLunchEndHour:     { type: Number, default: 12, min: 0, max: 23 },
  beforeLunchEndMinute:   { type: Number, default: 0, min: 0, max: 59 },
  afterLunchStartHour:    { type: Number, default: 13, min: 0, max: 23 },
  afterLunchStartMinute:  { type: Number, default: 0, min: 0, max: 59 },
  afterLunchEndHour:      { type: Number, default: 17, min: 0, max: 23 },
  afterLunchEndMinute:    { type: Number, default: 0, min: 0, max: 59 },
  notifyCheckIn:          { type: Boolean, default: true },
  notifyCheckOut:         { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('ShiftSettings', shiftSettingsSchema);
