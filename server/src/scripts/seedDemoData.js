// Populates realistic demo content for AquaTrack: species, an Agriculture
// Office Staff account, two fishponds under the existing fishpond-owner
// account, production cycles (one closed/harvested with sales history, two
// active at different growth stages), monitoring records, inventory (with
// one deliberately low-stock item), harvest-estimate history, and
// notifications/activity-log entries — mirroring what real day-to-day usage
// would produce.
//
// Usage: npm run seed-demo -- --owner-email owner@gmail.com
// If --owner-email is omitted, the first fishpond_owner account found is used.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Species = require('../models/Species');
const Fishpond = require('../models/Fishpond');
const ProductionCycle = require('../models/ProductionCycle');
const StockingRecord = require('../models/StockingRecord');
const GrowthRecord = require('../models/GrowthRecord');
const MortalityRecord = require('../models/MortalityRecord');
const FeedingRecord = require('../models/FeedingRecord');
const SalesRecord = require('../models/SalesRecord');
const InventoryItem = require('../models/InventoryItem');
const HarvestEstimateLog = require('../models/HarvestEstimateLog');
const HarvestRecord = require('../models/HarvestRecord');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { computeHarvestEstimate, getTotalMortality, HIGH_MORTALITY_THRESHOLD_PERCENT } = require('../utils/calculations');

const d = (s) => new Date(s);

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i].startsWith('--')) {
      out[args[i].slice(2)] = args[i + 1];
      i += 1;
    }
  }
  return out;
}

async function log(user, action, targetType, targetId, details) {
  await ActivityLog.create({ user: user._id, action, targetType, targetId, details });
}

async function notify(user, fishpond, type, message) {
  await Notification.create({ user: user._id, fishpond: fishpond._id, type, message });
}

// Inserts a growth record then snapshots the harvest estimate at that point
// in time (mirrors what the live app's growthController.onCreated does).
async function logGrowth(cycle, fishpond, owner, date, sampleSize, averageWeight) {
  const record = await GrowthRecord.create({ cycle: cycle._id, fishpond: fishpond._id, date: d(date), sampleSize, averageWeight, recordedBy: owner._id });
  await log(owner, 'CREATE', 'GrowthRecord', record._id, `Logged ${averageWeight}g average weight for ${fishpond.name}`);

  const previous = await HarvestEstimateLog.findOne({ cycle: cycle._id }).sort({ date: -1 });
  const populatedCycle = await ProductionCycle.findById(cycle._id).populate('species').populate('fishpond');
  const estimate = await computeHarvestEstimate(populatedCycle);

  await HarvestEstimateLog.create({
    cycle: cycle._id,
    fishpond: fishpond._id,
    date: d(date),
    currentCount: estimate.currentCount,
    averageWeight: estimate.averageWeight,
    survivalRate: estimate.survivalRate,
    estimatedHarvestKg: estimate.estimatedHarvestKg,
    readinessStatus: estimate.readinessStatus,
  });

  const statusChanged = !previous || previous.readinessStatus !== estimate.readinessStatus;
  if (statusChanged && ['near_harvest', 'ready_for_harvest'].includes(estimate.readinessStatus)) {
    const label = estimate.readinessStatus === 'ready_for_harvest' ? 'ready for harvest' : 'nearing harvest weight';
    await notify(owner, fishpond, 'near_harvest', `${fishpond.name} (${populatedCycle.species.name}) is ${label} — estimated ${estimate.estimatedHarvestKg} kg.`);
  }
  return estimate;
}

async function logMortality(cycle, fishpond, owner, date, quantity, cause) {
  const totalBefore = await getTotalMortality(cycle._id);
  const record = await MortalityRecord.create({ cycle: cycle._id, fishpond: fishpond._id, date: d(date), quantity, cause, recordedBy: owner._id });
  await log(owner, 'CREATE', 'MortalityRecord', record._id, `Logged ${quantity} fish lost at ${fishpond.name}`);

  const totalAfter = totalBefore + quantity;
  const percentBefore = cycle.initialCount > 0 ? (totalBefore / cycle.initialCount) * 100 : 0;
  const percentAfter = cycle.initialCount > 0 ? (totalAfter / cycle.initialCount) * 100 : 0;
  if (percentBefore < HIGH_MORTALITY_THRESHOLD_PERCENT && percentAfter >= HIGH_MORTALITY_THRESHOLD_PERCENT) {
    const populatedCycle = await ProductionCycle.findById(cycle._id).populate('species');
    await notify(owner, fishpond, 'high_mortality', `High mortality alert: ${fishpond.name} (${populatedCycle.species.name}) has lost ${percentAfter.toFixed(1)}% of stock.`);
  }
}

