// "What needs my attention?" — simple rules over the owner's records that turn
// the raw numbers into reminders and warnings on the dashboard.
const Fishpond = require('../models/Fishpond');
const ProductionCycle = require('../models/ProductionCycle');
const MortalityRecord = require('../models/MortalityRecord');
const FeedingRecord = require('../models/FeedingRecord');
const GrowthRecord = require('../models/GrowthRecord');
const WaterQualityRecord = require('../models/WaterQualityRecord');
const InventoryItem = require('../models/InventoryItem');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const { computeCycleAnalytics } = require('../utils/analytics');

const DAY_MS = 24 * 60 * 60 * 1000;
const daysSince = (date, now) => (date ? Math.floor((now - new Date(date)) / DAY_MS) : null);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

// Thresholds used by the rules below.
const RULES = {
  RECENT_MORTALITY_DAYS: 7,
  RECENT_MORTALITY_PERCENT: 5, // of the fish in the pond
  GROWTH_SAMPLING_EVERY_DAYS: 14,
  FEEDING_GAP_DAYS: 3,
  HARVEST_SOON_DAYS: 7,
  HIGH_FCR: 2,
  WATER_ALERT_DAYS: 3,
};

// Pure rule set for one active cycle; `ctx` holds everything already loaded.
// Returns [{ level: 'danger'|'warning'|'info'|'success', title, message, link }].
function cycleInsights(ctx) {
  const { label, analytics, recentMortality, lastGrowthDate, lastFeedingDate, recentWaterIssues, expectedHarvestDate, stockingDate, now } = ctx;
  const { estimate, projection, feeding } = analytics;
  const out = [];
  const age = daysSince(stockingDate, now);

  const pondBefore = estimate.currentCount + recentMortality;
  const recentPct = pondBefore > 0 ? (recentMortality / pondBefore) * 100 : 0;
  if (recentPct >= RULES.RECENT_MORTALITY_PERCENT) {
    out.push({
      level: 'danger',
      title: `High mortality in ${label}`,
      message: `${recentMortality.toLocaleString('en-PH')} fish (${recentPct.toFixed(1)}%) died in the last ${RULES.RECENT_MORTALITY_DAYS} days. Check water quality, feeding and signs of disease.`,
      link: '/owner/monitoring/survival',
    });
  }

  if (recentWaterIssues.length) {
    out.push({ level: 'danger', title: `Water quality problem in ${label}`, message: `${recentWaterIssues.join(', ')}. Aerate or exchange water soon.`, link: '/owner/monitoring/water-quality' });
  }

  if (estimate.readinessStatus === 'ready_for_harvest') {
    out.push({ level: 'success', title: `${label} is ready for harvest`, message: `Average weight ${estimate.averageWeight} g reached the recommended ${estimate.recommendedHarvestWeightMin} g. About ${estimate.estimatedHarvestKg} kg can be harvested.`, link: '/owner/harvest-estimation' });
  } else if (expectedHarvestDate) {
    const left = -daysSince(expectedHarvestDate, now);
    if (left < 0) {
      out.push({ level: 'warning', title: `${label} is past its planned harvest date`, message: `Planned for ${fmtDate(expectedHarvestDate)}, but the fish have not reached harvest weight yet.`, link: '/owner/harvest-estimation' });
    } else if (left <= RULES.HARVEST_SOON_DAYS) {
      out.push({ level: 'info', title: `Harvest of ${label} is in ${left} day${left === 1 ? '' : 's'}`, message: 'Prepare buyers, containers and labor. You can post the fish in Product Management.', link: '/owner/products' });
    }
  }

  if (projection?.available && projection.onTrack === false) {
    out.push({
      level: 'warning',
      title: `${label} may miss its harvest weight`,
      message: `At the current growth (${projection.gramsPerDay} g/day) the fish will weigh about ${projection.weightAtExpectedDate} g on ${fmtDate(projection.expectedHarvestDate)} — below ${projection.targetWeight} g. Expected to reach it on ${fmtDate(projection.projectedHarvestDate)}.`,
      link: '/owner/harvest-estimation',
    });
  }

  const sinceGrowth = daysSince(lastGrowthDate || stockingDate, now);
  if (age >= RULES.GROWTH_SAMPLING_EVERY_DAYS && sinceGrowth >= RULES.GROWTH_SAMPLING_EVERY_DAYS) {
    out.push({ level: 'info', title: `Time to sample ${label}`, message: `No fish weighing in ${sinceGrowth} days. Weigh a sample so the harvest estimate stays accurate.`, link: '/owner/monitoring/survival?add=growth' });
  }

  const sinceFeeding = daysSince(lastFeedingDate || stockingDate, now);
  if (age >= RULES.FEEDING_GAP_DAYS && sinceFeeding >= RULES.FEEDING_GAP_DAYS) {
    out.push({ level: 'warning', title: `No feeding recorded for ${label}`, message: `Last feeding record was ${lastFeedingDate ? `${sinceFeeding} days ago` : 'never'}.${feeding.guide ? ` Suggested today: ${feeding.guide.dailyFeedKg} kg.` : ''}`, link: '/owner/monitoring/feeding' });
  }

  if (feeding.fcr && feeding.fcr > RULES.HIGH_FCR) {
    out.push({ level: 'warning', title: `High feed use in ${label}`, message: `FCR is ${feeding.fcr} (kg of feed per kg of fish gained). Above ${RULES.HIGH_FCR} usually means overfeeding or wasted feed — follow the feeding guide.`, link: '/owner/monitoring/feeding' });
  }
  return out;
}

