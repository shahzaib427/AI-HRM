// ✅ REWRITTEN: previously used multer.diskStorage() to save resumes to a
// local folder (backend/uploads/resumes). On Render, that folder is wiped
// every time the service redeploys or restarts (free tier especially),
// which caused resumes to silently disappear while MongoDB still pointed
// to the now-deleted file (leading to confusing 404s on "Run ATS" / "View
// Resume").
//
// Now files are uploaded directly to Cloudinary, which is permanent cloud
// storage — resumes survive redeploys, restarts, and scaling events.
//
// Requires these environment variables to be set (see Cloudinary dashboard):
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'hrm-resumes',
    // 'raw' resource type is required for non-image files like PDF/DOC/DOCX —
    // Cloudinary's default 'image' type would reject or mishandle them.
    resource_type: 'raw',
    // Keep the original filename (minus extension) plus a timestamp, so
    // files are still easy to identify in the Cloudinary dashboard.
    public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`,
  }),
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const path = require('path');
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext) || allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  } else {
    console.log('❌ Rejected file:', file.originalname, 'mime:', file.mimetype);
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter
});

module.exports = upload;