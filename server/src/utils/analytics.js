// Growth analytics, harvest projection, feeding guide and cycle summary.
//
// Everything is plain arithmetic on the owner's own records (no AI/ML):
//   ADG  = average daily gain (g/day) between the first and latest sampling
//   SGR  = specific growth rate (%/day) = (ln W2 − ln W1) / days × 100
//   FCR  = feed conversion ratio = feed given (kg) ÷ fish weight gained (kg)
//   Projection = least-squares straight line through the weight samples,
//                extended to the species' recommended harvest weight.
const GrowthRecord = require('../models/GrowthRecord');
const FeedingRecord = require('../models/FeedingRecord');
const HarvestRecord = require('../models/HarvestRecord');
const SalesRecord = require('../models/SalesRecord');
const ExpenseRecord = require('../models/ExpenseRecord');
const { computeHarvestEstimate } = require('./calculations');

const DAY_MS = 24 * 60 * 60 * 1000;
const round = (n, digits = 2) => (n === null || n === undefined || !Number.isFinite(n) ? null : Math.round(n * 10 ** digits) / 10 ** digits);
const daysBetween = (a, b) => (new Date(b) - new Date(a)) / DAY_MS;
const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY_MS);

// Least-squares line y = intercept + slope·x through [{ x, y }].
function linearFit(points) {
  const n = points.length;
  if (n < 2) return null;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  const sxx = points.reduce((s, p) => s + (p.x - meanX) ** 2, 0);
  if (sxx === 0) return null;
  const slope = points.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0) / sxx;
  return { slope, intercept: meanY - slope * meanX };
}

// Growth rates from weight samples ([{ date, averageWeight }], any order).
function growthMetrics(samples) {
  const sorted = [...samples].filter((s) => s.averageWeight > 0).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sorted.length < 2) return { samples: sorted.length, adg: null, sgr: null, firstWeight: sorted[0]?.averageWeight ?? null, latestWeight: sorted[0]?.averageWeight ?? null };
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const days = daysBetween(first.date, last.date);
  if (days <= 0) return { samples: sorted.length, adg: null, sgr: null, firstWeight: first.averageWeight, latestWeight: last.averageWeight };
  return {
    samples: sorted.length,
    firstWeight: first.averageWeight,
    latestWeight: last.averageWeight,
    adg: round((last.averageWeight - first.averageWeight) / days),
    sgr: round(((Math.log(last.averageWeight) - Math.log(first.averageWeight)) / days) * 100),
  };
}

// Daily feed as a share of fish body weight — smaller fish eat a larger share.
// General guide for pond-raised tilapia / bangus; adjust to the feed label.
const FEEDING_RATE_TABLE = [
  { upTo: 10, rate: 8 },
  { upTo: 50, rate: 5 },
  { upTo: 100, rate: 4 },
  { upTo: 200, rate: 3 },
  { upTo: Infinity, rate: 2 },
];

function feedingRatePercent(averageWeight) {
  if (!averageWeight || averageWeight <= 0) return null;
  return FEEDING_RATE_TABLE.find((r) => averageWeight <= r.upTo).rate;
}

function feedingGuide(fishCount, averageWeight) {
  const rate = feedingRatePercent(averageWeight);
  if (!rate || !fishCount) return null;
  const biomassKg = (fishCount * averageWeight) / 1000;
  const dailyKg = (biomassKg * rate) / 100;
  return { biomassKg: round(biomassKg), ratePercent: rate, dailyFeedKg: round(dailyKg), perFeedingKg: round(dailyKg / 3), feedingsPerDay: 3 };
}

// FCR = feed given ÷ weight gained. Weight gained = fish weight now (still in
// the pond + already harvested) minus the weight at the first sampling.
function feedConversionRatio({ totalFeedKg, startCount, startWeight, currentCount, currentWeight, harvestedKg = 0 }) {
  if (!totalFeedKg || !startWeight || !currentWeight) return null;
  const gainKg = (currentCount * currentWeight) / 1000 + harvestedKg - (startCount * startWeight) / 1000;
  if (gainKg <= 0) return null;
  return round(totalFeedKg / gainKg);
}

// Where the growth line says the fish will be.
//   stockingDate, samples, targetWeight (g), expectedHarvestDate, currentCount,
//   dailyMortalityRate (share of fish lost per day), today
function harvestProjection({ stockingDate, samples, targetWeight, expectedHarvestDate, currentCount, dailyMortalityRate = 0, today = new Date() }) {
  const points = samples
    .filter((s) => s.averageWeight > 0)
    .map((s) => ({ x: daysBetween(stockingDate, s.date), y: s.averageWeight }));
  const fit = linearFit(points);
  if (!fit || fit.slope <= 0) return { available: false, reason: points.length < 2 ? 'Need at least 2 growth samplings on different days' : 'Weights are not going up yet' };

  const todayX = daysBetween(stockingDate, today);
  const weightAt = (x) => fit.intercept + fit.slope * x;
  const survivorsAfter = (daysAhead) => Math.round(currentCount * (1 - dailyMortalityRate) ** Math.max(daysAhead, 0));

  const result = { available: true, gramsPerDay: round(fit.slope), projectedWeightToday: round(weightAt(todayX), 1) };

  if (targetWeight) {
    const targetX = (targetWeight - fit.intercept) / fit.slope;
    const daysLeft = Math.max(Math.ceil(targetX - todayX), 0);
    result.targetWeight = targetWeight;
    result.daysToTarget = daysLeft;
    result.projectedHarvestDate = addDays(today, daysLeft);
    result.projectedKgAtTarget = round((survivorsAfter(daysLeft) * targetWeight) / 1000, 1);
  }

  if (expectedHarvestDate) {
    const expectedX = daysBetween(stockingDate, expectedHarvestDate);
    const weight = Math.max(weightAt(expectedX), 0);
    const ahead = expectedX - todayX;
    result.expectedHarvestDate = new Date(expectedHarvestDate);
    result.weightAtExpectedDate = round(weight, 1);
    result.fishAtExpectedDate = survivorsAfter(ahead);
    result.kgAtExpectedDate = round((survivorsAfter(ahead) * weight) / 1000, 1);
    if (targetWeight) result.onTrack = weight >= targetWeight;
  }
  return result;
}

