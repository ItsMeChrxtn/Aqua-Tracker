const Fishpond = require('../models/Fishpond');
const ProductionCycle = require('../models/ProductionCycle');
const HarvestRecord = require('../models/HarvestRecord');
const SalesRecord = require('../models/SalesRecord');
const ActivityLog = require('../models/ActivityLog');
const GrowthRecord = require('../models/GrowthRecord');
const User = require('../models/User');
const Species = require('../models/Species');
const asyncHandler = require('../utils/asyncHandler');
const { computeHarvestEstimate, HIGH_MORTALITY_THRESHOLD_PERCENT } = require('../utils/calculations');

// GET /api/reports/owner-summary — dashboard data for a fishpond owner
const ownerSummary = asyncHandler(async (req, res) => {
  const fishponds = await Fishpond.find({ owner: req.user._id });
  const fishpondIds = fishponds.map((f) => f._id);

  const activeCycles = await ProductionCycle.find({ fishpond: { $in: fishpondIds }, status: 'active' })
    .populate('species')
    .populate('fishpond');

  let totalStocked = 0;
  let totalMortality = 0;
  let totalCurrent = 0;
  let totalEstimatedHarvestKg = 0;
  const productionSummary = [];

  for (const cycle of activeCycles) {
    const estimate = await computeHarvestEstimate(cycle);
    totalStocked += cycle.initialCount;
    totalMortality += estimate.totalMortality;
    totalCurrent += estimate.currentCount;
    totalEstimatedHarvestKg += estimate.estimatedHarvestKg;
    productionSummary.push({
      cycleId: cycle._id,
      fishpondId: cycle.fishpond._id,
      fishpondName: cycle.fishpond.name,
      species: cycle.species ? cycle.species.name : 'Unknown species',
      stocked: cycle.initialCount,
      remaining: estimate.currentCount,
      survivalRate: estimate.survivalRate,
      estimatedHarvestKg: estimate.estimatedHarvestKg,
      readinessStatus: estimate.readinessStatus,
    });
  }

  // Growth trend preview: combined weight samples across the owner's active cycles
  const growthRecords = await GrowthRecord.find({ cycle: { $in: activeCycles.map((c) => c._id) } })
    .sort({ date: 1 })
    .limit(200);

  const recentActivity = await ActivityLog.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(10);

  const salesAgg = await SalesRecord.aggregate([
    { $match: { fishpond: { $in: fishpondIds } } },
    { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalQuantityKg: { $sum: '$quantityKg' } } },
  ]);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const salesThisMonthAgg = await SalesRecord.aggregate([
    { $match: { fishpond: { $in: fishpondIds }, date: { $gte: startOfMonth } } },
    { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
  ]);

  res.json({
    success: true,
    summary: {
      totalFishponds: fishponds.length,
      pendingFishponds: fishponds.filter((f) => f.status === 'pending').length,
      totalStocked,
      totalMortality,
      totalCurrent,
      totalEstimatedHarvestKg: Number(totalEstimatedHarvestKg.toFixed(2)),
      activeCyclesCount: activeCycles.length,
      totalSalesRevenue: salesAgg.length ? Number(salesAgg[0].totalRevenue.toFixed(2)) : 0,
      totalSalesQuantityKg: salesAgg.length ? Number(salesAgg[0].totalQuantityKg.toFixed(2)) : 0,
      salesRevenueThisMonth: salesThisMonthAgg.length ? Number(salesThisMonthAgg[0].totalRevenue.toFixed(2)) : 0,
    },
    productionSummary,
    growthRecords,
    recentActivity,
  });
});

