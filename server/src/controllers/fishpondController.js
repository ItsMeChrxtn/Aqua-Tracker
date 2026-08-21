const Fishpond = require('../models/Fishpond');
const ProductionCycle = require('../models/ProductionCycle');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLog');
const { createNotification } = require('../utils/notify');

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

const registerFishpond = asyncHandler(async (req, res) => {
  const { name, barangay, areaSize } = req.body;
  if (!name || !barangay) throw new ApiError(400, 'Fishpond name and barangay are required');

  const fishpond = await Fishpond.create({
    owner: req.user._id,
    name,
    barangay,
    areaSize,
    imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
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

  const { name, barangay, areaSize } = req.body;
  if (name !== undefined) fishpond.name = name;
  if (barangay !== undefined) fishpond.barangay = barangay;
  if (areaSize !== undefined) fishpond.areaSize = areaSize;
  if (req.file) fishpond.imageUrl = `/uploads/${req.file.filename}`;

  await fishpond.save();
  await logActivity(req, { action: 'UPDATE', targetType: 'Fishpond', targetId: fishpond._id, details: `Updated fishpond ${fishpond.name}` });

  res.json({ success: true, fishpond });
});

const deleteFishpond = asyncHandler(async (req, res) => {
  const fishpond = await Fishpond.findById(req.params.id);
  if (!fishpond) throw new ApiError(404, 'Fishpond not found');

  const isOwner = fishpond.owner.equals(req.user._id);
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) throw new ApiError(403, 'You do not have access to this fishpond');

  const activeCycles = await ProductionCycle.countDocuments({ fishpond: fishpond._id, status: 'active' });
  if (activeCycles > 0) throw new ApiError(400, 'Cannot delete a fishpond with an active production cycle');

  await fishpond.deleteOne();
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
