const ProductionCycle = require('../models/ProductionCycle');
const { ApiError } = require('../middleware/errorHandler');
const { computeHarvestEstimate } = require('./calculations');

// Fish currently in the pond: what remains in every active batch.
async function getPondFishCount(fishpondId) {
  const cycles = await ProductionCycle.find({ fishpond: fishpondId, status: 'active' }).populate('species');
  const estimates = await Promise.all(cycles.map((c) => computeHarvestEstimate(c)));
  return estimates.reduce((sum, e) => sum + e.currentCount, 0);
}

// Rejects adding `adding` fish when it would go past the fishpond's capacity.
// Fishponds without a capacity set are not limited.
async function assertWithinCapacity(fishpond, adding) {
  if (!fishpond.capacity) return;
  const current = await getPondFishCount(fishpond._id);
  const room = Math.max(fishpond.capacity - current, 0);
  if (Number(adding) > room) {
    throw new ApiError(
      400,
      `${fishpond.name} can hold up to ${fishpond.capacity.toLocaleString('en-PH')} fish and already has ${current.toLocaleString('en-PH')}, so you can add at most ${room.toLocaleString('en-PH')} more.`
    );
  }
}

module.exports = { getPondFishCount, assertWithinCapacity };
