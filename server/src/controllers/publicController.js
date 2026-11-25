const FisherfolkApplication = require('../models/FisherfolkApplication');
const Fishpond = require('../models/Fishpond');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');

// GET /api/public/verify/:code — no login. Shows only what is needed to
// confirm a registration is genuine (no contact details or addresses).
const verify = asyncHandler(async (req, res) => {
  const code = String(req.params.code || '');
  if (!/^[\w-]{8,32}$/.test(code)) throw new ApiError(404, 'No registration matches this QR code');

  const app = await FisherfolkApplication.findOne({ verifyCode: code });
  if (app) {
    return res.json({
      success: true,
      record: {
        type: 'fisherfolk',
        valid: app.status === 'approved',
        status: app.status,
        name: [app.firstName, app.middleName, app.lastName, app.appellation].filter(Boolean).join(' '),
        registrationNo: app.registrationNo,
        registrationDate: app.registrationDate,
        registrationType: app.registrationType,
        barangay: app.address?.barangay,
        municipality: app.address?.municipality || 'Noveleta',
        photoUrl: app.photoUrl,
      },
    });
  }

  const pond = await Fishpond.findOne({ verifyCode: code }).populate('owner', 'name');
  if (pond) {
    return res.json({
      success: true,
      record: {
        type: 'fishpond',
        valid: pond.status === 'approved',
        status: pond.status,
        name: pond.name,
        owner: pond.owner?.name,
        barangay: pond.barangay,
        areaSize: pond.areaSize,
        approvedAt: pond.approvedAt,
      },
    });
  }
  throw new ApiError(404, 'No registration matches this QR code');
});

module.exports = { verify };
