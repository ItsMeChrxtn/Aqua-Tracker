// Unit tests for the growth / feeding / harvest-projection formulas.
// Run with: npm test (inside server/)
const test = require('node:test');
const assert = require('node:assert/strict');
const { linearFit, growthMetrics, feedingRatePercent, feedingGuide, feedConversionRatio, harvestProjection } = require('../src/utils/analytics');

const day = (n) => new Date(Date.UTC(2026, 0, 1) + n * 24 * 60 * 60 * 1000);

test('linearFit finds the straight line through the points', () => {
  const fit = linearFit([{ x: 0, y: 10 }, { x: 10, y: 30 }, { x: 20, y: 50 }]);
  assert.equal(fit.slope, 2);
  assert.equal(fit.intercept, 10);
  assert.equal(linearFit([{ x: 1, y: 1 }]), null, 'one point is not enough');
  assert.equal(linearFit([{ x: 5, y: 1 }, { x: 5, y: 9 }]), null, 'same day twice is not a line');
});

test('growthMetrics gives average daily gain and specific growth rate', () => {
  const g = growthMetrics([
    { date: day(30), averageWeight: 70 },
    { date: day(0), averageWeight: 10 }, // out of order on purpose
  ]);
  assert.equal(g.adg, 2); // (70 - 10) / 30 days
  assert.equal(g.sgr, 6.49); // ln(70/10) / 30 × 100
  assert.equal(g.firstWeight, 10);
  assert.equal(g.latestWeight, 70);
  assert.equal(growthMetrics([{ date: day(0), averageWeight: 10 }]).adg, null);
});

test('feeding rate goes down as fish grow', () => {
  assert.equal(feedingRatePercent(5), 8);
  assert.equal(feedingRatePercent(50), 5);
  assert.equal(feedingRatePercent(150), 3);
  assert.equal(feedingRatePercent(300), 2);
  assert.equal(feedingRatePercent(0), null);
});

test('feedingGuide is biomass × rate, split into 3 feedings', () => {
  const g = feedingGuide(1000, 100); // 100 kg of fish at 4%
  assert.equal(g.biomassKg, 100);
  assert.equal(g.ratePercent, 4);
  assert.equal(g.dailyFeedKg, 4);
  assert.equal(g.perFeedingKg, 1.33);
  assert.equal(feedingGuide(0, 100), null);
});

test('FCR is feed given divided by weight gained (harvested fish count too)', () => {
  // 1000 fish from 10 g to 210 g = 200 kg gained; 300 kg feed → FCR 1.5
  assert.equal(feedConversionRatio({ totalFeedKg: 300, startCount: 1000, startWeight: 10, currentCount: 1000, currentWeight: 210 }), 1.5);
  // half harvested (105 kg) still counts as gained weight
  assert.equal(feedConversionRatio({ totalFeedKg: 300, startCount: 1000, startWeight: 10, currentCount: 500, currentWeight: 210, harvestedKg: 105 }), 1.5);
  assert.equal(feedConversionRatio({ totalFeedKg: 0, startCount: 1, startWeight: 1, currentCount: 1, currentWeight: 2 }), null);
});

test('harvestProjection extends the growth line to the harvest weight', () => {
  const samples = [
    { date: day(10), averageWeight: 30 },
    { date: day(20), averageWeight: 50 },
    { date: day(30), averageWeight: 70 },
  ]; // 2 g/day, 10 g at stocking
  const p = harvestProjection({ stockingDate: day(0), samples, targetWeight: 210, expectedHarvestDate: day(120), currentCount: 1000, today: day(30) });
  assert.equal(p.available, true);
  assert.equal(p.gramsPerDay, 2);
  assert.equal(p.daysToTarget, 70); // reaches 210 g on day 100
  assert.equal(p.projectedHarvestDate.toISOString(), day(100).toISOString());
  assert.equal(p.projectedKgAtTarget, 210);
  assert.equal(p.weightAtExpectedDate, 250); // day 120
  assert.equal(p.kgAtExpectedDate, 250);
  assert.equal(p.onTrack, true);
});

test('harvestProjection accounts for ongoing mortality and needs rising weights', () => {
  const samples = [{ date: day(0), averageWeight: 10 }, { date: day(10), averageWeight: 30 }];
  const p = harvestProjection({ stockingDate: day(0), samples, targetWeight: 50, currentCount: 1000, dailyMortalityRate: 0.01, today: day(10) });
  assert.equal(p.daysToTarget, 10);
  assert.equal(p.projectedKgAtTarget, 45.2); // 1000 × 0.99^10 ≈ 904 fish × 50 g
  const flat = harvestProjection({ stockingDate: day(0), samples: [{ date: day(0), averageWeight: 30 }, { date: day(10), averageWeight: 30 }], currentCount: 10, today: day(10) });
  assert.equal(flat.available, false);
});

test('profitAndLoss: net income, cost per kg and ROI', () => {
  const { profitAndLoss } = require('../src/utils/analytics');
  const pl = profitAndLoss({ revenue: 30000, expensesByCategory: { feeds: 12000, fingerlings: 5000, labor: 3000 }, producedKg: 200 });
  assert.equal(pl.totalExpenses, 20000);
  assert.equal(pl.netIncome, 10000);
  assert.equal(pl.costPerKg, 100);
  assert.equal(pl.roiPercent, 50);
  assert.equal(profitAndLoss({ revenue: 500 }).roiPercent, null);
});
