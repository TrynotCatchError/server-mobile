const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const { getLogoPath } = require('./helpers');

// Function to generate QR code with local logo overlay
async function generateQRWithLogo(data, size = 300) {
  try {
    console.log('Generating QR with local logo for data:', data);
    
    // Get logo path from config
    const logoPath = getLogoPath();
    
    // Check if logo file exists
    if (!fs.existsSync(logoPath)) {
      console.error('Logo file not found at:', logoPath);
      return null;
    }
    
    // Generate base QR code with high error correction
    const qrCodeBuffer = await QRCode.toBuffer(data, {
      errorCorrectionLevel: 'H',
      type: 'png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: size
    });
    
    // Create canvas
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Load and draw QR code
    const qrImage = await loadImage(qrCodeBuffer);
    ctx.drawImage(qrImage, 0, 0, size, size);
    
    // Load logo from local file
    try {
      console.log('Loading logo from local file:', logoPath);
      const logoImage = await loadImage(logoPath);
      
      // Calculate logo size (about 15% of QR code size to ensure scannability)
      const logoSize = Math.floor(size * 0.15);
      const logoX = (size - logoSize) / 2;
      const logoY = (size - logoSize) / 2;
      
      // Draw white background circle for logo (slightly larger than logo)
      const bgRadius = logoSize / 2 + 8;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, bgRadius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw subtle shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.beginPath();
      ctx.arc(size / 2 + 1, size / 2 + 1, bgRadius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw white background again (on top of shadow)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, bgRadius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw logo
      ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
      
      // Optional: Add subtle border around logo area
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, bgRadius, 0, 2 * Math.PI);
      ctx.stroke();
      
      console.log('Logo overlay completed successfully');
      
    } catch (logoError) {
      console.error('Error loading/drawing logo:', logoError);
    }
    
    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL('image/png');
    console.log('QR code with logo generated successfully');
    
    return dataUrl;
    
  } catch (error) {
    console.error('Error generating QR with logo:', error);
    return null;
  }
}

module.exports = {
  generateQRWithLogo
};