const Fishpond = require('../models/Fishpond');
const ProductionCycle = require('../models/ProductionCycle');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLog');
const { createNotification } = require('../utils/notify');
const { getPondFishCount } = require('../utils/capacity');

const MAX_AREA_HECTARES = 100;
const SQUARE_METERS_PER_HECTARE = 10000;
const MAX_CAPACITY = 100000000;

const isSet = (value) => value !== undefined && value !== '';

// The barangays where fishponds can be registered.
const { ALLOWED_BARANGAYS: FISHPOND_BARANGAYS } = require('../utils/validation');

// Checked here rather than as schema `max` validators: Mongoose re-validates
// loaded fields on save, so a schema limit would block approving or editing
// any fishpond already saved with an out-of-range value.
function assertValidSize({ areaSize, capacity }) {
  if (isSet(areaSize)) {
    const area = Number(areaSize);
    if (!(area > 0 && area <= MAX_AREA_HECTARES * SQUARE_METERS_PER_HECTARE)) {
      throw new ApiError(400, `Area size must be greater than 0 and at most ${MAX_AREA_HECTARES} hectares`);
    }
  }
  if (isSet(capacity)) {
    const fish = Number(capacity);
    if (!(Number.isInteger(fish) && fish > 0 && fish <= MAX_CAPACITY)) {
      throw new ApiError(400, `Capacity must be a whole number from 1 to ${MAX_CAPACITY.toLocaleString('en-PH')}`);
    }
  }
}

// GET /api/fishponds?barangay=&status=&owner=
const listFishponds = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.user.role === 'fishpond_owner') {
    filter.owner = req.user._id;
  } else {
    // agriculture_staff / admin can see everything, optionally filtered
    if (req.query.owner) filter.owner = req.query.owner;
  }

  if (req.query.barangay) filter.barangay = req.query.barangay;
  if (req.query.status) filter.status = req.query.status;

  const fishponds = await Fishpond.find(filter)
    .populate('owner', 'name email phone barangay')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 });

  res.json({ success: true, fishponds });
});

const getFishpond = asyncHandler(async (req, res) => {
  const fishpond = await Fishpond.findById(req.params.id)
    .populate('owner', 'name email phone barangay')
    .populate('approvedBy', 'name');
  if (!fishpond) throw new ApiError(404, 'Fishpond not found');

  if (req.user.role === 'fishpond_owner' && !fishpond.owner._id.equals(req.user._id)) {
    throw new ApiError(403, 'You do not have access to this fishpond');
  }

  res.json({ success: true, fishpond });
});

const uploadedPath = (file) => (file ? `/uploads/${file.filename}` : undefined);

const registerFishpond = asyncHandler(async (req, res) => {
  const { name, barangay, address, areaSize, capacity } = req.body;
  const files = req.files || {};
  const [image] = files.image || [];
  const [moa] = files.moa || [];
  const [spa] = files.spa || [];
  if (!moa) throw new ApiError(400, 'Please attach the MOA (Memorandum of Agreement) before submitting');
  if (!name || !barangay || !String(address || '').trim()) throw new ApiError(400, 'Fishpond name, barangay, and address are required');
  if (!FISHPOND_BARANGAYS.includes(barangay)) {
    throw new ApiError(400, `Fishponds can only be registered in ${FISHPOND_BARANGAYS.join(', ')}.`);
  }
  assertValidSize({ areaSize, capacity });

  const fishpond = await Fishpond.create({
    owner: req.user._id,
    name,
    barangay,
    address,
    areaSize,
    capacity,
    imageUrl: uploadedPath(image),
    moaUrl: uploadedPath(moa),
    moaName: moa.originalname,
    spaUrl: uploadedPath(spa),
    spaName: spa ? spa.originalname : undefined,
    status: 'pending',
  });

  await logActivity(req, { action: 'CREATE', targetType: 'Fishpond', targetId: fishpond._id, details: `Registered fishpond ${fishpond.name}` });

  res.status(201).json({ success: true, fishpond });
});

