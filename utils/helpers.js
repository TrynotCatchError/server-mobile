const config = require('../config/config');

// Helper function to get image URL
function getImageUrl(imageName, req) {
  if (!imageName || imageName === 'no_image.png' || imageName === '') {
    return null;
  }
  return `${req.protocol}://${req.get('host')}/uploads/${imageName}`;
}

// Helper function to get logo path
function getLogoPath() {
  return config.assets.logoPath;
}

// Helper function to get uploads path
function getUploadsPath() {
  return config.assets.uploadsPath;
}

module.exports = {
  getImageUrl,
  getLogoPath,
  getUploadsPath
};