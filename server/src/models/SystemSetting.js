const mongoose = require('mongoose');

// Singleton document holding municipality/office info shown on reports and settings pages.
const systemSettingSchema = new mongoose.Schema(
  {
    municipalityName: { type: String, default: 'Noveleta, Cavite' },
    officeName: { type: String, default: 'Office of the Agricultural Services (OAS)' },
    officeContactEmail: { type: String, default: '' },
    officePhone: { type: String, default: '' },
    officeAddress: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
