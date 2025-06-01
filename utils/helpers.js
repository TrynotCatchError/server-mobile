// const config = require('../config/config');

// // Helper function to get image URL
// function getImageUrl(imageName, req) {
//   if (!imageName || imageName === 'no_image.png' || imageName === '') {
//     return null;
//   }
//   return `${req.protocol}://${req.get('host')}/uploads/${imageName}`;
// }

// // Helper function to get logo path
// function getLogoPath() {
//   return config.assets.logoPath;
// }

// // Helper function to get uploads path
// function getUploadsPath() {
//   return config.assets.uploadsPath;
// }

// module.exports = {
//   getImageUrl,
//   getLogoPath,
//   getUploadsPath
// };









// const getImageUrl = (imageName, req) => {
//   if (!imageName || imageName === 'no_image.png' || imageName === '') {
//     return `${req.protocol}://${req.get('host')}/assets/no_image.png`;
//   }
  
//   // Check if it's already a full URL
//   if (imageName.startsWith('http://') || imageName.startsWith('https://')) {
//     return imageName;
//   }
  
//   // Construct the full URL
//   return `${req.protocol}://${req.get('host')}/uploads/${imageName}`;
// };

// const formatCurrency = (amount, currency = 'THB') => {
//   return new Intl.NumberFormat('th-TH', {
//     style: 'currency',
//     currency: currency
//   }).format(amount);
// };

// const formatDate = (date, format = 'YYYY-MM-DD') => {
//   const d = new Date(date);
//   const year = d.getFullYear();
//   const month = String(d.getMonth() + 1).padStart(2, '0');
//   const day = String(d.getDate()).padStart(2, '0');
  
//   switch (format) {
//     case 'DD/MM/YYYY':
//       return `${day}/${month}/${year}`;
//     case 'MM/DD/YYYY':
//       return `${month}/${day}/${year}`;
//     case 'YYYY-MM-DD':
//     default:
//       return `${year}-${month}-${day}`;
//   }
// };

// const calculatePercentage = (value, total) => {
//   if (total === 0) return 0;
//   return ((value / total) * 100).toFixed(2);
// };

// module.exports = {
//   getImageUrl,
//   formatCurrency,
//   formatDate,
//   calculatePercentage
// };



const config = require('../config/config');






const getImageUrl = (imageName, req) => {
  if (!imageName || imageName === 'no_image.png' || imageName === '') {
    return `${req.protocol}://${req.get('host')}/assets/no_image.png`;
  }
  
  // Check if it's already a full URL
  if (imageName.startsWith('http://') || imageName.startsWith('https://')) {
    return imageName;
  }
  
  // Construct the full URL
  return `${req.protocol}://${req.get('host')}/uploads/${imageName}`;
};

const formatCurrency = (amount, currency = 'THB') => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

const formatDate = (date, format = 'YYYY-MM-DD') => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
    default:
      return `${year}-${month}-${day}`;
  }
};


 // Helper function to get logo path
function getLogoPath() {
  return config.assets.logoPath;
}

// Helper function to get uploads path
function getUploadsPath() {
  return config.assets.uploadsPath;
}








const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return ((value / total) * 100).toFixed(2);
};

module.exports = {
  getImageUrl,
  formatCurrency,
  formatDate,
  calculatePercentage,
  getLogoPath,
  getUploadsPath
};
