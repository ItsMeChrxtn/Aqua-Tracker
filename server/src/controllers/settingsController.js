const SystemSetting = require('../models/SystemSetting');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLog');

async function getOrCreateSettings() {
  let settings = await SystemSetting.findOne();
  if (!settings) settings = await SystemSetting.create({});
  return settings;
}

const getSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json({ success: true, settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  const { municipalityName, officeName, officeContactEmail, officePhone, officeAddress } = req.body;

  if (municipalityName !== undefined) settings.municipalityName = municipalityName;
  if (officeName !== undefined) settings.officeName = officeName;
  if (officeContactEmail !== undefined) settings.officeContactEmail = officeContactEmail;
  if (officePhone !== undefined) settings.officePhone = officePhone;
  if (officeAddress !== undefined) settings.officeAddress = officeAddress;

  await settings.save();
  await logActivity(req, { action: 'UPDATE', targetType: 'SystemSetting', targetId: settings._id, details: 'Updated system settings' });

  res.json({ success: true, settings });
});

module.exports = { getSettings, updateSettings };
