const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
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

async function buildRows(req) {
  const fishpondFilter = req.user.role === 'fishpond_owner' ? { owner: req.user._id } : {};
  if (req.query.barangay) fishpondFilter.barangay = req.query.barangay;

  const fishponds = await Fishpond.find(fishpondFilter);
  const fishpondIds = fishponds.map((f) => f._id);
  const fishpondById = new Map(fishponds.map((f) => [f._id.toString(), f]));

  const cycles = await ProductionCycle.find({ fishpond: { $in: fishpondIds } }).populate('species');

  const rows = [];
  for (const cycle of cycles) {
    const estimate = await computeHarvestEstimate({ ...cycle.toObject(), fishpond: fishpondById.get(cycle.fishpond.toString()), species: cycle.species });
    const fishpond = fishpondById.get(cycle.fishpond.toString());
    rows.push({
      fishpond: fishpond ? fishpond.name : 'Unknown',
      barangay: fishpond ? fishpond.barangay : '',
      species: cycle.species ? cycle.species.name : '',
      batch: cycle.batchName || '-',
      stockingDate: cycle.stockingDate,
      status: cycle.status,
      initialCount: cycle.initialCount,
      currentCount: estimate.currentCount,
      survivalRate: estimate.survivalRate,
      averageWeight: estimate.averageWeight,
      estimatedHarvestKg: estimate.estimatedHarvestKg,
      readiness: READINESS_LABEL[estimate.readinessStatus] || estimate.readinessStatus,
    });
  }
  return rows;
}

// GET /api/reports/export/excel
const exportExcel = asyncHandler(async (req, res) => {
  const rows = await buildRows(req);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AquaTrack';
  const sheet = workbook.addWorksheet('Production Report');

  sheet.columns = [
    { header: 'Fishpond', key: 'fishpond', width: 22 },
    { header: 'Barangay', key: 'barangay', width: 16 },
    { header: 'Species', key: 'species', width: 16 },
    { header: 'Batch', key: 'batch', width: 12 },
    { header: 'Stocking Date', key: 'stockingDate', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Initial Count', key: 'initialCount', width: 14 },
    { header: 'Current Count', key: 'currentCount', width: 14 },
    { header: 'Survival Rate (%)', key: 'survivalRate', width: 16 },
    { header: 'Avg. Weight (g)', key: 'averageWeight', width: 16 },
    { header: 'Est. Harvest (kg)', key: 'estimatedHarvestKg', width: 16 },
    { header: 'Readiness', key: 'readiness', width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow({ ...row, stockingDate: row.stockingDate ? row.stockingDate.toISOString().slice(0, 10) : '' }));

  await logActivity(req, { action: 'EXPORT', targetType: 'Report', details: 'Exported production report (Excel)' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="aquatrack-production-report.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

// GET /api/reports/export/pdf
const exportPdf = asyncHandler(async (req, res) => {
  const rows = await buildRows(req);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="aquatrack-production-report.pdf"');

  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  doc.pipe(res);

  doc.fontSize(16).text('AquaTrack — Production Report', { align: 'center' });
  const generatedAt = new Date().toLocaleString('en-PH', { timeZone: TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' });
  doc.fontSize(9).fillColor('#555').text(`Generated ${generatedAt} by ${req.user.name}`, { align: 'center' });
  doc.moveDown(1);

  const headers = ['Fishpond', 'Barangay', 'Species', 'Batch', 'Status', 'Stocked', 'Current', 'Survival %', 'Avg Wt (g)', 'Est. Harvest (kg)', 'Readiness'];
  const colWidths = [90, 70, 65, 50, 55, 50, 50, 55, 60, 70, 75];
  const startX = doc.page.margins.left;
  let y = doc.y;

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
  headers.forEach((h, i) => {
    const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
    doc.text(h, x, y, { width: colWidths[i] });
  });
  y += 16;
  doc.font('Helvetica');

  if (rows.length === 0) {
    doc.text('No production cycles to report yet.', startX, y);
  }

  rows.forEach((row) => {
    const values = [
      row.fishpond,
      row.barangay,
      row.species,
      row.batch,
      row.status,
      String(row.initialCount),
      String(row.currentCount),
      String(row.survivalRate),
      String(row.averageWeight),
      String(row.estimatedHarvestKg),
      row.readiness,
    ].map((v) => (v === undefined || v === null ? '' : String(v)));

    // Long names wrap onto extra lines; size the row to its tallest cell so
    // the next row doesn't print on top of it.
    const rowHeight = Math.max(...values.map((v, i) => doc.heightOfString(v, { width: colWidths[i] - 4 }))) + 6;
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
      y = doc.page.margins.top;
    }
    values.forEach((v, i) => {
      const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(v, x, y, { width: colWidths[i] - 4 });
    });
    y += rowHeight;
  });

  await logActivity(req, { action: 'EXPORT', targetType: 'Report', details: 'Exported production report (PDF)' });

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
