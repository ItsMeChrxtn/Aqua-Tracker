const GrowthRecord = require('../models/GrowthRecord');
const MortalityRecord = require('../models/MortalityRecord');
const StockingRecord = require('../models/StockingRecord');
const HarvestRecord = require('../models/HarvestRecord');

// High-mortality alert threshold: cumulative mortality as a % of initial stock.
const HIGH_MORTALITY_THRESHOLD_PERCENT = 15;
// "Near harvest" means the latest avg weight is within this fraction of the
// species' recommended minimum harvest weight.
const NEAR_HARVEST_FRACTION = 0.85;

async function sumField(Model, cycleId, field) {
  const rows = await Model.aggregate([
    { $match: { cycle: cycleId } },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return rows.length ? rows[0].total : 0;
}

const getTotalMortality = (cycleId) => sumField(MortalityRecord, cycleId, 'quantity');
const getTotalHarvested = (cycleId) => sumField(HarvestRecord, cycleId, 'actualQuantity');

// Fish stocked into a cycle: the count it started with plus every later
// stocking record.
async function getTotalStocked(cycle) {
  return cycle.initialCount + (await sumField(StockingRecord, cycle._id, 'quantity'));
}

async function getLatestGrowth(cycleId) {
  return GrowthRecord.findOne({ cycle: cycleId }).sort({ date: -1 });
}

function computeReadiness(averageWeight, species) {
  if (!averageWeight || !species) return 'growing';
  if (averageWeight >= species.recommendedHarvestWeightMin) return 'ready_for_harvest';
  if (averageWeight >= species.recommendedHarvestWeightMin * NEAR_HARVEST_FRACTION) return 'near_harvest';
  return 'growing';
}

// Computes the live harvest estimate for a production cycle.
// `cycle` must be populated with `species`.
async function computeHarvestEstimate(cycle) {
  const [totalStocked, totalMortality, totalHarvested] = await Promise.all([
    getTotalStocked(cycle),
    getTotalMortality(cycle._id),
    getTotalHarvested(cycle._id),
  ]);
  const currentCount = Math.max(totalStocked - totalMortality - totalHarvested, 0);
  // Harvested fish survived, so only deaths lower the survival rate.
  const survivalRate = totalStocked > 0 ? (Math.max(totalStocked - totalMortality, 0) / totalStocked) * 100 : 0;

  const latestGrowth = await getLatestGrowth(cycle._id);
  const averageWeight = latestGrowth ? latestGrowth.averageWeight : 0;

  const estimatedHarvestKg = (currentCount * averageWeight) / 1000;
  const readinessStatus = computeReadiness(averageWeight, cycle.species);

  return {
    cycleId: cycle._id,
    fishpondId: cycle.fishpond._id || cycle.fishpond,
    species: cycle.species,
    initialCount: cycle.initialCount,
    totalStocked,
    totalHarvested,
    totalMortality,
    currentCount,
    averageWeight,
    survivalRate: Number(survivalRate.toFixed(2)),
    estimatedHarvestKg: Number(estimatedHarvestKg.toFixed(2)),
    readinessStatus,
    recommendedHarvestWeightMin: cycle.species ? cycle.species.recommendedHarvestWeightMin : null,
    recommendedHarvestWeightMax: cycle.species ? cycle.species.recommendedHarvestWeightMax : null,
    lastGrowthDate: latestGrowth ? latestGrowth.date : null,
    isHighMortality: totalStocked > 0 && (totalMortality / totalStocked) * 100 >= HIGH_MORTALITY_THRESHOLD_PERCENT,
  };
}

module.exports = {
  HIGH_MORTALITY_THRESHOLD_PERCENT,
  NEAR_HARVEST_FRACTION,
  getTotalMortality,
  getTotalHarvested,
  getTotalStocked,
  getLatestGrowth,
  computeReadiness,
  computeHarvestEstimate,
};