const LEVEL_ORDER = { danger: 0, warning: 1, info: 2, success: 3 };

// GET /api/reports/owner-insights
const ownerInsights = asyncHandler(async (req, res) => {
  const now = new Date();
  const fishponds = await Fishpond.find({ owner: req.user._id, status: 'approved' }).select('_id name');
  const pondIds = fishponds.map((f) => f._id);
  const cycles = await ProductionCycle.find({ fishpond: { $in: pondIds }, status: 'active' }).populate('species').populate('fishpond', 'name owner');

  const since = (days) => new Date(now.getTime() - days * DAY_MS);
  const insights = [];
  for (const cycle of cycles) {
    const [analytics, mortalityAgg, lastGrowth, lastFeeding, water] = await Promise.all([
      computeCycleAnalytics(cycle, now),
      MortalityRecord.aggregate([{ $match: { cycle: cycle._id, date: { $gte: since(RULES.RECENT_MORTALITY_DAYS) } } }, { $group: { _id: null, n: { $sum: '$quantity' } } }]),
      GrowthRecord.findOne({ cycle: cycle._id }).sort({ date: -1 }).select('date'),
      FeedingRecord.findOne({ cycle: cycle._id }).sort({ date: -1 }).select('date'),
      WaterQualityRecord.findOne({ cycle: cycle._id, date: { $gte: since(RULES.WATER_ALERT_DAYS) } }).sort({ date: -1, createdAt: -1 }).select('issues'),
    ]);
    insights.push(
      ...cycleInsights({
        label: `${cycle.fishpond.name} (${cycle.batchName || cycle.species?.name})`,
        analytics,
        recentMortality: mortalityAgg[0]?.n || 0,
        lastGrowthDate: lastGrowth?.date,
        lastFeedingDate: lastFeeding?.date,
        recentWaterIssues: water?.issues || [],
        expectedHarvestDate: cycle.expectedHarvestDate,
        stockingDate: cycle.stockingDate,
        now,
      })
    );
  }

  const lowStock = await InventoryItem.find({ fishpond: { $in: pondIds }, $expr: { $lte: ['$currentStock', '$reorderLevel'] } }).populate('fishpond', 'name');
  lowStock.forEach((item) =>
    insights.push({ level: 'warning', title: `Low stock: ${item.name}`, message: `${item.fishpond?.name} has ${item.currentStock} ${item.unit || ''} left (reorder at ${item.reorderLevel}).`, link: '/owner/inventory' })
  );

  const pendingOrders = await Order.countDocuments({ owner: req.user._id, status: 'pending' });
  if (pendingOrders) {
    insights.push({ level: 'info', title: `${pendingOrders} new order${pendingOrders === 1 ? '' : 's'} waiting`, message: 'Buyers are waiting for you to accept or decline.', link: '/owner/orders' });
  }

  if (fishponds.length && !cycles.length) {
    insights.push({ level: 'info', title: 'No active production cycle', message: 'Start a new cycle on one of your fishponds to begin monitoring.', link: '/owner/fishponds' });
  }

  insights.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
  res.json({ success: true, insights });
});

// GET /api/reports/staff-insights — fishponds the Agriculture Office should follow up
const staffInsights = asyncHandler(async (req, res) => {
  const now = new Date();
  const cycles = await ProductionCycle.find({ status: 'active' }).populate('species').populate({ path: 'fishpond', select: 'name barangay owner status', populate: { path: 'owner', select: 'name phone' } });
  const rows = [];
  for (const cycle of cycles) {
    if (!cycle.fishpond || cycle.fishpond.status !== 'approved') continue;
    const analytics = await computeCycleAnalytics(cycle, now);
    const latest = await Promise.all(
      [GrowthRecord, FeedingRecord, MortalityRecord].map((Model) => Model.findOne({ cycle: cycle._id }).sort({ date: -1 }).select('date'))
    );
    const lastRecord = latest.filter(Boolean).map((r) => r.date).sort((a, b) => b - a)[0];
    const reasons = [];
    const idle = daysSince(lastRecord || cycle.stockingDate, now);
    if (idle >= RULES.GROWTH_SAMPLING_EVERY_DAYS) reasons.push(`No records in ${idle} days`);
    if (analytics.estimate.isHighMortality) reasons.push(`High mortality (${(100 - analytics.estimate.survivalRate).toFixed(1)}% lost)`);
    if (analytics.projection?.available && analytics.projection.onTrack === false) reasons.push('Growth behind schedule');
    if (analytics.estimate.readinessStatus === 'ready_for_harvest') reasons.push('Ready for harvest');
    if (!reasons.length) continue;
    rows.push({
      cycleId: cycle._id,
      fishpondName: cycle.fishpond.name,
      barangay: cycle.fishpond.barangay,
      owner: cycle.fishpond.owner?.name,
      ownerPhone: cycle.fishpond.owner?.phone,
      cycle: cycle.batchName,
      species: cycle.species?.name,
      reasons,
      lastRecordDate: lastRecord || null,
    });
  }
  res.json({ success: true, followUps: rows });
});

module.exports = { ownerInsights, staffInsights, cycleInsights, RULES };
