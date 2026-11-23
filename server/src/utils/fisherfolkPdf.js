const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// Printable copy of a fisherfolk application laid out like the paper
// "Application for Municipal Fisherfolk Registration" form, so it can be
// signed, thumbmarked and verified by the barangay.

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const BLUE = '#1d9bd7';
const INK = '#111827';
const MUTED = '#4b5563';

const M = 30; // margin
const W = 595.28 - M * 2; // A4 content width

const SOURCE_LABEL = {
  capture_fishing: 'Capture Fishing (specify gear used)',
  aquaculture: 'Aquaculture (specify gear used)',
  fish_vending: 'Fish vending',
  gleaning: 'Gleaning',
  fish_processing: 'Fish Processing',
  others: 'Others (pls. specify)',
};

const INCOME = [
  ['below_5000', 'Less than 5,000'],
  ['5001_10000', '5,001-10,000'],
  ['10001_20000', '10,001-20,000'],
  ['20001_30000', '20,000-30,000'],
  ['30001_40000', '30,001-40,000'],
  ['above_40000', 'More than 40,000'],
];

const fmtDate = (d) =>
  d ? new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: '2-digit', day: '2-digit', year: 'numeric' }).format(new Date(d)) : '';

function ageOf(birthDate) {
  if (!birthDate) return '';
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) age -= 1;
  return String(age);
}

const val = (v) => (v === undefined || v === null ? '' : String(v));

function localImage(url) {
  if (!url || !/\.(png|jpe?g)$/i.test(url)) return null;
  const file = path.join(uploadsDir, path.basename(url));
  return fs.existsSync(file) ? file : null;
}

