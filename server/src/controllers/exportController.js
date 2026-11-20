const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const Fishpond = require('../models/Fishpond');
const ProductionCycle = require('../models/ProductionCycle');
const Species = require('../models/Species');
const User = require('../models/User');
const StockingRecord = require('../models/StockingRecord');
const GrowthRecord = require('../models/GrowthRecord');
const MortalityRecord = require('../models/MortalityRecord');
const FeedingRecord = require('../models/FeedingRecord');
const HarvestRecord = require('../models/HarvestRecord');
const InventoryItem = require('../models/InventoryItem');
const SalesRecord = require('../models/SalesRecord');
const asyncHandler = require('../utils/asyncHandler');
const { computeHarvestEstimate } = require('../utils/calculations');
const { logActivity } = require('../utils/activityLog');

const USER_SECRET_FIELDS = '-passwordHash -otpHash -otpExpiresAt -otpSentAt -otpAttempts';
const TIME_ZONE = 'Asia/Manila';

const READINESS_LABEL = {
  growing: 'Growing',
  near_harvest: 'Near Harvest',
  ready_for_harvest: 'Ready for Harvest',
};

const isoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const show = (v) => (v === undefined || v === null || v === '' ? '-' : String(v));

// One row per production cycle the user may see, narrowed by
// ?fishpondId=, ?barangay= and the ?q= search used on screen.
async function buildRows(req) {
  const fishpondFilter = req.user.role === 'fishpond_owner' ? { owner: req.user._id } : {};
  if (req.query.barangay) fishpondFilter.barangay = req.query.barangay;
  if (req.query.fishpondId && mongoose.isValidObjectId(req.query.fishpondId)) fishpondFilter._id = req.query.fishpondId;

  const fishponds = await Fishpond.find(fishpondFilter).populate('owner', 'name');
  const fishpondById = new Map(fishponds.map((f) => [f._id.toString(), f]));

  const cycleFilter = { fishpond: { $in: fishponds.map((f) => f._id) } };
  if (req.query.cycleId && mongoose.isValidObjectId(req.query.cycleId)) cycleFilter._id = req.query.cycleId;
  const cycles = await ProductionCycle.find(cycleFilter)
    .populate('species')
    .sort({ stockingDate: 1 });

  const terms = String(req.query.q || '').toLowerCase().split(/\s+/).filter(Boolean);
  const rows = [];
  for (const cycle of cycles) {
    const fishpond = fishpondById.get(cycle.fishpond.toString());
    const estimate = await computeHarvestEstimate({ ...cycle.toObject(), fishpond, species: cycle.species });
    const row = {
      cycleId: cycle._id,
      fishpond: fishpond ? fishpond.name : 'Unknown',
      owner: fishpond && fishpond.owner ? fishpond.owner.name : 'Unknown',
      barangay: fishpond ? fishpond.barangay : '',
      species: cycle.species ? cycle.species.name : 'Unknown species',
      batch: cycle.batchName || '-',
      stockingDate: cycle.stockingDate,
      status: cycle.status,
      totalStocked: estimate.totalStocked,
      currentCount: estimate.currentCount,
      survivalRate: estimate.survivalRate,
      averageWeight: estimate.averageWeight,
      estimatedHarvestKg: estimate.estimatedHarvestKg,
      readiness: READINESS_LABEL[estimate.readinessStatus] || estimate.readinessStatus,
    };
    const haystack = [row.fishpond, row.owner, row.barangay, row.species, row.batch, row.status, row.readiness].join(' ').toLowerCase();
    if (terms.every((t) => haystack.includes(t))) rows.push(row);
  }
  return rows;
}