async function logFeeding(cycle, fishpond, owner, date, feedType, quantityKg) {
  const record = await FeedingRecord.create({ cycle: cycle._id, fishpond: fishpond._id, date: d(date), feedType, quantityKg, recordedBy: owner._id });
  await log(owner, 'CREATE', 'FeedingRecord', record._id, `Logged ${quantityKg}kg of ${feedType} at ${fishpond.name}`);
}

async function logSale(cycle, fishpond, owner, date, buyerName, quantityKg, pricePerKg) {
  const totalAmount = quantityKg * pricePerKg;
  const record = await SalesRecord.create({ cycle: cycle._id, fishpond: fishpond._id, date: d(date), buyerName, quantityKg, pricePerKg, totalAmount, recordedBy: owner._id });
  await log(owner, 'CREATE', 'SalesRecord', record._id, `Recorded sale of ${quantityKg}kg to ${buyerName} (₱${totalAmount}) at ${fishpond.name}`);
}

async function main() {
  const { 'owner-email': ownerEmailArg } = parseArgs();
  await connectDB();

  const admin = await User.findOne({ role: 'admin' });
  if (!admin) throw new Error('No admin account found. Run `npm run create-admin` first.');

  const owner = ownerEmailArg ? await User.findOne({ email: ownerEmailArg.toLowerCase() }) : await User.findOne({ role: 'fishpond_owner' });
  if (!owner) throw new Error('No fishpond_owner account found. Register one first, or pass --owner-email.');
  console.log(`Seeding demo data for owner: ${owner.name} <${owner.email}>`);

  let agri = await User.findOne({ role: 'agriculture_staff' });
  if (!agri) {
    agri = await User.create({
      name: 'Maria Santos',
      email: 'agri.maria@aquatrack.local',
      passwordHash: await bcrypt.hash('AgriStaff2026', 10),
      role: 'agriculture_staff',
      barangay: 'Poblacion',
    });
    console.log(`Created Agriculture Office Staff account: ${agri.email} / AgriStaff2026`);
  } else {
    console.log(`Using existing Agriculture Office Staff account: ${agri.email}`);
  }

  // --- Species ---
  const speciesDefs = [
    { name: 'Tilapia', waterType: 'freshwater', recommendedHarvestWeightMin: 150, recommendedHarvestWeightMax: 250, typicalGrowoutDays: 120 },
    { name: 'Bangus (Milkfish)', waterType: 'brackish', recommendedHarvestWeightMin: 250, recommendedHarvestWeightMax: 350, typicalGrowoutDays: 150 },
    { name: 'Hito (Catfish)', waterType: 'freshwater', recommendedHarvestWeightMin: 200, recommendedHarvestWeightMax: 300, typicalGrowoutDays: 90 },
  ];
  const species = {};
  for (const def of speciesDefs) {
    let s = await Species.findOne({ name: def.name });
    if (!s) {
      s = await Species.create({ ...def, createdBy: admin._id });
      console.log(`Created species: ${s.name}`);
    }
    species[def.name] = s;
  }

  // --- Fishponds ---
  let pond1 = await Fishpond.findOne({ owner: owner._id, name: 'Dela Cruz Tilapia Farm' });
  if (!pond1) {
    pond1 = await Fishpond.create({ owner: owner._id, name: 'Dela Cruz Tilapia Farm', barangay: 'San Rafael', areaSize: 500, status: 'approved', approvedBy: agri._id, approvedAt: d('2026-01-25') });
    await log(owner, 'CREATE', 'Fishpond', pond1._id, `Registered fishpond ${pond1.name}`);
    await log(agri, 'APPROVE', 'Fishpond', pond1._id, `Approved fishpond ${pond1.name}`);
    await notify(owner, pond1, 'registration_approved', `Your fishpond "${pond1.name}" has been approved by the Agriculture Office.`);
  }

  let pond2 = await Fishpond.findOne({ owner: owner._id, name: 'Dela Cruz Bangus Pond' });
  if (!pond2) {
    pond2 = await Fishpond.create({ owner: owner._id, name: 'Dela Cruz Bangus Pond', barangay: 'Sabang', areaSize: 800, status: 'approved', approvedBy: agri._id, approvedAt: d('2026-06-28') });
    await log(owner, 'CREATE', 'Fishpond', pond2._id, `Registered fishpond ${pond2.name}`);
    await log(agri, 'APPROVE', 'Fishpond', pond2._id, `Approved fishpond ${pond2.name}`);
    await notify(owner, pond2, 'registration_approved', `Your fishpond "${pond2.name}" has been approved by the Agriculture Office.`);
  }

  // A third, still-pending fishpond so the Agriculture Office approval queue isn't empty
  let pond3 = await Fishpond.findOne({ owner: owner._id, name: 'Dela Cruz Hito Pond (New)' });
  if (!pond3) {
    pond3 = await Fishpond.create({ owner: owner._id, name: 'Dela Cruz Hito Pond (New)', barangay: 'San Rafael', areaSize: 300, status: 'pending' });
    await log(owner, 'CREATE', 'Fishpond', pond3._id, `Registered fishpond ${pond3.name}`);
  }

  // --- Pond 1 / Batch 1: CLOSED cycle with full growth history + harvest + sales ---
  let p1c1 = await ProductionCycle.findOne({ fishpond: pond1._id, batchName: 'Batch 1' });
  if (!p1c1) {
    p1c1 = await ProductionCycle.create({ fishpond: pond1._id, species: species.Tilapia._id, batchName: 'Batch 1', stockingDate: d('2026-02-01'), initialCount: 1200, status: 'active' });
    await log(owner, 'CREATE', 'ProductionCycle', p1c1._id, `Started cycle for ${pond1.name} (Tilapia)`);
    await StockingRecord.create({ cycle: p1c1._id, fishpond: pond1._id, date: d('2026-02-01'), quantity: 1200, source: 'Noveleta BFAR-accredited hatchery', recordedBy: owner._id });

    // Inserted in strict chronological (date) order so each snapshot's
    // "mortality so far" reflects only what had actually happened by then.
    await logGrowth(p1c1, pond1, owner, '2026-02-15', 30, 25);
    await logMortality(p1c1, pond1, owner, '2026-02-20', 30, 'Natural die-off during acclimatization period');
    await logGrowth(p1c1, pond1, owner, '2026-03-01', 30, 55);
    await logFeeding(p1c1, pond1, owner, '2026-03-01', 'Starter Crumble', 12);
    await logGrowth(p1c1, pond1, owner, '2026-03-15', 30, 90);
    await logGrowth(p1c1, pond1, owner, '2026-03-29', 30, 125);
    await logMortality(p1c1, pond1, owner, '2026-04-01', 25, 'Few floaters observed, no clear cause');
    await logFeeding(p1c1, pond1, owner, '2026-04-05', 'Grower Pellets', 28);
    await logGrowth(p1c1, pond1, owner, '2026-04-12', 30, 160);
    await logGrowth(p1c1, pond1, owner, '2026-04-26', 30, 190);
    await logFeeding(p1c1, pond1, owner, '2026-05-10', 'Grower Pellets', 40);
    await logGrowth(p1c1, pond1, owner, '2026-05-10', 30, 215);
    await logMortality(p1c1, pond1, owner, '2026-05-15', 20, 'Suspected predation - possible bird intrusion');
    await logGrowth(p1c1, pond1, owner, '2026-05-24', 30, 235);

    // Harvest
    const harvest = await HarvestRecord.create({ cycle: p1c1._id, fishpond: pond1._id, date: d('2026-06-05'), actualQuantity: 1100, actualWeightKg: 258.5, notes: 'Full harvest, sold across two buyers', recordedBy: owner._id });
    p1c1.status = 'harvested';
    await p1c1.save();
    await log(owner, 'CREATE', 'HarvestRecord', harvest._id, `Logged harvest for ${pond1.name}`);
    await notify(owner, pond1, 'general', `Harvest logged for ${pond1.name}: 1100 fish, 258.5 kg total.`);

    await logSale(p1c1, pond1, owner, '2026-06-06', 'Palengke ni Aling Nena', 150, 130);
    await logSale(p1c1, pond1, owner, '2026-06-10', 'Suki Traders Noveleta', 100, 125);
  }

  // --- Pond 1 / Batch 2: ACTIVE cycle, nearing harvest weight ---
  let p1c2 = await ProductionCycle.findOne({ fishpond: pond1._id, batchName: 'Batch 2' });
  if (!p1c2) {
    p1c2 = await ProductionCycle.create({ fishpond: pond1._id, species: species.Tilapia._id, batchName: 'Batch 2', stockingDate: d('2026-06-20'), initialCount: 1000, status: 'active' });
    await log(owner, 'CREATE', 'ProductionCycle', p1c2._id, `Started cycle for ${pond1.name} (Tilapia)`);
    await StockingRecord.create({ cycle: p1c2._id, fishpond: pond1._id, date: d('2026-06-20'), quantity: 1000, source: 'Noveleta BFAR-accredited hatchery', recordedBy: owner._id });

    await logGrowth(p1c2, pond1, owner, '2026-07-04', 30, 28);
    await logFeeding(p1c2, pond1, owner, '2026-07-08', 'Starter Crumble', 15);
    await logMortality(p1c2, pond1, owner, '2026-07-10', 15, 'Slight mortality after rainstorm');
    await logGrowth(p1c2, pond1, owner, '2026-07-18', 30, 65);
    await logFeeding(p1c2, pond1, owner, '2026-07-22', 'Grower Pellets', 26);
    await logMortality(p1c2, pond1, owner, '2026-07-25', 10, 'Isolated deaths, no clear cause');
    await logGrowth(p1c2, pond1, owner, '2026-08-01', 30, 105);
    await logFeeding(p1c2, pond1, owner, '2026-08-05', 'Grower Pellets', 34);
    await logSale(p1c2, pond1, owner, '2026-08-06', 'Local buyer (selective early harvest)', 15, 128);
    await logGrowth(p1c2, pond1, owner, '2026-08-08', 30, 140); // crosses into "near_harvest"
  }

  // --- Pond 2 / Batch 1: ACTIVE cycle, early growth stage ---
  let p2c1 = await ProductionCycle.findOne({ fishpond: pond2._id, batchName: 'Batch 1' });
  if (!p2c1) {
    p2c1 = await ProductionCycle.create({ fishpond: pond2._id, species: species['Bangus (Milkfish)']._id, batchName: 'Batch 1', stockingDate: d('2026-07-05'), initialCount: 800, status: 'active' });
    await log(owner, 'CREATE', 'ProductionCycle', p2c1._id, `Started cycle for ${pond2.name} (Bangus)`);
    await StockingRecord.create({ cycle: p2c1._id, fishpond: pond2._id, date: d('2026-07-05'), quantity: 800, source: 'Cavite Bangus Fry Suppliers Coop', recordedBy: owner._id });

    await logMortality(p2c1, pond2, owner, '2026-07-15', 10, 'Minor stress mortality after transport');
    await logGrowth(p2c1, pond2, owner, '2026-07-19', 25, 15);
    await logFeeding(p2c1, pond2, owner, '2026-07-20', 'Bangus Fry Starter', 8);
    await logGrowth(p2c1, pond2, owner, '2026-08-02', 25, 45);
    // Sudden fish-kill event — pushes this batch over the high-mortality alert threshold
    await logMortality(p2c1, pond2, owner, '2026-08-04', 120, 'Sudden fish kill overnight - suspected low dissolved oxygen after a power outage stopped the aerator');
    await logFeeding(p2c1, pond2, owner, '2026-08-05', 'Bangus Fry Starter', 10);
    await logGrowth(p2c1, pond2, owner, '2026-08-08', 25, 70);
  }

  // --- Inventory (one deliberately low-stock item to demo the alert) ---
  let pelletItem = await InventoryItem.findOne({ fishpond: pond1._id, name: 'Tilapia Grower Pellets' });
  if (!pelletItem) {
    pelletItem = await InventoryItem.create({ fishpond: pond1._id, name: 'Tilapia Grower Pellets', category: 'feed', unit: 'kg', currentStock: 8, reorderLevel: 20, createdBy: owner._id });
    await log(owner, 'CREATE', 'InventoryItem', pelletItem._id, `Added inventory item ${pelletItem.name} for ${pond1.name}`);
    await notify(owner, pond1, 'low_stock', `Low stock alert: ${pelletItem.name} at ${pond1.name} is down to 8 kg (reorder level: 20 kg).`);
  }
  let limeItem = await InventoryItem.findOne({ fishpond: pond1._id, name: 'Agricultural Lime' });
  if (!limeItem) {
    limeItem = await InventoryItem.create({ fishpond: pond1._id, name: 'Agricultural Lime', category: 'chemical', unit: 'sack', currentStock: 5, reorderLevel: 2, createdBy: owner._id });
    await log(owner, 'CREATE', 'InventoryItem', limeItem._id, `Added inventory item ${limeItem.name} for ${pond1.name}`);
  }
  let bangusFeedItem = await InventoryItem.findOne({ fishpond: pond2._id, name: 'Bangus Fry Starter Feed' });
  if (!bangusFeedItem) {
    bangusFeedItem = await InventoryItem.create({ fishpond: pond2._id, name: 'Bangus Fry Starter Feed', category: 'feed', unit: 'kg', currentStock: 30, reorderLevel: 10, createdBy: owner._id });
    await log(owner, 'CREATE', 'InventoryItem', bangusFeedItem._id, `Added inventory item ${bangusFeedItem.name} for ${pond2.name}`);
  }

  console.log('\nDemo data seeded successfully.');
  console.log('--------------------------------------------------');
  console.log(`Fishpond Owner (customer): ${owner.email}`);
  console.log(`Agriculture Office Staff: ${agri.email}${agri.email === 'agri.maria@aquatrack.local' ? ' / AgriStaff2026' : ' (existing account, password unchanged)'}`);
  console.log('Admin: (existing account, password unchanged)');
  console.log('--------------------------------------------------');
  console.log('Fishponds created: Dela Cruz Tilapia Farm (2 batches, 1 harvested+sold), Dela Cruz Bangus Pond (1 active batch), Dela Cruz Hito Pond (New) [pending approval]');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
