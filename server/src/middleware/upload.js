const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ApiError } = require('./errorHandler');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

const IMAGE_TYPES = /^image\/(png|jpe?g|webp|gif)$/i;
// MOA / SPA may be a photo of the paper or the document file itself.
const DOCUMENT_TYPES = /^(image\/(png|jpe?g|webp|gif)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/i;
const DOCUMENT_FIELDS = ['moa', 'spa', 'barangayCert'];

const fileFilter = (req, file, cb) => {
  if (DOCUMENT_FIELDS.includes(file.fieldname)) {
    if (DOCUMENT_TYPES.test(file.mimetype)) return cb(null, true);
    return cb(new ApiError(400, 'MOA, SPA and Barangay Certification must be a photo (png, jpg, webp) or a PDF / Word file'));
  }
  if (IMAGE_TYPES.test(file.mimetype)) return cb(null, true);
  return cb(new ApiError(400, 'Only image files (png, jpg, webp, gif) are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = upload;
