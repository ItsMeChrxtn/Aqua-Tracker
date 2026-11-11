const MortalityRecord = require('../models/MortalityRecord');
const { createRecordHandlers } = require('../utils/recordFactory');
const { ApiError } = require('../middleware/errorHandler');
const { getTotalMortality, getTotalStocked, HIGH_MORTALITY_THRESHOLD_PERCENT } = require('../utils/calculations');
const { createNotification } = require('../utils/notify');

const pickFields = (body) => {
  const { date, quantity, cause, notes } = body;
  if (!date || !quantity) throw new ApiError(400, 'Date and quantity are required');
  return { date, quantity, cause, notes };
};

// After logging mortality, check whether cumulative losses crossed the
// high-mortality alert threshold and notify the owner if so.
const onCreated = async ({ cycle, req }) => {
  const totalMortality = await getTotalMortality(cycle._id);
  const totalStocked = await getTotalStocked(cycle);
  const mortalityPercent = totalStocked > 0 ? (totalMortality / totalStocked) * 100 : 0;

  const previousTotal = totalMortality - req.body.quantity;
  const previousPercent = totalStocked > 0 ? (previousTotal / totalStocked) * 100 : 0;

  const justCrossedThreshold = previousPercent < HIGH_MORTALITY_THRESHOLD_PERCENT && mortalityPercent >= HIGH_MORTALITY_THRESHOLD_PERCENT;
  if (justCrossedThreshold) {
    await createNotification({
      user: cycle.fishpond.owner,
      fishpond: cycle.fishpond._id,
      type: 'high_mortality',
      message: `High mortality alert: ${cycle.fishpond.name} (${cycle.species ? cycle.species.name : 'Unknown species'}) has lost ${mortalityPercent.toFixed(1)}% of stock.`,
    });
  }
};

module.exports = createRecordHandlers(MortalityRecord, { targetType: 'MortalityRecord', pickFields, onCreated });
