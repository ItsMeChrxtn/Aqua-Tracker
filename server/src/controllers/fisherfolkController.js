const FisherfolkApplication = require('../models/FisherfolkApplication');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLog');
const { createNotification } = require('../utils/notify');
const { assertValidPhone, todayInManila } = require('../utils/validation');
const { writeApplicationPdf } = require('../utils/fisherfolkPdf');
const { newVerifyCode, ensureVerifyCode, qrPng, verifyUrl } = require('../utils/verification');

const { SOURCE_TYPES } = FisherfolkApplication;
const STAFF = ['agriculture_staff', 'admin'];

const text = (v) => (v === undefined || v === null ? '' : String(v).trim());
const num = (v) => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new ApiError(400, 'Numbers in the form cannot be negative');
  return n;
};
const bool = (v) => (v === true || v === 'true' ? true : v === false || v === 'false' ? false : undefined);
const date = (v) => {
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, 'A date in the form is not valid');
  return d;
};

function sources(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((s) => s && SOURCE_TYPES.includes(s.type))
    .map((s) => ({ type: s.type, details: text(s.details) }));
}

// Only the fields the applicant fills in; staff-only fields are never taken from here.
function pickOwnerFields(body) {
  const a = body.address || {};
  const h = body.household || {};
  const e = body.emergency || {};
  [body.contactNo, e.contactNo].forEach(assertValidPhone);

  const residentSince = num(body.residentSince);
  if (residentSince !== undefined && (residentSince < 1900 || residentSince > Number(todayInManila().slice(0, 4)))) {
    throw new ApiError(400, 'Resident since must be a valid year');
  }
  const birthDate = date(body.birthDate);
  if (birthDate && birthDate > new Date()) throw new ApiError(400, 'Date of birth cannot be in the future');

  return {
    registrationType: text(body.registrationType) || undefined,
    salutation: text(body.salutation),
    lastName: text(body.lastName),
    firstName: text(body.firstName),
    middleName: text(body.middleName),
    appellation: text(body.appellation),
    address: {
      street: text(a.street),
      barangay: text(a.barangay),
      municipality: text(a.municipality) || 'Noveleta',
      province: text(a.province) || 'Cavite',
    },
    fishingGround: text(body.fishingGround),
    fmaNumber: text(body.fmaNumber),
    employment: text(body.employment),
    contactNo: text(body.contactNo),
    residentSince,
    birthDate,
    placeOfBirth: text(body.placeOfBirth),
    sex: text(body.sex),
    civilStatus: text(body.civilStatus),
    childrenCount: num(body.childrenCount),
    household: {
      total: num(h.total),
      male: num(h.male),
      female: num(h.female),
      inSchool: num(h.inSchool),
      outOfSchool: num(h.outOfSchool),
      employed: num(h.employed),
      unemployed: num(h.unemployed),
    },
    education: text(body.education),
    educationOther: text(body.educationOther),
    nationality: text(body.nationality) || 'Filipino',
    religion: text(body.religion),
    monthlyIncome: text(body.monthlyIncome),
    otherIncomeSource: text(body.otherIncomeSource),
    otherIncomeValue: num(body.otherIncomeValue),
    emergency: {
      name: text(e.name),
      relationship: text(e.relationship),
      contactNo: text(e.contactNo),
      address: text(e.address),
    },
    hasVoterId: bool(body.hasVoterId),
    voterIdNo: text(body.voterIdNo),
    cct4ps: bool(body.cct4ps),
    indigenous: bool(body.indigenous),
    mainSources: sources(body.mainSources),
    otherSources: sources(body.otherSources),
    organizations: (Array.isArray(body.organizations) ? body.organizations : [])
      .map((o) => ({ name: text(o?.name), memberSince: text(o?.memberSince), position: text(o?.position) }))
      .filter((o) => o.name),
    certified: bool(body.certified) === true,
  };
}