// GET /api/reports/municipal-summary?barangay= — dashboard data for agriculture office
const municipalSummary = asyncHandler(async (req, res) => {
  const fishpondFilter = { status: 'approved' };
  if (req.query.barangay) fishpondFilter.barangay = req.query.barangay;

  const fishponds = await Fishpond.find(fishpondFilter);
  const fishpondIds = fishponds.map((f) => f._id);

  const cycleFilter = { fishpond: { $in: fishpondIds }, status: 'active' };
  if (req.query.speciesId) cycleFilter.species = req.query.speciesId;

  const activeCycles = await ProductionCycle.find(cycleFilter)
    .populate('species')
    .populate({ path: 'fishpond', populate: { path: 'owner', select: 'name' } });

  let totalEstimatedHarvestKg = 0;
  const allCycles = [];
  const highMortality = [];
  const nearHarvest = [];
  const speciesProductionMap = {};

  for (const cycle of activeCycles) {
    if (!cycle.fishpond) continue;
    const estimate = await computeHarvestEstimate(cycle);
    totalEstimatedHarvestKg += estimate.estimatedHarvestKg;

    const mortalityPercent = cycle.initialCount > 0 ? (estimate.totalMortality / cycle.initialCount) * 100 : 0;
    const row = {
      cycleId: cycle._id,
      fishpondId: cycle.fishpond._id,
      fishpondName: cycle.fishpond.name,
      owner: cycle.fishpond.owner ? cycle.fishpond.owner.name : 'Unknown',
      species: cycle.species ? cycle.species.name : 'Unknown species',
      speciesId: cycle.species ? cycle.species._id : null,
      barangay: cycle.fishpond.barangay,
      batchName: cycle.batchName,
      stockingDate: cycle.stockingDate,
      initialCount: cycle.initialCount,
      currentCount: estimate.currentCount,
      totalMortality: estimate.totalMortality,
      mortalityPercent: Number(mortalityPercent.toFixed(1)),
      averageWeight: estimate.averageWeight,
      survivalRate: estimate.survivalRate,
      estimatedHarvestKg: estimate.estimatedHarvestKg,
      readinessStatus: estimate.readinessStatus,
      lastUpdate: cycle.updatedAt,
    };

    allCycles.push(row);
    if (estimate.isHighMortality) highMortality.push(row);
    if (['near_harvest', 'ready_for_harvest'].includes(estimate.readinessStatus)) nearHarvest.push(row);

    const speciesName = cycle.species ? cycle.species.name : 'Unknown species';
    speciesProductionMap[speciesName] = (speciesProductionMap[speciesName] || 0) + estimate.estimatedHarvestKg;
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthHarvests = await HarvestRecord.find({ fishpond: { $in: fishpondIds }, date: { $gte: startOfMonth } });
  const totalProductionThisMonth = monthHarvests.reduce((sum, h) => sum + h.actualWeightKg, 0);

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const harvestPerMonth = await HarvestRecord.aggregate([
    { $match: { fishpond: { $in: fishpondIds }, date: { $gte: twelveMonthsAgo } } },
    { $group: { _id: { y: { $year: '$date' }, m: { $month: '$date' } }, totalKg: { $sum: '$actualWeightKg' } } },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
  ]);

  const salesThisMonthAgg = await SalesRecord.aggregate([
    { $match: { fishpond: { $in: fishpondIds }, date: { $gte: startOfMonth } } },
    { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
  ]);

  res.json({
    success: true,
    summary: {
      totalRegisteredFishponds: fishponds.length,
      totalProductionThisMonth: Number(totalProductionThisMonth.toFixed(2)),
      estimatedHarvestThisMonth: Number(totalEstimatedHarvestKg.toFixed(2)),
      fishpondsHighMortalityCount: highMortality.length,
      fishpondsNearHarvestCount: nearHarvest.length,
      activeCyclesCount: activeCycles.length,
      salesRevenueThisMonth: salesThisMonthAgg.length ? Number(salesThisMonthAgg[0].totalRevenue.toFixed(2)) : 0,
    },
    allCycles,
    highMortality,
    nearHarvest,
    harvestPerMonth: harvestPerMonth.map((r) => ({ year: r._id.y, month: r._id.m, totalKg: Number(r.totalKg.toFixed(2)) })),
    productionBySpecies: Object.entries(speciesProductionMap).map(([species, kg]) => ({ species, estimatedHarvestKg: Number(kg.toFixed(2)) })),
  });
});

// GET /api/reports/admin-summary — system-wide dashboard data for administrators
const adminSummary = asyncHandler(async (req, res) => {
  const [userCountsAgg, fishpondCountsAgg, speciesCount] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Fishpond.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Species.countDocuments(),
  ]);
  const userCounts = { fishpond_owner: 0, agriculture_staff: 0, admin: 0 };
  userCountsAgg.forEach((r) => { userCounts[r._id] = r.count; });
  const fishpondCounts = { pending: 0, approved: 0, rejected: 0 };
  fishpondCountsAgg.forEach((r) => { fishpondCounts[r._id] = r.count; });

  const approvedFishponds = await Fishpond.find({ status: 'approved' });
  const approvedFishpondIds = approvedFishponds.map((f) => f._id);

  const activeCycles = await ProductionCycle.find({ fishpond: { $in: approvedFishpondIds }, status: 'active' })
    .populate('species')
    .populate('fishpond');

  let totalEstimatedHarvestKg = 0;
  const speciesProductionMap = {};
  for (const cycle of activeCycles) {
    if (!cycle.fishpond) continue;
    const estimate = await computeHarvestEstimate(cycle);
    totalEstimatedHarvestKg += estimate.estimatedHarvestKg;
    const speciesName = cycle.species ? cycle.species.name : 'Unknown species';
    speciesProductionMap[speciesName] = (speciesProductionMap[speciesName] || 0) + estimate.estimatedHarvestKg;
  }

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const harvestPerMonth = await HarvestRecord.aggregate([
    { $match: { date: { $gte: twelveMonthsAgo } } },
    { $group: { _id: { y: { $year: '$date' }, m: { $month: '$date' } }, totalKg: { $sum: '$actualWeightKg' } } },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
  ]);

  const salesAgg = await SalesRecord.aggregate([
    { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
  ]);

  const recentActivity = await ActivityLog.find().populate('user', 'name role').sort({ createdAt: -1 }).limit(12);

  res.json({
    success: true,
    summary: {
      totalUsers: Object.values(userCounts).reduce((a, b) => a + b, 0),
      totalFishponds: Object.values(fishpondCounts).reduce((a, b) => a + b, 0),
      pendingApprovalsCount: fishpondCounts.pending,
      speciesCount,
      activeCyclesCount: activeCycles.length,
      totalEstimatedHarvestKg: Number(totalEstimatedHarvestKg.toFixed(2)),
      totalSalesRevenue: salesAgg.length ? Number(salesAgg[0].totalRevenue.toFixed(2)) : 0,
    },
    userCounts,
    fishpondCounts,
    harvestPerMonth: harvestPerMonth.map((r) => ({ year: r._id.y, month: r._id.m, totalKg: Number(r.totalKg.toFixed(2)) })),
    productionBySpecies: Object.entries(speciesProductionMap).map(([species, kg]) => ({ species, estimatedHarvestKg: Number(kg.toFixed(2)) })),
    recentActivity,
  });
});

module.exports = { ownerSummary, municipalSummary, adminSummary, HIGH_MORTALITY_THRESHOLD_PERCENT };