// Net income of a cycle: sales minus expenses, with cost per kilo produced and
// return on investment.
function profitAndLoss({ revenue = 0, expensesByCategory = {}, producedKg = 0 }) {
  const totalExpenses = Object.values(expensesByCategory).reduce((s, n) => s + n, 0);
  const netIncome = revenue - totalExpenses;
  return {
    revenue: round(revenue),
    totalExpenses: round(totalExpenses),
    expensesByCategory: Object.fromEntries(Object.entries(expensesByCategory).map(([k, v]) => [k, round(v)])),
    netIncome: round(netIncome),
    costPerKg: producedKg > 0 && totalExpenses > 0 ? round(totalExpenses / producedKg) : null,
    roiPercent: totalExpenses > 0 ? round((netIncome / totalExpenses) * 100, 1) : null,
  };
}

// Loads one cycle's records and returns all analytics for it.
// `cycle` must have `species` populated.
async function computeCycleAnalytics(cycle, today = new Date()) {
  const [estimate, samples, feedAgg, harvests, salesAgg, expenseAgg] = await Promise.all([
    computeHarvestEstimate(cycle),
    GrowthRecord.find({ cycle: cycle._id }).select('date averageWeight').sort({ date: 1 }).lean(),
    FeedingRecord.aggregate([{ $match: { cycle: cycle._id } }, { $group: { _id: null, kg: { $sum: '$quantityKg' }, days: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } } } }]),
    HarvestRecord.find({ cycle: cycle._id }).select('date actualQuantity actualWeightKg').sort({ date: 1 }).lean(),
    SalesRecord.aggregate([{ $match: { cycle: cycle._id } }, { $group: { _id: null, revenue: { $sum: '$totalAmount' }, kg: { $sum: '$quantityKg' }, count: { $sum: 1 } } }]),
    ExpenseRecord.aggregate([{ $match: { cycle: cycle._id } }, { $group: { _id: '$category', amount: { $sum: '$amount' } } }]),
  ]);

  const totalFeedKg = round(feedAgg[0]?.kg || 0);
  const harvestedKg = round(harvests.reduce((s, h) => s + (h.actualWeightKg || 0), 0));
  const growth = growthMetrics(samples);
  const endDate = cycle.status === 'active' ? today : harvests[harvests.length - 1]?.date || today;
  const daysOfCulture = Math.max(Math.floor(daysBetween(cycle.stockingDate, endDate)), 0);
  const dailyMortalityRate = daysOfCulture > 0 && estimate.totalStocked > 0 ? estimate.totalMortality / estimate.totalStocked / daysOfCulture : 0;

  const fcr = feedConversionRatio({
    totalFeedKg,
    startCount: estimate.totalStocked,
    startWeight: growth.firstWeight,
    currentCount: estimate.currentCount,
    currentWeight: growth.latestWeight,
    harvestedKg,
  });

  const projection =
    cycle.status === 'active'
      ? harvestProjection({
          stockingDate: cycle.stockingDate,
          samples,
          targetWeight: cycle.species?.recommendedHarvestWeightMin,
          expectedHarvestDate: cycle.expectedHarvestDate,
          currentCount: estimate.currentCount,
          dailyMortalityRate,
          today,
        })
      : null;

  return {
    cycleId: cycle._id,
    estimate,
    growth: { ...growth, lastSampleDate: samples[samples.length - 1]?.date || null },
    feeding: {
      totalFeedKg,
      feedingDays: feedAgg[0]?.days?.length || 0,
      fcr,
      guide: cycle.status === 'active' ? feedingGuide(estimate.currentCount, estimate.averageWeight) : null,
    },
    projection,
    summary: {
      status: cycle.status,
      stockingDate: cycle.stockingDate,
      endDate,
      daysOfCulture,
      totalStocked: estimate.totalStocked,
      totalMortality: estimate.totalMortality,
      survivalRate: estimate.survivalRate,
      harvestedCount: estimate.totalHarvested,
      harvestedKg,
      harvests: harvests.length,
      averageHarvestWeight: estimate.totalHarvested > 0 ? round((harvestedKg * 1000) / estimate.totalHarvested, 1) : null,
      salesRevenue: round(salesAgg[0]?.revenue || 0),
      soldKg: round(salesAgg[0]?.kg || 0),
      salesCount: salesAgg[0]?.count || 0,
    },
    finance: profitAndLoss({
      revenue: salesAgg[0]?.revenue || 0,
      expensesByCategory: Object.fromEntries(expenseAgg.map((e) => [e._id, e.amount])),
      producedKg: harvestedKg,
    }),
  };
}

module.exports = {
  linearFit,
  growthMetrics,
  feedingRatePercent,
  feedingGuide,
  feedConversionRatio,
  harvestProjection,
  profitAndLoss,
  computeCycleAnalytics,
  FEEDING_RATE_TABLE,
};
