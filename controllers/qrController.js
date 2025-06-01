const db = require('../config/database');
const { getImageUrl } = require('../utils/helpers');
const { generateQRWithLogo } = require('../utils/qrGenerator');
const QRCode = require('qrcode');

// Generate QR code for product
const generateQR = async (req, res) => {
  const productId = req.params.productId;
  
  try {
    const query = `
      SELECT p.*, c.name as category_name, u.name as unit_name 
      FROM sma_products p 
      LEFT JOIN sma_categories c ON p.category_id = c.id 
      LEFT JOIN sma_units u ON p.unit = u.id 
      WHERE p.id = ?
    `;
    
    db.query(query, [productId], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const product = results[0];
      
      const simpleFormat = `#${product.code}`;
      const structuredFormat = {
        type: 'product',
        id: product.id,
        code: product.code,
        name: product.name,
        price: parseFloat(product.price) || 0,
        timestamp: new Date().toISOString()
      };
      
      try {
        console.log('Generating QR codes for product:', product.code);
        
        const simpleQRWithLogo = await generateQRWithLogo(simpleFormat, 300);
        const structuredQRWithLogo = await generateQRWithLogo(JSON.stringify(structuredFormat), 300);
        
        const simpleQRCode = await QRCode.toDataURL(simpleFormat, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          quality: 0.92,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          width: 256
        });
        
        const structuredQRCode = await QRCode.toDataURL(JSON.stringify(structuredFormat), {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          quality: 0.92,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          width: 256
        });
        
        res.json({
          success: true,
          product: {
            id: product.id,
            code: product.code,
            name: product.name,
            price: parseFloat(product.price) || 0,
            quantity: parseFloat(product.quantity) || 0,
            image_url: getImageUrl(product.image, req)
          },
          qrData: structuredFormat,
          simpleFormat: simpleFormat,
          qrCodes: {
            simple: {
              data: simpleFormat,
              image: simpleQRWithLogo || simpleQRCode,
              imageWithLogo: simpleQRWithLogo,
              imageSimple: simpleQRCode
            },
            structured: {
              data: JSON.stringify(structuredFormat),
              image: structuredQRWithLogo || structuredQRCode,
              imageWithLogo: structuredQRWithLogo,
              imageSimple: structuredQRCode
            }
          },
          formats: {
            simple: simpleFormat,
            structured: JSON.stringify(structuredFormat),
            barcode: product.code,
            url: `${req.protocol}://${req.get('host')}/mobile/product/${product.id}`
          },
          logo: {
            path: '/Users/dreamimac/Desktop/M2/server/assets/logs/logo-rb.png',
            enabled: true,
            generated: !!simpleQRWithLogo,
            url: `${req.protocol}://${req.get('host')}/assets/logs/logo-rb.png`
          }
        });
        
      } catch (qrError) {
        console.error('QR Code generation error:', qrError);
        
        const baseUrl = 'https://api.qrserver.com/v1/create-qr-code/';
        const qrParams = 'size=256x256&format=png&ecc=M';
        const simpleQRUrl = `${baseUrl}?${qrParams}&data=${encodeURIComponent(simpleFormat)}`;
        const structuredQRUrl = `${baseUrl}?${qrParams}&data=${encodeURIComponent(JSON.stringify(structuredFormat))}`;
        
        res.json({
          success: true,
          product: {
            id: product.id,
            code: product.code,
            name: product.name,
            price: parseFloat(product.price) || 0,
            quantity: parseFloat(product.quantity) || 0,
            image_url: getImageUrl(product.image, req)
          },
          qrData: structuredFormat,
          simpleFormat: simpleFormat,
          qrCodes: {
            simple: {
              data: simpleFormat,
              image: simpleQRUrl
            },
            structured: {
              data: JSON.stringify(structuredFormat),
              image: structuredQRUrl
            }
          },
          logo: {
            enabled: false,
            error: 'Failed to generate logo version'
          }
        });
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Scan QR code
const scanQR = (req, res) => {
  console.log('Mobile QR Scan - Full request body:', req.body);
  
  const { qrData, data, scannedData, text } = req.body;
  let scanData = qrData || data || scannedData || text;
  
  console.log('Mobile QR Scan - Scanning QR data:', scanData);
  
  if (!scanData) {
    return res.status(400).json({ 
      success: false, 
      error: 'No QR data provided',
      receivedBody: req.body
    });
  }
  
  let productCode = null;
  
  try {
    scanData = scanData.toString().trim();
    
    try {
      const searchData = JSON.parse(scanData);
      if (searchData.type === 'product' && searchData.code) {
        productCode = searchData.code;
      } else if (searchData.code) {
        productCode = searchData.code;
      }
    } catch (e) {
      if (scanData.startsWith('#')) {
        productCode = scanData.substring(1);
      } else {
        productCode = scanData;
      }
    }
  } catch (error) {
    console.error('Error processing scan data:', error);
    return res.status(400).json({ 
      success: false, 
      error: 'Error processing scan data'
    });
  }
  
  if (!productCode) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid QR code format',
      receivedData: scanData
    });
  }
  
  console.log('Mobile QR Scan - Extracted product code:', productCode);
  
  const query = `
    SELECT 
      p.*, 
      c.name as category_name, 
      u.name as unit_name,
      CAST(COALESCE(p.price, 0) AS DECIMAL(10,2)) as price,
      CAST(COALESCE(p.cost, 0) AS DECIMAL(10,2)) as cost,
      CAST(COALESCE(p.quantity, 0) AS DECIMAL(10,4)) as quantity,
      CAST(COALESCE(p.alert_quantity, 0) AS DECIMAL(10,4)) as alert_quantity,
      -- Get warehouse stock
      CAST(COALESCE(
        (SELECT SUM(wp.quantity) 
         FROM sma_warehouses_products wp 
         WHERE wp.product_id = p.id), 
        p.quantity, 0
      ) AS DECIMAL(10,4)) as warehouse_quantity
    FROM sma_products p 
    LEFT JOIN sma_categories c ON p.category_id = c.id 
    LEFT JOIN sma_units u ON p.unit = u.id 
    WHERE p.code = ?
  `;
  
  db.query(query, [productCode], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error' 
      });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Product not found',
        searchedCode: productCode
      });
    }
    
    const product = results[0];
    
    // Process the product data to ensure proper number formatting
    const processedProduct = {
      id: product.id,
      code: product.code,
      name: product.name,
      second_name: product.second_name,
      price: parseFloat(product.price) || 0,
      cost: parseFloat(product.cost) || 0,
      quantity: parseFloat(product.warehouse_quantity) || parseFloat(product.quantity) || 0,
      alert_quantity: parseFloat(product.alert_quantity) || 0,
      category_name: product.category_name,
      unit_name: product.unit_name,
      image: product.image,
      image_url: getImageUrl(product.image, req)
    };

    console.log('Mobile QR Scan - Scanned product data:', processedProduct);

    res.json({
      success: true,
      product: processedProduct,
      scannedData: productCode,
      source: 'mobile_api'
    });
  });
};

module.exports = {
  generateQR,
  scanQR
};