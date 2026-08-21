const GrowthRecord = require('../models/GrowthRecord');
const HarvestEstimateLog = require('../models/HarvestEstimateLog');
const { createRecordHandlers } = require('../utils/recordFactory');
const { ApiError } = require('../middleware/errorHandler');
const { computeHarvestEstimate } = require('../utils/calculations');
const { createNotification } = require('../utils/notify');

const pickFields = (body) => {
  const { date, sampleSize, averageWeight, averageLength, notes } = body;
  if (!date || !sampleSize || averageWeight === undefined) {
    throw new ApiError(400, 'Date, sample size, and average weight are required');
  }
  return { date, sampleSize, averageWeight, averageLength, notes };
};

// After logging a new weight sample, recompute the harvest estimate, snapshot
// it to the history log, and notify the owner the first time the cycle
// crosses into "near harvest" / "ready for harvest".
const onCreated = async ({ record, cycle }) => {
  const previous = await HarvestEstimateLog.findOne({ cycle: cycle._id }).sort({ date: -1 });
  const estimate = await computeHarvestEstimate(cycle);

  await HarvestEstimateLog.create({
    cycle: cycle._id,
    fishpond: cycle.fishpond._id,
    date: record.date,
    currentCount: estimate.currentCount,
    averageWeight: estimate.averageWeight,
    survivalRate: estimate.survivalRate,
    estimatedHarvestKg: estimate.estimatedHarvestKg,
    readinessStatus: estimate.readinessStatus,
  });

  const statusChanged = !previous || previous.readinessStatus !== estimate.readinessStatus;
  if (statusChanged && ['near_harvest', 'ready_for_harvest'].includes(estimate.readinessStatus)) {
    const label = estimate.readinessStatus === 'ready_for_harvest' ? 'ready for harvest' : 'nearing harvest weight';
    await createNotification({
      user: cycle.fishpond.owner,
      fishpond: cycle.fishpond._id,
      type: 'near_harvest',
      message: `${cycle.fishpond.name} (${cycle.species.name}) is ${label} — estimated ${estimate.estimatedHarvestKg} kg.`,
    });
  }
};

module.exports = createRecordHandlers(GrowthRecord, { targetType: 'GrowthRecord', pickFields, onCreated });