// What must be answered before the application can be sent for review.
function missingForSubmit(app) {
  const missing = [];
  const need = (ok, label) => !ok && missing.push(label);
  need(app.registrationType, 'Type of registration');
  need(app.lastName, 'Last name');
  need(app.firstName, 'First name');
  need(app.address?.street, 'Street / Sitio');
  need(app.address?.barangay, 'Barangay');
  need(app.contactNo, 'Contact number');
  need(app.birthDate, 'Date of birth');
  need(app.placeOfBirth, 'Place of birth');
  need(app.sex, 'Sex');
  need(app.civilStatus, 'Civil status');
  need(app.education, 'Educational background');
  need(app.monthlyIncome, 'Household monthly income');
  need(app.emergency?.name, 'Emergency contact person');
  need(app.emergency?.relationship, 'Emergency contact relationship');
  need(app.emergency?.contactNo, 'Emergency contact number');
  need(app.mainSources?.length, 'Main source of income');
  need(app.photoUrl, '1x1 / 1.5x1.5 photo');
  need(app.barangayCertUrl, 'Barangay Certification of fishpond ownership');
  need(app.certified, 'Certification checkbox');
  return missing;
}

const uploaded = (file) => (file ? `/uploads/${file.filename}` : undefined);

async function findForUser(req, id) {
  const app = await FisherfolkApplication.findById(id).populate('owner', 'name email phone barangay');
  if (!app) throw new ApiError(404, 'Application not found');
  if (!STAFF.includes(req.user.role) && !app.owner._id.equals(req.user._id)) {
    throw new ApiError(403, 'You do not have access to this application');
  }
  return app;
}

// GET /api/fisherfolk/me
const getMine = asyncHandler(async (req, res) => {
  const application = await ensureVerifyCode(await FisherfolkApplication.findOne({ owner: req.user._id }));
  res.json({ success: true, application });
});

// PUT /api/fisherfolk/me  (multipart: data=<json>, photo, barangayCert; submit=true to send for review)
const saveMine = asyncHandler(async (req, res) => {
  let body;
  try {
    body = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
  } catch {
    throw new ApiError(400, 'The form data could not be read');
  }
  const submit = bool(req.body.submit) === true || body.submit === true;

  let app = await FisherfolkApplication.findOne({ owner: req.user._id });
  if (app && ['pending', 'approved'].includes(app.status)) {
    throw new ApiError(400, app.status === 'pending' ? 'Your application is already under review' : 'Your application has already been approved');
  }
  if (!app) app = new FisherfolkApplication({ owner: req.user._id });

  app.set(pickOwnerFields(body));
  const files = req.files || {};
  const [photo] = files.photo || [];
  const [cert] = files.barangayCert || [];
  if (photo) app.photoUrl = uploaded(photo);
  if (cert) {
    app.barangayCertUrl = uploaded(cert);
    app.barangayCertName = cert.originalname;
  }

  if (submit) {
    const missing = missingForSubmit(app);
    if (missing.length) throw new ApiError(400, `Please complete the following before submitting: ${missing.join(', ')}`);
    app.status = 'pending';
    app.submittedAt = new Date();
    app.dateAccomplished = new Date();
    app.remarks = undefined;
  } else if (app.status !== 'rejected') {
    app.status = 'draft';
  }

  await app.save();
  await logActivity(req, {
    action: submit ? 'SUBMIT' : 'UPDATE',
    targetType: 'FisherfolkApplication',
    targetId: app._id,
    details: submit ? 'Submitted fisherfolk registration application' : 'Saved fisherfolk registration draft',
  });

  res.json({ success: true, application: app });
});

// GET /api/fisherfolk?status=
const listApplications = asyncHandler(async (req, res) => {
  const filter = { status: { $ne: 'draft' } };
  if (req.query.status) filter.status = req.query.status;
  const applications = await FisherfolkApplication.find(filter)
    .populate('owner', 'name email phone barangay')
    .sort({ submittedAt: -1, updatedAt: -1 });
  res.json({ success: true, applications });
});

const getApplication = asyncHandler(async (req, res) => {
  const application = await ensureVerifyCode(await findForUser(req, req.params.id));
  res.json({ success: true, application });
});

