const { ApiError } = require('../middleware/errorHandler');
const Fishpond = require('../models/Fishpond');
const ProductionCycle = require('../models/ProductionCycle');

const isStaff = (user) => ['agriculture_staff', 'admin'].includes(user.role);

async function loadFishpondWithAccess(user, fishpondId) {
  const fishpond = await Fishpond.findById(fishpondId);
  if (!fishpond) throw new ApiError(404, 'Fishpond not found');
  if (user.role === 'fishpond_owner' && !fishpond.owner.equals(user._id)) {
    throw new ApiError(403, 'You do not have access to this fishpond');
  }
  return fishpond;
}

async function loadCycleWithAccess(user, cycleId) {
  const cycle = await ProductionCycle.findById(cycleId).populate('fishpond').populate('species');
  if (!cycle) throw new ApiError(404, 'Production cycle not found');
  if (user.role === 'fishpond_owner' && !cycle.fishpond.owner.equals(user._id)) {
    throw new ApiError(403, 'You do not have access to this production cycle');
  }
  return cycle;
}

module.exports = { isStaff, loadFishpondWithAccess, loadCycleWithAccess };
