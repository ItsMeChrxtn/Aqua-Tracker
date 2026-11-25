// Unit tests for the dashboard insight rules (no database needed).
const test = require('node:test');
const assert = require('node:assert/strict');
const { cycleInsights } = require('../src/controllers/insightController');

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-06-01T08:00:00Z');
const ago = (d) => new Date(now.getTime() - d * DAY);

const base = (over = {}) => ({
  label: 'Pond A (Cycle #1)',
  analytics: {
    estimate: { currentCount: 1000, readinessStatus: 'growing', averageWeight: 100, recommendedHarvestWeightMin: 250, estimatedHarvestKg: 100 },
    projection: { available: true, onTrack: true },
    feeding: { fcr: 1.4, guide: { dailyFeedKg: 3 } },
  },
  recentMortality: 0,
  lastGrowthDate: ago(3),
  lastFeedingDate: ago(1),
  recentWaterIssues: [],
  expectedHarvestDate: new Date(now.getTime() + 60 * DAY),
  stockingDate: ago(60),
  now,
  ...over,
});

const titles = (ctx) => cycleInsights(ctx).map((i) => i.title);

test('a healthy, up-to-date cycle has no warnings', () => {
  assert.deepEqual(titles(base()), []);
});

test('flags mortality of 5% or more in the last week', () => {
  assert.ok(titles(base({ recentMortality: 60 })).some((t) => t.startsWith('High mortality')));
  assert.ok(!titles(base({ recentMortality: 10 })).some((t) => t.startsWith('High mortality')));
});

test('reminds to weigh after 14 days and to feed after 3 days', () => {
  assert.ok(titles(base({ lastGrowthDate: ago(15) })).some((t) => t.startsWith('Time to sample')));
  assert.ok(titles(base({ lastFeedingDate: ago(4) })).some((t) => t.startsWith('No feeding recorded')));
});

test('does not nag a cycle that was just stocked', () => {
  assert.deepEqual(titles(base({ stockingDate: ago(1), lastGrowthDate: null, lastFeedingDate: null })), []);
});

test('harvest timing: soon, overdue, or ready', () => {
  assert.ok(titles(base({ expectedHarvestDate: new Date(now.getTime() + 5 * DAY) })).some((t) => t.startsWith('Harvest of')));
  assert.ok(titles(base({ expectedHarvestDate: ago(2) })).some((t) => t.includes('past its planned harvest date')));
  const ready = base();
  ready.analytics.estimate.readinessStatus = 'ready_for_harvest';
  assert.ok(titles(ready).some((t) => t.includes('ready for harvest')));
});

test('warns about high FCR and water problems', () => {
  const ctx = base({ recentWaterIssues: ['Low dissolved oxygen (2 mg/L)'] });
  ctx.analytics.feeding.fcr = 2.6;
  const t = titles(ctx);
  assert.ok(t.some((x) => x.startsWith('Water quality problem')));
  assert.ok(t.some((x) => x.startsWith('High feed use')));
});
