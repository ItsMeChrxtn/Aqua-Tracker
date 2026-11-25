const ProductionCycle = require('../models/ProductionCycle');
const Species = require('../models/Species');
const StockingRecord = require('../models/StockingRecord');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { loadFishpondWithAccess, loadCycleWithAccess } = require('../utils/access');
const { logActivity } = require('../utils/activityLog');
const { computeHarvestEstimate } = require('../utils/calculations');
const { computeCycleAnalytics } = require('../utils/analytics');
const { assertWithinCapacity, getPondFishCount } = require('../utils/capacity');
const { assertNotPastDate, dateOnly } = require('../utils/validation');

// GET /api/fishponds/:fishpondId/cycles?status=&speciesId=
const listCycles = asyncHandler(async (req, res) => {
  const fishpond = await loadFishpondWithAccess(req.user, req.params.fishpondId);

  const filter = { fishpond: fishpond._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.speciesId) filter.species = req.query.speciesId;

  const cycles = await ProductionCycle.find(filter).populate('species').sort({ stockingDate: -1 });
  res.json({ success: true, cycles });
});

const createCycle = asyncHandler(async (req, res) => {
  const fishpond = await loadFishpondWithAccess(req.user, req.params.fishpondId);
  if (fishpond.status !== 'approved') {
    throw new ApiError(400, 'Fishpond must be approved before starting a production cycle');
  }

  // One cycle at a time: the current one has to be harvested first.
  const running = await ProductionCycle.findOne({ fishpond: fishpond._id, status: 'active' });
  if (running) {
    throw new ApiError(400, `${running.batchName || 'The current cycle'} of ${fishpond.name} is still active. Harvest it first before starting a new cycle.`);
  }

  const { speciesId, stockingDate, expectedHarvestDate, initialCount, notes } = req.body;
  if (!speciesId || !stockingDate || !expectedHarvestDate || !initialCount) {
    throw new ApiError(400, 'Species, stocking date, estimated harvest date, and initial count are required');
  }
  assertNotPastDate(stockingDate, 'Stocking date');
  const harvestDay = dateOnly(expectedHarvestDate);
  if (!harvestDay) throw new ApiError(400, 'Estimated harvest date is not a valid date');
  if (harvestDay <= dateOnly(stockingDate)) {
    throw new ApiError(400, 'Estimated harvest date must be after the stocking date');
  }
  const species = await Species.findById(speciesId);
  if (!species) throw new ApiError(404, 'Species not found');

  await assertWithinCapacity(fishpond, initialCount);

  // Cycles are numbered automatically per fishpond: Cycle #1, #2, …
  const existing = await ProductionCycle.find({ fishpond: fishpond._id }).select('cycleNumber batchName');
  let cycleNumber = Math.max(existing.length, ...existing.map((c) => c.cycleNumber || 0)) + 1;
  while (existing.some((c) => (c.batchName || '').toLowerCase() === `cycle #${cycleNumber}`)) cycleNumber += 1;

  const cycle = await ProductionCycle.create({
    fishpond: fishpond._id,
    species: species._id,
    cycleNumber,
    batchName: `Cycle #${cycleNumber}`,
    stockingDate,
    expectedHarvestDate,
    initialCount,
    notes,
  });

  // Batch 1 of the stocking records is the cycle's own initial stock.
  await StockingRecord.create({
    cycle: cycle._id,
    fishpond: fishpond._id,
    date: stockingDate,
    species: species._id,
    batchNumber: 1,
    isInitial: true,
    recordedBy: req.user._id,
  });

  await logActivity(req, { action: 'CREATE', targetType: 'ProductionCycle', targetId: cycle._id, details: `Started Cycle #${cycleNumber} for ${fishpond.name} (${species.name})` });

  res.status(201).json({ success: true, cycle });
});

const getCycle = asyncHandler(async (req, res) => {
  const cycle = await loadCycleWithAccess(req.user, req.params.id);
  const estimate = await computeHarvestEstimate(cycle);
  res.json({ success: true, cycle, estimate });
});

const updateCycle = asyncHandler(async (req, res) => {
  const cycle = await loadCycleWithAccess(req.user, req.params.id);
  const { batchName, notes, status } = req.body;
  if (batchName !== undefined) cycle.batchName = batchName;
  if (notes !== undefined) cycle.notes = notes;
  if (status !== undefined) {
    if (!['active', 'harvested', 'closed'].includes(status)) throw new ApiError(400, 'Invalid status');
    cycle.status = status;
  }
  await cycle.save();
  await logActivity(req, { action: 'UPDATE', targetType: 'ProductionCycle', targetId: cycle._id, doc: cycle, details: 'Updated production cycle' });
  res.json({ success: true, cycle });
});

// GET /api/cycles/:id/analytics — growth rates, FCR, feeding guide, harvest
// projection and the cycle summary
const getCycleAnalytics = asyncHandler(async (req, res) => {
  const cycle = await loadCycleWithAccess(req.user, req.params.id);
  if (!cycle.species?.name) await cycle.populate('species');
  res.json({ success: true, analytics: await computeCycleAnalytics(cycle) });
});

// GET /api/fishponds/:fishpondId/capacity — how many more fish fit
const getCapacity = asyncHandler(async (req, res) => {
  const fishpond = await loadFishpondWithAccess(req.user, req.params.fishpondId);
  const current = await getPondFishCount(fishpond._id);
  res.json({
    success: true,
    capacity: fishpond.capacity || null,
    current,
    available: fishpond.capacity ? Math.max(fishpond.capacity - current, 0) : null,
  });
});

module.exports = { listCycles, createCycle, getCycle, updateCycle, getCapacity, getCycleAnalytics };
