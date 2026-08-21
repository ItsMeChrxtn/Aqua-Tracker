const Species = require('../models/Species');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLog');

const listSpecies = asyncHandler(async (req, res) => {
  const { waterType, activeOnly } = req.query;
  const filter = {};
  if (waterType) filter.waterType = waterType;
  if (activeOnly === 'true') filter.isActive = true;

  const species = await Species.find(filter).sort({ name: 1 });
  res.json({ success: true, species });
});

const getSpecies = asyncHandler(async (req, res) => {
  const species = await Species.findById(req.params.id);
  if (!species) throw new ApiError(404, 'Species not found');
  res.json({ success: true, species });
});

const validateWeights = (min, max) => {
  if (min === undefined || max === undefined) throw new ApiError(400, 'Recommended harvest weight (min and max) is required');
  if (Number(min) <= 0 || Number(max) <= 0) throw new ApiError(400, 'Recommended harvest weight must be greater than zero');
  if (Number(min) > Number(max)) throw new ApiError(400, 'Minimum recommended weight cannot exceed the maximum');
};

const createSpecies = asyncHandler(async (req, res) => {
  const { name, waterType, recommendedHarvestWeightMin, recommendedHarvestWeightMax, typicalGrowoutDays, notes } = req.body;

  if (!name || !waterType) throw new ApiError(400, 'Name and water type are required');
  if (!['freshwater', 'saltwater', 'brackish'].includes(waterType)) {
    throw new ApiError(400, 'Water type must be freshwater, saltwater, or brackish');
  }
  validateWeights(recommendedHarvestWeightMin, recommendedHarvestWeightMax);

  const existing = await Species.findOne({ name: new RegExp(`^${name}$`, 'i') });
  if (existing) throw new ApiError(409, 'A species with this name already exists');

  const species = await Species.create({
    name,
    waterType,
    recommendedHarvestWeightMin,
    recommendedHarvestWeightMax,
    typicalGrowoutDays,
    notes,
    createdBy: req.user._id,
  });

  await logActivity(req, { action: 'CREATE', targetType: 'Species', targetId: species._id, details: `Added species ${species.name}` });

  res.status(201).json({ success: true, species });
});

const updateSpecies = asyncHandler(async (req, res) => {
  const species = await Species.findById(req.params.id);
  if (!species) throw new ApiError(404, 'Species not found');

  const { name, waterType, recommendedHarvestWeightMin, recommendedHarvestWeightMax, typicalGrowoutDays, notes, isActive } = req.body;

  if (waterType !== undefined) {
    if (!['freshwater', 'saltwater', 'brackish'].includes(waterType)) {
      throw new ApiError(400, 'Water type must be freshwater, saltwater, or brackish');
    }
    species.waterType = waterType;
  }
  const nextMin = recommendedHarvestWeightMin !== undefined ? recommendedHarvestWeightMin : species.recommendedHarvestWeightMin;
  const nextMax = recommendedHarvestWeightMax !== undefined ? recommendedHarvestWeightMax : species.recommendedHarvestWeightMax;
  if (recommendedHarvestWeightMin !== undefined || recommendedHarvestWeightMax !== undefined) {
    validateWeights(nextMin, nextMax);
    species.recommendedHarvestWeightMin = nextMin;
    species.recommendedHarvestWeightMax = nextMax;
  }

  if (name !== undefined) species.name = name;
  if (typicalGrowoutDays !== undefined) species.typicalGrowoutDays = typicalGrowoutDays;
  if (notes !== undefined) species.notes = notes;
  if (isActive !== undefined) species.isActive = isActive;

  await species.save();
  await logActivity(req, { action: 'UPDATE', targetType: 'Species', targetId: species._id, details: `Updated species ${species.name}` });

  res.json({ success: true, species });
});

const deleteSpecies = asyncHandler(async (req, res) => {
  const species = await Species.findById(req.params.id);
  if (!species) throw new ApiError(404, 'Species not found');

  await species.deleteOne();
  await logActivity(req, { action: 'DELETE', targetType: 'Species', targetId: req.params.id, details: `Deleted species ${species.name}` });

  res.json({ success: true, message: 'Species deleted' });
});

module.exports = { listSpecies, getSpecies, createSpecies, updateSpecies, deleteSpecies };
