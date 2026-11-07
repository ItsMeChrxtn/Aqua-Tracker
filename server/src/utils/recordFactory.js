const asyncHandler = require('./asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const ProductionCycle = require('../models/ProductionCycle');
const { loadCycleWithAccess, loadFishpondWithAccess } = require('./access');
const { logActivity } = require('./activityLog');

function buildDateFilter(query) {
  if (!query.from && !query.to) return undefined;
  const range = {};
  if (query.from) range.$gte = new Date(query.from);
  if (query.to) range.$lte = new Date(query.to);
  return range;
}

/**
 * Builds list/create/remove handlers shared by StockingRecord, GrowthRecord,
 * MortalityRecord, and FeedingRecord — the four monitoring-record types.
 *
 * - listByCycle: records for one production cycle (a single species/batch)
 * - listByFishpond: records across ALL of a fishpond's cycles (past + current
 *   batches), optionally narrowed by speciesId — this is what the monitoring
 *   charts use so history and species filtering work as requested.
 * - create: always cycle-scoped (a new reading belongs to the active batch)
 */
function createRecordHandlers(Model, { targetType, pickFields, onCreated }) {
  const listByCycle = asyncHandler(async (req, res) => {
    const cycle = await loadCycleWithAccess(req.user, req.params.cycleId);
    const filter = { cycle: cycle._id };
    const dateFilter = buildDateFilter(req.query);
    if (dateFilter) filter.date = dateFilter;

    const records = await Model.find(filter).sort({ date: 1 });
    res.json({ success: true, records, cycle });
  });

  const listByFishpond = asyncHandler(async (req, res) => {
    const fishpond = await loadFishpondWithAccess(req.user, req.params.fishpondId);

    const cycleFilter = { fishpond: fishpond._id };
    if (req.query.speciesId) cycleFilter.species = req.query.speciesId;
    const cycles = await ProductionCycle.find(cycleFilter).populate('species').select('_id species batchName stockingDate status');

    const filter = { cycle: { $in: cycles.map((c) => c._id) } };
    const dateFilter = buildDateFilter(req.query);
    if (dateFilter) filter.date = dateFilter;

    const records = await Model.find(filter).sort({ date: 1 }).populate({
      path: 'cycle',
      select: 'batchName species stockingDate',
      populate: { path: 'species', select: 'name waterType' },
    });

    res.json({ success: true, records, cycles });
  });

  const create = asyncHandler(async (req, res) => {
    const cycle = await loadCycleWithAccess(req.user, req.params.cycleId);
    const data = pickFields(req.body);

    const record = await Model.create({
      cycle: cycle._id,
      fishpond: cycle.fishpond._id,
      recordedBy: req.user._id,
      ...data,
    });

    await logActivity(req, { action: 'CREATE', targetType, targetId: record._id, details: `Added ${targetType} record for ${cycle.fishpond.name}` });

    if (onCreated) await onCreated({ record, cycle, req });

    res.status(201).json({ success: true, record });
  });

  const remove = asyncHandler(async (req, res) => {
    const record = await Model.findById(req.params.id);
    if (!record) throw new ApiError(404, 'Record not found');
    await loadCycleWithAccess(req.user, record.cycle);

    await record.deleteOne();
    await logActivity(req, { action: 'DELETE', targetType, targetId: req.params.id, details: `Deleted ${targetType} record` });

    res.json({ success: true, message: 'Record deleted' });
  });

  return { listByCycle, listByFishpond, create, remove };
}

module.exports = { createRecordHandlers };
