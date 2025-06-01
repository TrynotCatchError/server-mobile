const db = require('../config/database');
const { getImageUrl } = require('../utils/helpers');

// Search products
const searchProducts = (req, res) => {
  const searchTerm = req.query.q;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  console.log('Search request received:', { searchTerm, page, limit });

  if (!searchTerm || searchTerm.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Search term is required',
      received: { q: req.query.q, searchTerm }
    });
  }

  const cleanSearchTerm = searchTerm.trim();
  
  // Build search query with proper CAST for numeric fields
  const searchQuery = `
    SELECT 
      p.id,
      p.code,
      p.name,
      p.second_name,
      CAST(COALESCE(p.price, 0) AS DECIMAL(10,2)) as price,
      CAST(COALESCE(p.cost, 0) AS DECIMAL(10,2)) as cost,
      CAST(COALESCE(p.quantity, 0) AS DECIMAL(10,4)) as quantity,
      CAST(COALESCE(p.alert_quantity, 0) AS DECIMAL(10,4)) as alert_quantity,
      p.image,
      COALESCE(c.name, 'Uncategorized') as category_name,
      COALESCE(u.name, 'Unit') as unit_name,
      -- Get warehouse stock
      CAST(COALESCE(
        (SELECT SUM(wp.quantity) 
         FROM sma_warehouses_products wp 
         WHERE wp.product_id = p.id), 
        p.quantity, 0
      ) AS DECIMAL(10,4)) as warehouse_quantity,
      CASE 
        WHEN p.code = ? THEN 100
        WHEN p.code LIKE ? THEN 90
        WHEN LOWER(p.name) LIKE LOWER(?) THEN 80
        WHEN LOWER(p.second_name) LIKE LOWER(?) THEN 70
        WHEN LOWER(c.name) LIKE LOWER(?) THEN 60
        WHEN LOWER(p.product_details) LIKE LOWER(?) THEN 50
        ELSE 40
      END as relevance_score
    FROM sma_products p
    LEFT JOIN sma_categories c ON p.category_id = c.id
    LEFT JOIN sma_units u ON p.unit = u.id
    WHERE p.hide = 0 AND (
      p.code = ? OR
      p.code LIKE ? OR
      LOWER(p.name) LIKE LOWER(?) OR
      LOWER(p.second_name) LIKE LOWER(?) OR
      LOWER(c.name) LIKE LOWER(?) OR
      LOWER(p.product_details) LIKE LOWER(?)
    )
    ORDER BY relevance_score DESC, p.id DESC
    LIMIT ? OFFSET ?
  `;

  // Count query for pagination
  const countQuery = `
    SELECT COUNT(*) as total
    FROM sma_products p
    LEFT JOIN sma_categories c ON p.category_id = c.id
    WHERE p.hide = 0 AND (
      p.code = ? OR
      p.code LIKE ? OR
      LOWER(p.name) LIKE LOWER(?) OR
      LOWER(p.second_name) LIKE LOWER(?) OR
      LOWER(c.name) LIKE LOWER(?) OR
      LOWER(p.product_details) LIKE LOWER(?)
    )
  `;

  const exactMatch = cleanSearchTerm;
  const wildcardMatch = `%${cleanSearchTerm}%`;

  const searchParams = [
    // For relevance scoring
    exactMatch, wildcardMatch, wildcardMatch, wildcardMatch, wildcardMatch, wildcardMatch,
    // For WHERE clause
    exactMatch, wildcardMatch, wildcardMatch, wildcardMatch, wildcardMatch, wildcardMatch,
    // For pagination
    limit, offset
  ];

  const countParams = [
    exactMatch, wildcardMatch, wildcardMatch, wildcardMatch, wildcardMatch, wildcardMatch
  ];

  // Get total count first
  db.query(countQuery, countParams, (err, countResult) => {
    if (err) {
      console.error('Error counting search results:', err);
      return res.status(500).json({ error: 'Database error during count' });
    }

    const totalProducts = countResult[0].total;
    const totalPages = Math.ceil(totalProducts / limit);

    // Get search results
    db.query(searchQuery, searchParams, (err, products) => {
      if (err) {
        console.error('Error executing search query:', err);
        return res.status(500).json({ error: 'Database error during search' });
      }

      // Process products to ensure proper number formatting
      const productsWithSearchInfo = products.map(product => ({
        ...product,
        price: parseFloat(product.price) || 0,
        cost: parseFloat(product.cost) || 0,
        quantity: parseFloat(product.warehouse_quantity) || parseFloat(product.quantity) || 0,
        alert_quantity: parseFloat(product.alert_quantity) || 0,
        image_url: getImageUrl(product.image, req),
        search_match: {
          term: cleanSearchTerm,
          relevance: product.relevance_score
        }
      }));

      console.log(`Search completed: ${products.length} products found for "${cleanSearchTerm}"`);

      res.json({
        products: productsWithSearchInfo,
        pagination: {
          currentPage: page,
          totalPages,
          totalProducts,
          limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        search: {
          term: cleanSearchTerm,
          total_results: totalProducts,
          showing: products.length
        }
      });
    });
  });
};

