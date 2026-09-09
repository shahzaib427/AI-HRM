// Shared Cloudinary upload config for profile pictures — used by
// admin, employee, and hr routes so all three stay in sync and none
// of them write to local disk (which gets wiped on every Render
// restart/redeploy/idle spin-down).
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary'); // adjust path if your cloudinary config lives elsewhere

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'profile-pictures',
    public_id: `profile-${req.user.id}-${Date.now()}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
  })
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(file.originalname.split('.').pop().toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});

module.exports = upload;