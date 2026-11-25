const WaterQualityRecord = require('../models/WaterQualityRecord');
const { createRecordHandlers } = require('../utils/recordFactory');
const { ApiError } = require('../middleware/errorHandler');
const { createNotification } = require('../utils/notify');
const { assertNotPastDate } = require('../utils/validation');
const { waterQualityIssues } = require('../utils/waterQuality');

const READINGS = ['temperature', 'ph', 'dissolvedOxygen', 'salinity', 'ammonia'];

const pickFields = (body) => {
  if (!body.date) throw new ApiError(400, 'Date is required');
  assertNotPastDate(body.date, 'Reading date');
  const data = { date: body.date, notes: body.notes };
  READINGS.forEach((key) => {
    if (body[key] === undefined || body[key] === '' || body[key] === null) return;
    const n = Number(body[key]);
    if (!Number.isFinite(n) || n < 0) throw new ApiError(400, `${key} must be a number of 0 or more`);
    data[key] = n;
  });
  if (!READINGS.some((key) => data[key] !== undefined)) throw new ApiError(400, 'Enter at least one reading');
  return data;
};

// Flags readings outside the safe range for this species' water type.
const prepare = async ({ data, cycle }) => ({ ...data, issues: waterQualityIssues(data, cycle.species?.waterType) });

// Warns the owner right away when a reading is out of range.
const onCreated = async ({ record, cycle }) => {
  if (!record.issues.length) return;
  await createNotification({
    user: cycle.fishpond.owner,
    fishpond: cycle.fishpond._id,
    type: 'water_quality',
    message: `Water quality alert at ${cycle.fishpond.name}: ${record.issues.join(', ')}. Check aeration and water exchange.`,
  });
};

module.exports = createRecordHandlers(WaterQualityRecord, { targetType: 'WaterQualityRecord', pickFields, prepare, onCreated });