// Get search suggestions
const getSearchSuggestions = (req, res) => {
  const searchTerm = req.query.q;
  
  console.log('Suggestions request received:', { searchTerm });

  if (!searchTerm || searchTerm.trim().length < 2) {
    return res.json({ suggestions: [] });
  }

  const cleanSearchTerm = searchTerm.trim();
  
  const suggestionsQuery = `
    SELECT 
      p.id,
      p.code,
      p.name,
      p.second_name,
      CASE 
        WHEN p.code = ? THEN 'code'
        WHEN LOWER(p.name) LIKE LOWER(?) THEN 'name'
        WHEN LOWER(p.second_name) LIKE LOWER(?) THEN 'second_name'
        ELSE 'other'
      END as match_type,
      CASE 
        WHEN p.code = ? THEN 100
        WHEN p.code LIKE ? THEN 90
        WHEN LOWER(p.name) LIKE LOWER(?) THEN 80
        WHEN LOWER(p.second_name) LIKE LOWER(?) THEN 70
        ELSE 50
      END as relevance
    FROM sma_products p
    WHERE p.hide = 0 AND (
      p.code = ? OR
      p.code LIKE ? OR
      LOWER(p.name) LIKE LOWER(?) OR
      LOWER(p.second_name) LIKE LOWER(?)
    )
    ORDER BY relevance DESC, p.name ASC
    LIMIT 8
  `;

  const exactMatch = cleanSearchTerm;
  const wildcardMatch = `%${cleanSearchTerm}%`;

  const params = [
    // For match_type CASE
    exactMatch, wildcardMatch, wildcardMatch,
    // For relevance CASE
    exactMatch, wildcardMatch, wildcardMatch, wildcardMatch,
    // For WHERE clause
    exactMatch, wildcardMatch, wildcardMatch, wildcardMatch
  ];

  db.query(suggestionsQuery, params, (err, results) => {
    if (err) {
      console.error('Error fetching suggestions:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const suggestions = results.map(item => ({
      id: item.id,
      code: item.code,
      name: item.name,
      match_type: item.match_type,
      display_text: `${item.name} (${item.code})`
    }));

    console.log(`Suggestions found: ${suggestions.length} for "${cleanSearchTerm}"`);

    res.json({ suggestions });
  });
};

