const db = require('../config/database');
const { getImageUrl } = require('../utils/helpers');

// Get all categories with pagination
const getAllCategories = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const countQuery = 'SELECT COUNT(*) as total FROM sma_categories';
  
  db.query(countQuery, (err, countResult) => {
    if (err) {
      console.error('Error counting categories:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const totalCategories = countResult[0].total;
    const totalPages = Math.ceil(totalCategories / limit);

    const categoriesQuery = `
      SELECT 
        c.id,
        c.code,
        c.name,
        c.image,
        c.parent_id,
        c.slug,
        c.description,
        COALESCE(parent.name, 'No Parent') as parent_name,
        -- Count products in this category
        (SELECT COUNT(*) FROM sma_products p WHERE p.category_id = c.id AND p.hide = 0) as product_count
      FROM sma_categories c
      LEFT JOIN sma_categories parent ON c.parent_id = parent.id
      ORDER BY c.id ASC
      LIMIT ? OFFSET ?
    `;

    db.query(categoriesQuery, [limit, offset], (err, categories) => {
      if (err) {
        console.error('Error fetching categories:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const processedCategories = categories.map(category => ({
        ...category,
        image_url: getImageUrl(category.image, req),
        parent_id: category.parent_id || null
      }));

      console.log(`Categories fetched: ${categories.length} categories found`);

      res.json({
        categories: processedCategories,
        pagination: {
          currentPage: page,
          totalPages,
          totalCategories,
          limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    });
  });
};

// Get single category by ID
const getCategoryById = (req, res) => {
  const categoryId = parseInt(req.params.id);

  if (!categoryId) {
    return res.status(400).json({ error: 'Invalid category ID' });
  }

  const categoryQuery = `
    SELECT 
      c.id,
      c.code,
      c.name,
      c.image,
      c.parent_id,
      c.slug,
      c.description,
      COALESCE(parent.name, 'No Parent') as parent_name,
      -- Count products in this category
      (SELECT COUNT(*) FROM sma_products p WHERE p.category_id = c.id AND p.hide = 0) as product_count
    FROM sma_categories c
    LEFT JOIN sma_categories parent ON c.parent_id = parent.id
    WHERE c.id = ?
  `;

  db.query(categoryQuery, [categoryId], (err, results) => {
    if (err) {
      console.error('Error fetching category detail:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = results[0];
    const processedCategory = {
      ...category,
      image_url: getImageUrl(category.image, req),
      parent_id: category.parent_id || null
    };

    console.log('Category detail data:', processedCategory);

    res.json({
      category: processedCategory
    });
  });
};

// Get products by category
const getProductsByCategory = (req, res) => {
  const categoryId = parseInt(req.params.id);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  if (!categoryId) {
    return res.status(400).json({ error: 'Invalid category ID' });
  }

  // First check if category exists
  const categoryCheckQuery = 'SELECT id, name FROM sma_categories WHERE id = ?';
  
  db.query(categoryCheckQuery, [categoryId], (err, categoryResult) => {
    if (err) {
      console.error('Error checking category:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (categoryResult.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const categoryName = categoryResult[0].name;

    // Count products in category
    const countQuery = 'SELECT COUNT(*) as total FROM sma_products WHERE category_id = ? AND hide = 0';
    
    db.query(countQuery, [categoryId], (err, countResult) => {
      if (err) {
        console.error('Error counting products in category:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const totalProducts = countResult[0].total;
      const totalPages = Math.ceil(totalProducts / limit);

      // Get products in category
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
        WHERE p.category_id = ? AND p.hide = 0
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?
      `;

      db.query(productsQuery, [categoryId, limit, offset], (err, products) => {
        if (err) {
          console.error('Error fetching products in category:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        const processedProducts = products.map(product => ({
          ...product,
          price: parseFloat(product.price) || 0,
          cost: parseFloat(product.cost) || 0,
          quantity: parseFloat(product.warehouse_quantity) || parseFloat(product.quantity) || 0,
          alert_quantity: parseFloat(product.alert_quantity) || 0,
          image_url: getImageUrl(product.image, req)
        }));

        console.log(`Products in category ${categoryName}: ${products.length} products found`);

        res.json({
          category: {
            id: categoryId,
            name: categoryName
          },
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
  });
};

// Get category tree (hierarchical structure)
const getCategoryTree = (req, res) => {
  const categoriesQuery = `
    SELECT 
      c.id,
      c.code,
      c.name,
      c.image,
      c.parent_id,
      c.slug,
      c.description,
      (SELECT COUNT(*) FROM sma_products p WHERE p.category_id = c.id AND p.hide = 0) as product_count
    FROM sma_categories c
    ORDER BY c.parent_id ASC, c.name ASC
  `;

  db.query(categoriesQuery, (err, categories) => {
    if (err) {
      console.error('Error fetching categories for tree:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Process categories to build tree structure
    const processedCategories = categories.map(category => ({
      ...category,
      image_url: getImageUrl(category.image, req),
      parent_id: category.parent_id || null,
      children: []
    }));

    // Build tree structure
    const categoryMap = {};
    const rootCategories = [];

    // First pass: create map
    processedCategories.forEach(category => {
      categoryMap[category.id] = category;
    });

    // Second pass: build tree
    processedCategories.forEach(category => {
      if (category.parent_id && categoryMap[category.parent_id]) {
        categoryMap[category.parent_id].children.push(category);
      } else {
        rootCategories.push(category);
      }
    });

    console.log(`Category tree built: ${rootCategories.length} root categories`);

    res.json({
      categories: rootCategories,
      total_categories: categories.length
    });
  });
};

// Search categories
const searchCategories = (req, res) => {
  const searchTerm = req.query.q;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  console.log('Category search request received:', { searchTerm, page, limit });

  if (!searchTerm || searchTerm.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Search term is required',
      received: { q: req.query.q, searchTerm }
    });
  }

  const cleanSearchTerm = searchTerm.trim();
  
  const searchQuery = `
    SELECT 
      c.id,
      c.code,
      c.name,
      c.image,
      c.parent_id,
      c.slug,
      c.description,
      COALESCE(parent.name, 'No Parent') as parent_name,
      (SELECT COUNT(*) FROM sma_products p WHERE p.category_id = c.id AND p.hide = 0) as product_count,
      CASE 
        WHEN c.code = ? THEN 100
        WHEN c.code LIKE ? THEN 90
        WHEN LOWER(c.name) LIKE LOWER(?) THEN 80
        WHEN LOWER(c.description) LIKE LOWER(?) THEN 70
        ELSE 60
      END as relevance_score
    FROM sma_categories c
    LEFT JOIN sma_categories parent ON c.parent_id = parent.id
    WHERE (
      c.code = ? OR
      c.code LIKE ? OR
      LOWER(c.name) LIKE LOWER(?) OR
      LOWER(c.description) LIKE LOWER(?)
    )
    ORDER BY relevance_score DESC, c.name ASC
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM sma_categories c
    WHERE (
      c.code = ? OR
      c.code LIKE ? OR
      LOWER(c.name) LIKE LOWER(?) OR
      LOWER(c.description) LIKE LOWER(?)
    )
  `;

  const exactMatch = cleanSearchTerm;
  const wildcardMatch = `%${cleanSearchTerm}%`;

  const searchParams = [
    // For relevance scoring
    exactMatch, wildcardMatch, wildcardMatch, wildcardMatch,
    // For WHERE clause
    exactMatch, wildcardMatch, wildcardMatch, wildcardMatch,
    // For pagination
    limit, offset
  ];

  const countParams = [
    exactMatch, wildcardMatch, wildcardMatch, wildcardMatch
  ];

  // Get total count first
  db.query(countQuery, countParams, (err, countResult) => {
    if (err) {
      console.error('Error counting search results:', err);
      return res.status(500).json({ error: 'Database error during count' });
    }

    const totalCategories = countResult[0].total;
    const totalPages = Math.ceil(totalCategories / limit);

    // Get search results
    db.query(searchQuery, searchParams, (err, categories) => {
      if (err) {
        console.error('Error executing search query:', err);
        return res.status(500).json({ error: 'Database error during search' });
      }

      const processedCategories = categories.map(category => ({
        ...category,
        image_url: getImageUrl(category.image, req),
        parent_id: category.parent_id || null,
        search_match: {
          term: cleanSearchTerm,
          relevance: category.relevance_score
        }
      }));

      console.log(`Category search completed: ${categories.length} categories found for "${cleanSearchTerm}"`);

      res.json({
        categories: processedCategories,
        pagination: {
          currentPage: page,
          totalPages,
          totalCategories,
          limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        search: {
          term: cleanSearchTerm,
          total_results: totalCategories,
          showing: categories.length
        }
      });
    });
  });
};

module.exports = {
  getAllCategories,
  getCategoryById,
  getProductsByCategory,
  getCategoryTree,
  searchCategories
};