// Stocking, feeding, mortality and growth records of the reported cycles, each tagged
// with its fishpond / species / batch.
async function buildRecordSections(rows) {
  const byCycle = new Map(rows.map((r) => [r.cycleId.toString(), r]));
  const filter = { cycle: { $in: rows.map((r) => r.cycleId) } };
  const [stocking, feeding, mortality, growth] = await Promise.all([
    StockingRecord.find(filter).sort({ date: 1 }),
    FeedingRecord.find(filter).sort({ date: 1 }),
    MortalityRecord.find(filter).sort({ date: 1 }),
    GrowthRecord.find(filter).sort({ date: 1 }),
  ]);
  const where = (rec) => {
    const r = byCycle.get(rec.cycle.toString());
    return [isoDate(rec.date), r.fishpond, r.species, r.batch];
  };
  const base = ['Date', 'Fishpond', 'Species', 'Batch'];
  return [
    {
      title: 'Stocking Records',
      headers: [...base, 'Fingerlings', 'Source / Supplier', 'Notes'],
      widths: [70, 140, 110, 60, 80, 140, 160],
      rows: stocking.map((s) => [...where(s), show(s.quantity), show(s.source), show(s.notes)]),
    },
    {
      title: 'Feeding Records',
      headers: [...base, 'Feed Type', 'Quantity Fed (kg)', 'Notes'],
      widths: [70, 140, 110, 60, 130, 90, 160],
      rows: feeding.map((f) => [...where(f), show(f.feedType), show(f.quantityKg), show(f.notes)]),
    },
    {
      title: 'Mortality Records',
      headers: [...base, 'Fish Lost', 'Cause', 'Notes'],
      widths: [70, 140, 110, 60, 60, 170, 150],
      rows: mortality.map((m) => [...where(m), show(m.quantity), show(m.cause), show(m.notes)]),
    },
    {
      title: 'Growth Records',
      headers: [...base, 'Avg. Weight (g)', 'Sample Size', 'Notes'],
      widths: [70, 140, 110, 60, 90, 80, 210],
      rows: growth.map((g) => [...where(g), show(g.averageWeight), show(g.sampleSize), show(g.notes)]),
    },
  ];
}

// A single batch (?cycleId=) gets its own file name.
function reportFilename(req, rows, ext) {
  if (req.query.cycleId && rows.length === 1) {
    const slug = `${rows[0].fishpond}-${rows[0].batch}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `aquatrack-batch-records-${slug || 'batch'}.${ext}`;
  }
  return `aquatrack-production-report.${ext}`;
}

const SUMMARY = {
  headers: ['Fishpond', 'Owner', 'Barangay', 'Species', 'Batch', 'Status', 'Stocked', 'Current', 'Survival %', 'Avg Wt (g)', 'Est. Harvest (kg)', 'Readiness'],
  widths: [82, 78, 62, 62, 44, 50, 46, 46, 50, 50, 64, 66],
  values: (r) => [r.fishpond, r.owner, r.barangay, r.species, r.batch, r.status, r.totalStocked, r.currentCount, r.survivalRate, r.averageWeight, r.estimatedHarvestKg, r.readiness].map(show),
};

// GET /api/reports/export/excel
const exportExcel = asyncHandler(async (req, res) => {
  const rows = await buildRows(req);
  const sections = await buildRecordSections(rows);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AquaTrack';
  const sheet = workbook.addWorksheet('Production Report');
  sheet.columns = [
    { header: 'Fishpond', key: 'fishpond', width: 22 },
    { header: 'Owner', key: 'owner', width: 22 },
    { header: 'Barangay', key: 'barangay', width: 16 },
    { header: 'Species', key: 'species', width: 16 },
    { header: 'Batch', key: 'batch', width: 12 },
    { header: 'Stocking Date', key: 'stockingDate', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Total Stocked', key: 'totalStocked', width: 14 },
    { header: 'Current Count', key: 'currentCount', width: 14 },
    { header: 'Survival Rate (%)', key: 'survivalRate', width: 16 },
    { header: 'Avg. Weight (g)', key: 'averageWeight', width: 16 },
    { header: 'Est. Harvest (kg)', key: 'estimatedHarvestKg', width: 16 },
    { header: 'Readiness', key: 'readiness', width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };
  rows.forEach(({ cycleId, ...row }) => sheet.addRow({ ...row, stockingDate: isoDate(row.stockingDate) }));

  sections.forEach((section) => {
    const ws = workbook.addWorksheet(section.title);
    ws.columns = section.headers.map((header, i) => ({ header, width: Math.max(12, Math.round(section.widths[i] / 6)) }));
    ws.getRow(1).font = { bold: true };
    section.rows.forEach((r) => ws.addRow(r));
  });

  await logActivity(req, { action: 'EXPORT', targetType: 'Report', details: req.query.cycleId ? 'Exported batch records report (Excel)' : 'Exported production report (Excel)' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${reportFilename(req, rows, 'xlsx')}"`);
  await workbook.xlsx.write(res);
  res.end();
});