// Next free Registration No. for this year: FR-2026-0001, FR-2026-0002, …
async function nextRegistrationNo() {
  const prefix = `FR-${new Date().getFullYear()}-`;
  let n = (await FisherfolkApplication.countDocuments({ registrationNo: { $regex: `^${prefix}` } })) + 1;
  while (await FisherfolkApplication.exists({ registrationNo: `${prefix}${String(n).padStart(4, '0')}` })) n += 1;
  return `${prefix}${String(n).padStart(4, '0')}`;
}

// PATCH /api/fisherfolk/:id/approve — the Registration No. is given
// automatically when the staff does not enter one.
const approveApplication = asyncHandler(async (req, res) => {
  const app = await FisherfolkApplication.findById(req.params.id);
  if (!app) throw new ApiError(404, 'Application not found');
  if (app.status !== 'pending') throw new ApiError(400, 'Only applications under review can be approved');

  let registrationNo = text(req.body.registrationNo);
  if (registrationNo) {
    const taken = await FisherfolkApplication.exists({ _id: { $ne: app._id }, registrationNo });
    if (taken) throw new ApiError(400, 'That Registration No. is already used by another fisherfolk');
  } else {
    registrationNo = await nextRegistrationNo();
  }

  app.status = 'approved';
  app.verifyCode = app.verifyCode || newVerifyCode();
  app.registrationNo = registrationNo;
  app.registrationDate = date(req.body.registrationDate) || new Date();
  app.reviewedBy = text(req.body.reviewedBy);
  app.certifiedBy = text(req.body.certifiedBy);
  app.approvedBy = text(req.body.approvedBy);
  app.remarks = undefined;
  app.processedBy = req.user._id;
  app.processedAt = new Date();
  await app.save();

  await createNotification({
    user: app.owner,
    type: 'registration_approved',
    message: `Your fisherfolk registration has been approved. Registration No. ${registrationNo}.`,
  });
  await logActivity(req, { action: 'APPROVE', targetType: 'FisherfolkApplication', targetId: app._id, details: `Approved fisherfolk registration ${registrationNo}` });

  res.json({ success: true, application: app });
});

// PATCH /api/fisherfolk/:id/reject — returns the form to the owner for correction
const rejectApplication = asyncHandler(async (req, res) => {
  const reason = text(req.body.reason);
  if (!reason) throw new ApiError(400, 'Please give the reason so the owner knows what to correct');
  const app = await FisherfolkApplication.findById(req.params.id);
  if (!app) throw new ApiError(404, 'Application not found');
  if (app.status !== 'pending') throw new ApiError(400, 'Only applications under review can be returned');

  app.status = 'rejected';
  app.remarks = reason;
  app.processedBy = req.user._id;
  app.processedAt = new Date();
  await app.save();

  await createNotification({
    user: app.owner,
    type: 'registration_rejected',
    message: `Your fisherfolk registration was returned for correction. Reason: ${reason}`,
  });
  await logActivity(req, { action: 'REJECT', targetType: 'FisherfolkApplication', targetId: app._id, details: `Returned fisherfolk registration: ${reason}` });

  res.json({ success: true, application: app });
});

async function sendPdf(res, app) {
  await ensureVerifyCode(app);
  const qr = app.status === 'approved' && app.verifyCode ? { png: await qrPng(app.verifyCode), url: verifyUrl(app.verifyCode) } : null;
  const name = [app.lastName, app.firstName].filter(Boolean).join('_').replace(/[^\w-]+/g, '_') || 'application';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="FishR_Application_${name}.pdf"`);
  writeApplicationPdf(app, res, { qr });
}

const myPdf = asyncHandler(async (req, res) => {
  const app = await FisherfolkApplication.findOne({ owner: req.user._id });
  if (!app) throw new ApiError(404, 'You have not started your application yet');
  await sendPdf(res, app);
});

const applicationPdf = asyncHandler(async (req, res) => {
  await sendPdf(res, await findForUser(req, req.params.id));
});

module.exports = {
  getMine,
  saveMine,
  listApplications,
  getApplication,
  approveApplication,
  rejectApplication,
  myPdf,
  applicationPdf,
};