function writeApplicationPdf(app, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: M });
  doc.pipe(stream);
  doc.lineWidth(0.8).strokeColor(INK);

  const box = (x, y, w, h) => doc.rect(x, y, w, h).stroke();
  const label = (s, x, y, opts = {}) => doc.font('Helvetica').fontSize(opts.size || 7.5).fillColor(MUTED).text(s, x, y, { width: opts.width, lineBreak: !!opts.width });
  const value = (s, x, y, opts = {}) =>
    doc.font('Helvetica-Bold').fontSize(opts.size || 9).fillColor(INK).text(val(s), x, y, { width: opts.width, ellipsis: true, height: opts.height || 12 });
  const check = (on, s, x, y) => {
    doc.rect(x, y, 7, 7).stroke();
    if (on) doc.font('Helvetica-Bold').fontSize(8).fillColor(INK).text('X', x + 1.2, y - 0.2, { lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(INK).text(s, x + 10, y - 0.5, { lineBreak: false });
  };
  // A bordered cell with a small caption and the answer underneath.
  const cell = (x, y, w, h, caption, answer) => {
    box(x, y, w, h);
    label(caption, x + 3, y + 2);
    value(answer, x + 3, y + h - 13, { width: w - 6 });
  };
  const bar = (y, title) => {
    doc.rect(M, y, W, 14).fill(BLUE);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff').text(title, M + 4, y + 3, { lineBreak: false });
    doc.fillColor(INK);
    return y + 14;
  };

  // ---------- Page 1: header ----------
  let y = M;
  const photoW = 108;
  const headW = W - photoW;
  box(M, y, headW, 72);
  doc.font('Helvetica').fontSize(8.5).fillColor(INK);
  doc.text('Republic of the Philippines', M, y + 8, { width: headW, align: 'center' });
  doc.text(`Province of ${(app.address?.province || 'Cavite').toUpperCase()}`, M, y + 19, { width: headW, align: 'center' });
  doc.text(`Municipality of ${(app.address?.municipality || 'Noveleta').toUpperCase()}`, M, y + 30, { width: headW, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(11.5).text('APPLICATION FOR MUNICIPAL FISHERFOLK REGISTRATION', M, y + 48, { width: headW, align: 'center' });

  const photoX = M + headW;
  box(photoX, y, photoW, 108);
  const photo = localImage(app.photoUrl);
  if (photo) {
    try {
      doc.image(photo, photoX + 4, y + 4, { fit: [photoW - 8, 100], align: 'center', valign: 'center' });
    } catch {
      label('Attach Photo Here (1 1/2" x 1 1/2")', photoX + 6, y + 40, { width: photoW - 12 });
    }
  } else {
    label('Attach Photo Here\n(1 1/2" x 1 1/2")\nPhoto should be taken within the last six (6) months', photoX + 6, y + 30, { width: photoW - 12 });
  }

  y += 72;
  box(M, y, headW, 36);
  label('Registration No.:', M + 3, y + 5);
  value(app.registrationNo, M + 75, y + 4, { width: 120 });
  label('Registration Date:', M + 3, y + 21);
  value(fmtDate(app.registrationDate), M + 75, y + 20, { width: 120 });
  check(app.registrationType === 'new', 'New Registration', M + 205, y + 6);
  check(app.registrationType === 'renewal', 'Renewal', M + 205, y + 22);
  check(app.registrationType === 'transferee', 'Transferee', M + 320, y + 6);
  y += 36;

  y = bar(y, '1. PERSONAL INFORMATION');

  // Name
  box(M, y, W, 38);
  label('Complete Name', M + 3, y + 2);
  check(app.salutation === 'Mr', 'Mr', M + 6, y + 14);
  check(app.salutation === 'Ms', 'Ms', M + 36, y + 14);
  check(app.salutation === 'Mrs', 'Mrs', M + 66, y + 14);
  const nameCols = [
    [M + 105, 135, 'Last Name', app.lastName],
    [M + 245, 135, 'First Name', app.firstName],
    [M + 385, 100, 'Middle Name', app.middleName],
    [M + 490, W - 490, 'Appellation', app.appellation],
  ];
  nameCols.forEach(([x, w, cap, v]) => {
    value(v, x, y + 12, { width: w - 4 });
    doc.moveTo(x, y + 25).lineTo(x + w - 6, y + 25).stroke();
    label(cap, x, y + 27);
  });
  label('Salutation', M + 3, y + 27);
  y += 38;

  // Address
  box(M, y, W, 32);
  label('Address', M + 3, y + 2);
  const addrCols = [
    [M + 50, 230, 'Street/Barangay', [app.address?.street, app.address?.barangay].filter(Boolean).join(', ')],
    [M + 290, 130, 'City/Municipality', app.address?.municipality],
    [M + 430, W - 435, 'Province', app.address?.province],
  ];
  addrCols.forEach(([x, w, cap, v]) => {
    value(v, x, y + 7, { width: w - 4 });
    doc.moveTo(x, y + 20).lineTo(x + w - 6, y + 20).stroke();
    label(cap, x, y + 22);
  });
  y += 32;

  // Fishing ground / FMA / full or part time
  cell(M, y, 175, 26, 'Fishing Ground:', app.fishingGround);
  cell(M + 175, y, 90, 26, 'FMA Number:', app.fmaNumber);
  box(M + 265, y, W - 265, 26);
  check(app.employment === 'full_time', 'Full Time', M + 290, y + 9);
  check(app.employment === 'part_time', 'Part Time', M + 410, y + 9);
  y += 26;

  cell(M, y, 265, 28, 'Contact No. (Cellphone, Telephone)', app.contactNo);
  cell(M + 265, y, W - 265, 28, 'Resident of Municipality since (Indicate the year)', app.residentSince);
  y += 28;

  cell(M, y, 70, 28, 'Age', ageOf(app.birthDate));
  cell(M + 70, y, 195, 28, 'Date of Birth (MM-DD-YYYY)', fmtDate(app.birthDate));
  cell(M + 265, y, W - 265, 28, 'Place of Birth (Municipality, Province)', app.placeOfBirth);
  y += 28;

  // Sex / civil status / children
  box(M, y, 160, 34);
  label('Sex', M + 3, y + 2);
  check(app.sex === 'male', 'Male', M + 8, y + 17);
  check(app.sex === 'female', 'Female', M + 70, y + 17);
  box(M + 160, y, 230, 34);
  label('Civil Status', M + 163, y + 2);
  check(app.civilStatus === 'single', 'Single', M + 166, y + 12);
  check(app.civilStatus === 'married', 'Married', M + 166, y + 23);
  check(app.civilStatus === 'legally_separated', 'Legally Separated', M + 260, y + 12);
  check(app.civilStatus === 'widowed', 'Widowed', M + 260, y + 23);
  cell(M + 390, y, W - 390, 34, 'No. of Children', app.childrenCount);
  y += 34;

  // Household
  const hh = app.household || {};
  box(M, y, W, 42);
  const hhRow = (cap, v, x, yy) => {
    label(cap, x, yy + 1);
    value(v, x + 85, yy, { width: 60 });
  };
  hhRow('Total No. of Households:', hh.total, M + 4, y + 4);
  hhRow('No. of Male:', hh.male, M + 4, y + 16);
  hhRow('No. of Female:', hh.female, M + 4, y + 28);
  hhRow('No. of In-School:', hh.inSchool, M + 190, y + 16);
  hhRow('No. of Out-of-School:', hh.outOfSchool, M + 190, y + 28);
  hhRow('No. of Employed:', hh.employed, M + 370, y + 16);
  hhRow('No. of Unemployed:', hh.unemployed, M + 370, y + 28);
  y += 42;

  // Education
  box(M, y, W, 34);
  label('Educational Background', M + 3, y + 2);
  check(app.education === 'elementary', 'Elementary', M + 8, y + 13);
  check(app.education === 'high_school', 'High School', M + 8, y + 24);
  check(app.education === 'vocational', 'Vocational', M + 170, y + 13);
  check(app.education === 'college', 'College', M + 170, y + 24);
  check(app.education === 'post_graduate', 'Post-Graduate', M + 340, y + 13);
  check(app.education === 'others', `Others: ${app.education === 'others' ? val(app.educationOther) : ''}`, M + 340, y + 24);
  y += 34;

  // Nationality / religion
  const isFilipino = !app.nationality || /^filipino$/i.test(app.nationality);
  box(M, y, 265, 40);
  label('Nationality', M + 3, y + 2);
  check(isFilipino, 'Filipino', M + 8, y + 14);
  check(!isFilipino, `Others: ${isFilipino ? '' : val(app.nationality)}`, M + 8, y + 26);
  const RELIGIONS = ['Roman Catholic', 'Protestant Christian', 'Iglesia Ni Cristo', 'Aglipayan', 'Islam', 'No Religion'];
  const isOtherReligion = Boolean(app.religion) && !RELIGIONS.includes(app.religion);
  box(M + 265, y, W - 265, 40);
  label('Religion', M + 268, y + 2);
  RELIGIONS.forEach((r, i) => check(app.religion === r, r, M + 270 + (i % 3) * 90, y + 11 + Math.floor(i / 3) * 10));
  check(isOtherReligion, `Others: ${isOtherReligion ? app.religion : ''}`, M + 270, y + 31);
  y += 40;

  // Income
  box(M, y, 265, 44);
  label('HOUSEHOLD MONTHLY INCOME (PhP)', M + 3, y + 2);
  INCOME.forEach(([key, cap], i) => check(app.monthlyIncome === key, cap, M + 8 + (i % 3) * 85, y + 14 + Math.floor(i / 3) * 13));
  box(M + 265, y, W - 265, 44);
  label('Other Source of Income', M + 268, y + 2);
  label('Farming/Fishing:', M + 268, y + 24);
  value(app.otherIncomeSource, M + 330, y + 23, { width: 100 });
  label('Income Value:', M + 435, y + 24);
  value(app.otherIncomeValue !== undefined ? Number(app.otherIncomeValue).toLocaleString('en-PH') : '', M + 485, y + 23, { width: W - 487 });
  y += 44;

  // Emergency
  const em = app.emergency || {};
  box(M, y, 265, 52);
  label('Person to notify in case of emergency: (First Name, Last Name)', M + 3, y + 2);
  value(em.name, M + 6, y + 26, { width: 255 });
  cell(M + 265, y, 135, 24, 'Relationship:', em.relationship);
  cell(M + 400, y, W - 400, 24, 'Contact No.', em.contactNo);
  cell(M + 265, y + 24, W - 265, 28, 'Address: (Barangay, Municipality, Province)', em.address);
  y += 52;

  // Voter / 4Ps / IP
  box(M, y, 265, 30);
  label("With Voter's ID?", M + 3, y + 2);
  check(app.hasVoterId === true, 'Yes', M + 8, y + 12);
  check(app.hasVoterId === false, 'No', M + 8, y + 21);
  label('ID No.', M + 90, y + 14);
  value(app.voterIdNo, M + 115, y + 13, { width: 145 });
  box(M + 265, y, W - 265, 30);
  label('CCT/4Ps', M + 268, y + 2);
  check(app.cct4ps === true, 'Yes', M + 330, y + 8);
  check(app.cct4ps === false, 'No', M + 330, y + 19);
  y += 30;
  box(M, y, 265, 28);
  label('Indigenous Cultural Community (IP)?', M + 3, y + 2);
  check(app.indigenous === true, 'Yes', M + 8, y + 12);
  check(app.indigenous === false, 'No', M + 60, y + 12);
  box(M + 265, y, W - 265, 28);
  y += 28;

  // Barangay verification
  box(M, y, W, 44);
  label('Barangay Verification (verified true and corrected by)', M + 3, y + 2);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text('Punong Barangay', M + 330, y + 22, { width: 120, align: 'center' });
  [
    [M + 10, 150, 'Signature'],
    [M + 170, 150, 'Name'],
    [M + 330, 120, 'Position'],
    [M + 460, W - 465, 'Date'],
  ].forEach(([x, w, cap]) => {
    doc.moveTo(x, y + 33).lineTo(x + w, y + 33).stroke();
    label(cap, x, y + 35, { width: w });
  });

  // ---------- Page 2 ----------
  doc.addPage();
  y = M;
  y = bar(y, '2. LIVELIHOOD');
  const half = W / 2;
  const sourceColumn = (title, list, x) => {
    label(title, x + 4, y + 4, { size: 9 });
    Object.entries(SOURCE_LABEL).forEach(([key, cap], i) => {
      const found = (list || []).find((s) => s.type === key);
      const yy = y + 20 + i * 15;
      check(!!found, cap, x + 8, yy);
      if (found?.details) value(found.details, x + 165, yy - 1, { width: half - 175, size: 8.5 });
      doc.moveTo(x + 165, yy + 9).lineTo(x + half - 8, yy + 9).stroke();
    });
  };
  box(M, y, half, 112);
  box(M + half, y, half, 112);
  sourceColumn('Main Source of Income:', app.mainSources, M);
  sourceColumn('Other Sources of Income:', app.otherSources, M + half);
  y += 112;

  y = bar(y, '3. ORGANIZATION');
  const orgCols = [[M, 240, 'Name of Organization'], [M + 240, 120, 'Member Since'], [M + 360, W - 360, 'Position/Official Designation']];
  orgCols.forEach(([x, w, cap]) => {
    box(x, y, w, 16);
    label(cap, x + 4, y + 4, { size: 8 });
  });
  y += 16;
  const orgs = app.organizations || [];
  for (let i = 0; i < 5; i += 1) {
    const o = orgs[i] || {};
    orgCols.forEach(([x, w], c) => {
      box(x, y, w, 18);
      value([o.name, o.memberSince, o.position][c], x + 4, y + 5, { width: w - 8, size: 8.5 });
    });
    y += 18;
  }

  y = bar(y + 8, '4. CERTIFICATION');
  doc.rect(M + W - 120, y - 14, 120, 14).fill(BLUE);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff').text('THUMBMARK', M + W - 120, y - 11, { width: 120, align: 'center' });
  box(M, y, W - 120, 110);
  box(M + W - 120, y, 120, 110);
  doc.font('Helvetica').fontSize(9).fillColor(INK).text(
    'I have personally reviewed the information on this application and I certify under penalty of perjury that to the best of my knowledge and belief the information on this application is true and correct, and that I understand this information is subject to public.',
    M + 10,
    y + 10,
    { width: W - 140, align: 'justify' }
  );
  const fullName = [app.firstName, app.middleName, app.lastName, app.appellation].filter(Boolean).join(' ').toUpperCase();
  value(fullName, M + 10, y + 72, { width: 230 });
  doc.moveTo(M + 10, y + 86).lineTo(M + 240, y + 86).stroke();
  label('(Signature over printed name of Applicant)', M + 10, y + 89);
  value(fmtDate(app.dateAccomplished), M + 270, y + 72, { width: 130 });
  doc.moveTo(M + 270, y + 86).lineTo(M + 400, y + 86).stroke();
  label('Date Accomplished', M + 270, y + 89);
  y += 110;

  y = bar(y + 8, '5. FOR AUTHORIZED PERSONNEL ONLY');
  const third = W / 3;
  [
    ['Reviewed by:', app.reviewedBy, 'MFARMC Chairman'],
    ['Certified correct by:', app.certifiedBy, 'MFARMC Coordinator'],
    ['Approved by:', app.approvedBy, 'Municipal Agriculturist'],
  ].forEach(([cap, name, title], i) => {
    const x = M + third * i;
    box(x, y, third, 90);
    label(cap, x + 5, y + 4, { size: 8.5 });
    label('(Signature over printed name)', x + 5, y + 15);
    value((name || '').toUpperCase(), x + 8, y + 55, { width: third - 16 });
    doc.moveTo(x + 8, y + 68).lineTo(x + third - 8, y + 68).stroke();
    doc.font('Helvetica').fontSize(8.5).fillColor(INK).text(title, x, y + 72, { width: third, align: 'center' });
  });
  y += 90;

  doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text('MFRS FORM', M, y + 16, { lineBreak: false });
  doc.text('Generated by AquaTrack', M, y + 16, { width: W, align: 'right' });

  doc.end();
}

module.exports = { writeApplicationPdf };
