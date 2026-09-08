const cloudinary = require('cloudinary').v2;

// ✅ ADDED: .trim() guards against a very common copy-paste mistake —
// an accidental trailing space or newline character when pasting the
// API Secret from the Cloudinary dashboard into Render's environment
// variable field. Even one invisible extra character here causes
// Cloudinary's "Invalid Signature" error, since the secret no longer
// matches exactly.
cloudinary.config({
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  api_key:    (process.env.CLOUDINARY_API_KEY || '').trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
});

module.exports = cloudinary;