// Draws a simple table whose rows grow to fit wrapped text.
function drawTable(doc, headers, widths, rows) {
  const startX = doc.page.margins.left;
  const bottom = () => doc.page.height - doc.page.margins.bottom;
  const xAt = (i) => startX + widths.slice(0, i).reduce((a, b) => a + b, 0);

  let y = doc.y;
  const header = () => {
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
    const height = Math.max(...headers.map((h, i) => doc.heightOfString(h, { width: widths[i] - 4 }))) + 6;
    headers.forEach((h, i) => doc.text(h, xAt(i), y, { width: widths[i] - 4 }));
    y += height;
    doc.font('Helvetica');
  };

  header();
  if (rows.length === 0) {
    doc.text('No records.', startX, y);
    y += 16;
  }
  rows.forEach((values) => {
    const height = Math.max(...values.map((v, i) => doc.heightOfString(v, { width: widths[i] - 4 }))) + 6;
    if (y + height > bottom()) {
      doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
      y = doc.page.margins.top;
      header();
    }
    values.forEach((v, i) => doc.text(v, xAt(i), y, { width: widths[i] - 4 }));
    y += height;
  });
  doc.x = startX;
  doc.y = y;
}

// GET /api/reports/export/pdf
const exportPdf = asyncHandler(async (req, res) => {
  const rows = await buildRows(req);
  const sections = await buildRecordSections(rows);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${reportFilename(req, rows, 'pdf')}"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  doc.pipe(res);

  const fishpondNames = [...new Set(rows.map((r) => r.fishpond))];
  let scope = req.query.fishpondId && fishpondNames.length === 1 ? ` — ${fishpondNames[0]}` : '';
  if (req.query.cycleId && rows.length === 1) scope = ` — ${rows[0].fishpond} (${rows[0].species}, ${rows[0].batch})`;
  doc.fontSize(16).text(`AquaTrack — Production Report${scope}`, { align: 'center' });
  const generatedAt = new Date().toLocaleString('en-PH', { timeZone: TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' });
  doc.fontSize(9).fillColor('#555').text(`Generated ${generatedAt} by ${req.user.name}`, { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text('Production Summary', doc.page.margins.left);
  doc.moveDown(0.4);
  drawTable(doc, SUMMARY.headers, SUMMARY.widths, rows.map(SUMMARY.values));

  sections.forEach((section) => {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 80) doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text(`${section.title} (${section.rows.length})`, doc.page.margins.left);
    doc.moveDown(0.4);
    drawTable(doc, section.headers, section.widths, section.rows);
  });

  await logActivity(req, { action: 'EXPORT', targetType: 'Report', details: req.query.cycleId ? 'Exported batch records report (PDF)' : 'Exported production report (PDF)' });

  doc.end();
});

// GET /api/admin/backup — manual full-data export (admin only). Substitutes
// for automated backup infrastructure, which is out of scope for this system.
const exportBackup = asyncHandler(async (req, res) => {
  const [users, species, fishponds, cycles, stocking, growth, mortality, feeding, harvests, inventory, sales] = await Promise.all([
    User.find().select(USER_SECRET_FIELDS),
    Species.find(),
    Fishpond.find(),
    ProductionCycle.find(),
    StockingRecord.find(),
    GrowthRecord.find(),
    MortalityRecord.find(),
    FeedingRecord.find(),
    HarvestRecord.find(),
    InventoryItem.find(),
    SalesRecord.find(),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    exportedBy: req.user.email,
    users,
    species,
    fishponds,
    cycles,
    stocking,
    growth,
    mortality,
    feeding,
    harvests,
    inventory,
    sales,
  };

  await logActivity(req, { action: 'EXPORT', targetType: 'Backup', details: 'Exported full data backup (JSON)' });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="aquatrack-backup-${Date.now()}.json"`);
  res.send(JSON.stringify(backup, null, 2));
});

module.exports = { exportExcel, exportPdf, exportBackup };
