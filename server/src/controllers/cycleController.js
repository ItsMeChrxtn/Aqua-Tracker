const ProductionCycle = require('../models/ProductionCycle');
const Species = require('../models/Species');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { loadFishpondWithAccess, loadCycleWithAccess } = require('../utils/access');
const { logActivity } = require('../utils/activityLog');
const { computeHarvestEstimate } = require('../utils/calculations');

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

  const { speciesId, batchName, stockingDate, initialCount, notes } = req.body;
  if (!speciesId || !stockingDate || !initialCount) {
    throw new ApiError(400, 'Species, stocking date, and initial count are required');
  }
  const species = await Species.findById(speciesId);
  if (!species) throw new ApiError(404, 'Species not found');

  const cycle = await ProductionCycle.create({
    fishpond: fishpond._id,
    species: species._id,
    batchName,
    stockingDate,
    initialCount,
    notes,
  });

  await logActivity(req, { action: 'CREATE', targetType: 'ProductionCycle', targetId: cycle._id, details: `Started cycle for ${fishpond.name} (${species.name})` });

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
  await logActivity(req, { action: 'UPDATE', targetType: 'ProductionCycle', targetId: cycle._id, details: 'Updated production cycle' });
  res.json({ success: true, cycle });
});

module.exports = { listCycles, createCycle, getCycle, updateCycle };
