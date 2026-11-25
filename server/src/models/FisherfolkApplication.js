const mongoose = require('mongoose');

// The owner's answers to the BFAR "Application for Municipal Fisherfolk
// Registration" (FishR) form. One per owner account; filled in after sign-up.
const SOURCE_TYPES = ['capture_fishing', 'aquaculture', 'fish_vending', 'gleaning', 'fish_processing', 'others'];

const sourceSchema = new mongoose.Schema(
  {
    type: { type: String, enum: SOURCE_TYPES, required: true },
    details: { type: String, trim: true }, // gear used, or what "others" is
  },
  { _id: false }
);

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    memberSince: { type: String, trim: true },
    position: { type: String, trim: true },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'draft' },

    registrationType: { type: String, enum: ['new', 'renewal', 'transferee'] },

    // 1. Personal information
    salutation: { type: String, enum: ['Mr', 'Ms', 'Mrs', ''] },
    lastName: { type: String, trim: true },
    firstName: { type: String, trim: true },
    middleName: { type: String, trim: true },
    appellation: { type: String, trim: true }, // Sr, Jr, III
    address: {
      street: { type: String, trim: true },
      barangay: { type: String, trim: true },
      municipality: { type: String, trim: true, default: 'Noveleta' },
      province: { type: String, trim: true, default: 'Cavite' },
    },
    fishingGround: { type: String, trim: true, default: 'Manila Bay' },
    fmaNumber: { type: String, trim: true, default: '6' },
    employment: { type: String, enum: ['full_time', 'part_time', ''] },
    contactNo: { type: String, trim: true },
    residentSince: { type: Number },
    birthDate: { type: Date },
    placeOfBirth: { type: String, trim: true },
    sex: { type: String, enum: ['male', 'female', ''] },
    civilStatus: { type: String, enum: ['single', 'married', 'legally_separated', 'widowed', ''] },
    childrenCount: { type: Number, min: 0 },

    household: {
      total: { type: Number, min: 0 },
      male: { type: Number, min: 0 },
      female: { type: Number, min: 0 },
      inSchool: { type: Number, min: 0 },
      outOfSchool: { type: Number, min: 0 },
      employed: { type: Number, min: 0 },
      unemployed: { type: Number, min: 0 },
    },

    education: { type: String, enum: ['elementary', 'high_school', 'vocational', 'college', 'post_graduate', 'others', ''] },
    educationOther: { type: String, trim: true },
    nationality: { type: String, trim: true, default: 'Filipino' },
    religion: { type: String, trim: true },

    monthlyIncome: { type: String, enum: ['below_5000', '5001_10000', '10001_20000', '20001_30000', '30001_40000', 'above_40000', ''] },
    otherIncomeSource: { type: String, trim: true }, // farming / fishing
    otherIncomeValue: { type: Number, min: 0 },

    emergency: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      contactNo: { type: String, trim: true },
      address: { type: String, trim: true },
    },

    hasVoterId: { type: Boolean },
    voterIdNo: { type: String, trim: true },
    cct4ps: { type: Boolean },
    indigenous: { type: Boolean },

    // 2. Livelihood
    mainSources: [sourceSchema],
    otherSources: [sourceSchema],

    // 3. Organization
    organizations: [organizationSchema],

    // 4. Certification
    certified: { type: Boolean, default: false },
    dateAccomplished: { type: Date },

    // Attachments
    photoUrl: { type: String },
    barangayCertUrl: { type: String },
    barangayCertName: { type: String },

    // 5. For authorized personnel only
    submittedAt: { type: Date },
    registrationNo: { type: String, trim: true },
    // Code behind the public QR verification link (set once approved).
    verifyCode: { type: String, unique: true, sparse: true },
    registrationDate: { type: Date },
    reviewedBy: { type: String, trim: true }, // MFARMC Chairman
    certifiedBy: { type: String, trim: true }, // MFARMC Coordinator
    approvedBy: { type: String, trim: true }, // Municipal Agriculturist
    remarks: { type: String, trim: true }, // reason when returned to the owner
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

applicationSchema.statics.SOURCE_TYPES = SOURCE_TYPES;

module.exports = mongoose.model('FisherfolkApplication', applicationSchema);
