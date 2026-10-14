const test = require('node:test');
const assert = require('node:assert/strict');
const ShiftSettings = require('../models/ShiftSettings');
const { getSettings, updateSettings } = require('../controllers/shiftController');

const settingsPayload = {
  startHour: 11,
  startMinute: 19,
  gracePeriod: 5,
  endHour: 17,
  endMinute: 0,
  lunchEnabled: false,
  lunchStartHour: 12,
  lunchStartMinute: 0,
  lunchDuration: 60,
  beforeLunchStartHour: 11,
  beforeLunchStartMinute: 19,
  beforeLunchEndHour: 12,
  beforeLunchEndMinute: 0,
  afterLunchStartHour: 13,
  afterLunchStartMinute: 0,
  afterLunchEndHour: 17,
  afterLunchEndMinute: 0,
  notifyCheckIn: true,
  notifyCheckOut: true,
};

const responseRecorder = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('shift settings update returns saved values and GET reloads them', async () => {
  const originalFindOne = ShiftSettings.findOne;
  const originalFindOneAndUpdate = ShiftSettings.findOneAndUpdate;
  let stored;
  ShiftSettings.findOneAndUpdate = async (_query, values) => {
    stored = { _key: 'default', ...values };
    return stored;
  };
  ShiftSettings.findOne = async () => stored;

  try {
    const saveResponse = responseRecorder();
    await updateSettings({ body: settingsPayload }, saveResponse);
    assert.equal(saveResponse.statusCode, 200);
    assert.equal(saveResponse.body.data.startHour, 11);
    assert.equal(saveResponse.body.data.startMinute, 19);

    const reloadResponse = responseRecorder();
    await getSettings({}, reloadResponse);
    assert.equal(reloadResponse.body.data.startHour, 11);
    assert.equal(reloadResponse.body.data.gracePeriod, 5);
    assert.equal(reloadResponse.body.data.beforeLunchStartHour, 11);
  } finally {
    ShiftSettings.findOne = originalFindOne;
    ShiftSettings.findOneAndUpdate = originalFindOneAndUpdate;
  }
});