const updateFishpond = asyncHandler(async (req, res) => {
  const fishpond = await Fishpond.findById(req.params.id);
  if (!fishpond) throw new ApiError(404, 'Fishpond not found');

  const isOwner = fishpond.owner.equals(req.user._id);
  const isStaff = ['agriculture_staff', 'admin'].includes(req.user.role);
  if (!isOwner && !isStaff) throw new ApiError(403, 'You do not have access to this fishpond');

  const { name, barangay, address, areaSize, capacity } = req.body;
  assertValidSize({ areaSize, capacity });
  if (name !== undefined && !String(name).trim()) throw new ApiError(400, 'Fishpond name is required');
  if (address !== undefined && !String(address).trim()) throw new ApiError(400, 'Address is required');
  // An older fishpond may keep its barangay, but a new choice must be an allowed one.
  if (barangay !== undefined && barangay !== fishpond.barangay && !FISHPOND_BARANGAYS.includes(barangay)) {
    throw new ApiError(400, `Barangay must be one of: ${FISHPOND_BARANGAYS.join(', ')}`);
  }
  if (isSet(capacity)) {
    const inPond = await getPondFishCount(fishpond._id);
    if (Number(capacity) < inPond) {
      throw new ApiError(400, `Capacity cannot be lower than the ${inPond.toLocaleString('en-PH')} fish already in the pond`);
    }
  }
  if (name !== undefined) fishpond.name = String(name).trim();
  if (barangay !== undefined) fishpond.barangay = barangay;
  if (address !== undefined) fishpond.address = String(address).trim();
  if (isSet(areaSize)) fishpond.areaSize = areaSize;
  if (isSet(capacity)) fishpond.capacity = capacity;
  if (req.file) fishpond.imageUrl = `/uploads/${req.file.filename}`;

  await fishpond.save();
  await logActivity(req, { action: 'UPDATE', targetType: 'Fishpond', targetId: fishpond._id, details: `Updated fishpond ${fishpond.name}` });

  res.json({ success: true, fishpond });
});

const deleteFishpond = asyncHandler(async (req, res) => {
  const fishpond = await Fishpond.findById(req.params.id);
  if (!fishpond) throw new ApiError(404, 'Fishpond not found');

  const isOwner = fishpond.owner.equals(req.user._id);
  const isStaffOrAdmin = req.user.role === 'admin' || req.user.role === 'agriculture_staff';
  if (!isOwner && !isStaffOrAdmin) throw new ApiError(403, 'You do not have access to this fishpond');

  const activeCycles = await ProductionCycle.countDocuments({ fishpond: fishpond._id, status: 'active' });
  if (activeCycles > 0) throw new ApiError(400, 'Cannot delete a fishpond with an active production cycle');

  await fishpond.deleteOne();
  if (!isOwner) {
    await createNotification({
      user: fishpond.owner,
      type: 'general',
      message: `Your fishpond "${fishpond.name}" was removed by the Municipal Agriculture Office.`,
    });
  }
  await logActivity(req, { action: 'DELETE', targetType: 'Fishpond', targetId: req.params.id, details: `Deleted fishpond ${fishpond.name}` });

  res.json({ success: true, message: 'Fishpond deleted' });
});

const approveFishpond = asyncHandler(async (req, res) => {
  const fishpond = await Fishpond.findById(req.params.id);
  if (!fishpond) throw new ApiError(404, 'Fishpond not found');
  if (fishpond.status !== 'pending') throw new ApiError(400, 'Only pending fishponds can be approved');

  fishpond.status = 'approved';
  fishpond.approvedBy = req.user._id;
  fishpond.approvedAt = new Date();
  await fishpond.save();

  await createNotification({
    user: fishpond.owner,
    fishpond: fishpond._id,
    type: 'registration_approved',
    message: `Your fishpond "${fishpond.name}" has been approved by the Agriculture Office.`,
  });
  await logActivity(req, { action: 'APPROVE', targetType: 'Fishpond', targetId: fishpond._id, details: `Approved fishpond ${fishpond.name}` });

  res.json({ success: true, fishpond });
});

const rejectFishpond = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const fishpond = await Fishpond.findById(req.params.id);
  if (!fishpond) throw new ApiError(404, 'Fishpond not found');
  if (fishpond.status !== 'pending') throw new ApiError(400, 'Only pending fishponds can be rejected');

  fishpond.status = 'rejected';
  fishpond.rejectionReason = reason;
  fishpond.approvedBy = req.user._id;
  fishpond.approvedAt = new Date();
  await fishpond.save();

  await createNotification({
    user: fishpond.owner,
    fishpond: fishpond._id,
    type: 'registration_rejected',
    message: `Your fishpond "${fishpond.name}" registration was rejected.${reason ? ` Reason: ${reason}` : ''}`,
  });
  await logActivity(req, { action: 'REJECT', targetType: 'Fishpond', targetId: fishpond._id, details: `Rejected fishpond ${fishpond.name}` });

  res.json({ success: true, fishpond });
});

module.exports = {
  listFishponds,
  getFishpond,
  registerFishpond,
  updateFishpond,
  deleteFishpond,
  approveFishpond,
  rejectFishpond,
};