// Get all products with pagination
const getAllProducts = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const countQuery = 'SELECT COUNT(*) as total FROM sma_products WHERE hide = 0';
  
  db.query(countQuery, (err, countResult) => {
    if (err) {
      console.error('Error counting products:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const totalProducts = countResult[0].total;
    const totalPages = Math.ceil(totalProducts / limit);

    // Updated query to properly handle quantity and get warehouse stock
    const productsQuery = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.second_name,
        CAST(COALESCE(p.price, 0) AS DECIMAL(10,2)) as price,
        CAST(COALESCE(p.cost, 0) AS DECIMAL(10,2)) as cost,
        CAST(COALESCE(p.quantity, 0) AS DECIMAL(10,4)) as quantity,
        CAST(COALESCE(p.alert_quantity, 0) AS DECIMAL(10,4)) as alert_quantity,
        p.image,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(u.name, 'Unit') as unit_name,
        -- Get total warehouse stock
        CAST(COALESCE(
          (SELECT SUM(wp.quantity) 
           FROM sma_warehouses_products wp 
           WHERE wp.product_id = p.id), 
          p.quantity, 0
        ) AS DECIMAL(10,4)) as warehouse_quantity
      FROM sma_products p
      LEFT JOIN sma_categories c ON p.category_id = c.id
      LEFT JOIN sma_units u ON p.unit = u.id
      WHERE p.hide = 0
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
    `;

    db.query(productsQuery, [limit, offset], (err, products) => {
      if (err) {
        console.error('Error fetching products:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Process products to ensure proper number formatting
      const processedProducts = products.map(product => ({
        ...product,
        price: parseFloat(product.price) || 0,
        cost: parseFloat(product.cost) || 0,
        quantity: parseFloat(product.warehouse_quantity) || parseFloat(product.quantity) || 0,
        alert_quantity: parseFloat(product.alert_quantity) || 0,
        image_url: getImageUrl(product.image, req)
      }));

      console.log('Sample product data:', processedProducts[0]); // Debug log

      res.json({
        products: processedProducts,
        pagination: {
          currentPage: page,
          totalPages,
          totalProducts,
          limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    });
  });
};

// Get single product detail
const getProductById = (req, res) => {
  const productId = parseInt(req.params.id);

  if (!productId) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  const productQuery = `
    SELECT 
      p.*,
      CAST(COALESCE(p.price, 0) AS DECIMAL(10,2)) as price,
      CAST(COALESCE(p.cost, 0) AS DECIMAL(10,2)) as cost,
      CAST(COALESCE(p.quantity, 0) AS DECIMAL(10,4)) as quantity,
      CAST(COALESCE(p.alert_quantity, 0) AS DECIMAL(10,4)) as alert_quantity,
      COALESCE(c.name, 'Uncategorized') as category_name,
      COALESCE(u.name, 'Unit') as unit_name,
      COALESCE(b.name, 'No Brand') as brand_name,
      -- Get warehouse stock details
      CAST(COALESCE(
        (SELECT SUM(wp.quantity) 
         FROM sma_warehouses_products wp 
         WHERE wp.product_id = p.id), 
        p.quantity, 0
      ) AS DECIMAL(10,4)) as warehouse_quantity,
      CAST(COALESCE(
        (SELECT AVG(wp.avg_cost) 
         FROM sma_warehouses_products wp 
         WHERE wp.product_id = p.id), 
        p.cost, 0
      ) AS DECIMAL(10,2)) as avg_warehouse_cost
    FROM sma_products p
    LEFT JOIN sma_categories c ON p.category_id = c.id
    LEFT JOIN sma_units u ON p.unit = u.id
    LEFT JOIN sma_brands b ON p.brand = b.id
    WHERE p.id = ? AND p.hide = 0
  `;

  db.query(productQuery, [productId], (err, results) => {
    if (err) {
      console.error('Error fetching product detail:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update view count
    const updateViewsQuery = 'UPDATE sma_products SET views = views + 1 WHERE id = ?';
    db.query(updateViewsQuery, [productId], (updateErr) => {
      if (updateErr) {
        console.error('Error updating views:', updateErr);
      }
    });

    const product = results[0];
    
    // Process product data to ensure proper number formatting
    const processedProduct = {
      ...product,
      price: parseFloat(product.price) || 0,
      cost: parseFloat(product.avg_warehouse_cost) || parseFloat(product.cost) || 0,
      quantity: parseFloat(product.warehouse_quantity) || parseFloat(product.quantity) || 0,
      alert_quantity: parseFloat(product.alert_quantity) || 0,
      image_url: getImageUrl(product.image, req)
    };

    console.log('Product detail data:', processedProduct); // Debug log

    res.json({
      product: processedProduct
    });
  });
};

module.exports = {
  searchProducts,
  getSearchSuggestions,
  getAllProducts,
  getProductById
};