const HarvestEstimateLog = require('../models/HarvestEstimateLog');
const HarvestRecord = require('../models/HarvestRecord');
const ProductionCycle = require('../models/ProductionCycle');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { loadCycleWithAccess, loadFishpondWithAccess } = require('../utils/access');
const { logActivity } = require('../utils/activityLog');
const { computeHarvestEstimate } = require('../utils/calculations');
const { createNotification } = require('../utils/notify');

// GET /api/cycles/:cycleId/harvest-estimate — live computed estimate
const getEstimate = asyncHandler(async (req, res) => {
  const cycle = await loadCycleWithAccess(req.user, req.params.cycleId);
  const estimate = await computeHarvestEstimate(cycle);
  res.json({ success: true, estimate });
});

// GET /api/fishponds/:fishpondId/harvest-history?speciesId= — snapshot log, newest first
const getHistory = asyncHandler(async (req, res) => {
  const fishpond = await loadFishpondWithAccess(req.user, req.params.fishpondId);

  const filter = { fishpond: fishpond._id };
  if (req.query.speciesId) {
    const cycles = await ProductionCycle.find({ fishpond: fishpond._id, species: req.query.speciesId }).select('_id');
    filter.cycle = { $in: cycles.map((c) => c._id) };
  }

  const logs = await HarvestEstimateLog.find(filter)
    .populate({ path: 'cycle', select: 'batchName species', populate: { path: 'species', select: 'name' } })
    .sort({ date: -1 });
  res.json({ success: true, logs });
});

// POST /api/cycles/:cycleId/harvest — log the actual harvest, closes the cycle
const logHarvest = asyncHandler(async (req, res) => {
  const cycle = await loadCycleWithAccess(req.user, req.params.cycleId);
  if (cycle.status !== 'active') throw new ApiError(400, 'Only active cycles can be harvested');

  const { date, actualQuantity, actualWeightKg, notes } = req.body;
  if (!date || actualQuantity === undefined || actualWeightKg === undefined) {
    throw new ApiError(400, 'Date, actual quantity, and actual weight (kg) are required');
  }

  const harvest = await HarvestRecord.create({
    cycle: cycle._id,
    fishpond: cycle.fishpond._id,
    date,
    actualQuantity,
    actualWeightKg,
    notes,
    recordedBy: req.user._id,
  });

  cycle.status = 'harvested';
  await cycle.save();

  await createNotification({
    user: cycle.fishpond.owner,
    fishpond: cycle.fishpond._id,
    type: 'general',
    message: `Harvest logged for ${cycle.fishpond.name}: ${actualQuantity} fish, ${actualWeightKg} kg total.`,
  });
  await logActivity(req, { action: 'CREATE', targetType: 'HarvestRecord', targetId: harvest._id, details: `Logged harvest for ${cycle.fishpond.name}` });

  res.status(201).json({ success: true, harvest, cycle });
});

module.exports = { getEstimate, getHistory, logHarvest };
