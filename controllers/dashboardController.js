const db = require('../config/database');
const { getImageUrl } = require('../utils/helpers');

// Get dashboard data
const getDashboardData = async (req, res) => {
  try {
    console.log('Dashboard data request received');

    // Get current date ranges
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Format dates for MySQL
    const formatDate = (date) => date.toISOString().split('T')[0];

    const todayStr = formatDate(todayStart);
    const weekStr = formatDate(weekStart);
    const monthStr = formatDate(monthStart);

    console.log('Date ranges:', { todayStr, weekStr, monthStr });

    // Sales statistics
    const salesQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN DATE(s.date) = ? THEN s.grand_total ELSE 0 END), 0) as today,
        COALESCE(SUM(CASE WHEN DATE(s.date) >= ? THEN s.grand_total ELSE 0 END), 0) as this_week,
        COALESCE(SUM(CASE WHEN DATE(s.date) >= ? THEN s.grand_total ELSE 0 END), 0) as this_month,
        COALESCE(SUM(s.grand_total), 0) as total,
        COUNT(CASE WHEN DATE(s.date) = ? THEN 1 END) as count_today,
        COUNT(CASE WHEN DATE(s.date) >= ? THEN 1 END) as count_month
      FROM sma_sales s 
      WHERE s.sale_status != 'returned'
    `;

    // Products statistics
    const productsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN p.quantity <= p.alert_quantity AND p.alert_quantity > 0 THEN 1 END) as low_stock,
        COUNT(CASE WHEN p.quantity <= 0 THEN 1 END) as out_of_stock,
        COUNT(DISTINCT p.category_id) as categories
      FROM sma_products p 
      WHERE p.hide = 0
    `;

    // Customers statistics - Fixed to use correct column name
    const customersQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN DATE(c.date) >= ? THEN 1 END) as new_this_month
      FROM sma_companies c 
      WHERE c.group_name = 'customer'
    `;

    // Alternative customers query if 'date' column doesn't exist
    const customersQueryAlt = `
      SELECT 
        COUNT(*) as total,
        0 as new_this_month
      FROM sma_companies c 
      WHERE c.group_name = 'customer'
    `;

    // Inventory statistics
    const inventoryQuery = `
      SELECT 
        COALESCE(SUM(p.quantity * p.cost), 0) as total_value,
        COALESCE(SUM(p.quantity), 0) as total_quantity,
        COALESCE(AVG(p.cost), 0) as avg_cost
      FROM sma_products p 
      WHERE p.hide = 0 AND p.quantity > 0
    `;

    // Recent sales
    const recentSalesQuery = `
      SELECT 
        s.id,
        s.reference_no,
        COALESCE(c.company, 'Walk-in Customer') as customer,
        s.grand_total,
        s.date,
        s.payment_status
      FROM sma_sales s
      LEFT JOIN sma_companies c ON s.customer_id = c.id
      WHERE s.sale_status != 'returned'
      ORDER BY s.date DESC
      LIMIT 10
    `;

    // Top selling products
    const topProductsQuery = `
      SELECT 
        p.id,
        p.name,
        p.code,
        p.image,
        COALESCE(SUM(si.quantity), 0) as total_sold,
        COALESCE(SUM(si.subtotal), 0) as total_revenue
      FROM sma_products p
      LEFT JOIN sma_sale_items si ON p.id = si.product_id
      LEFT JOIN sma_sales s ON si.sale_id = s.id
      WHERE p.hide = 0 AND (s.sale_status IS NULL OR s.sale_status != 'returned')
        AND (s.date IS NULL OR DATE(s.date) >= ?)
      GROUP BY p.id, p.name, p.code, p.image
      HAVING total_sold > 0
      ORDER BY total_sold DESC
      LIMIT 5
    `;

    // Low stock products
    const lowStockQuery = `
      SELECT 
        p.id,
        p.name,
        p.code,
        p.image,
        CAST(COALESCE(p.quantity, 0) AS DECIMAL(10,4)) as quantity,
        CAST(COALESCE(p.alert_quantity, 0) AS DECIMAL(10,4)) as alert_quantity
      FROM sma_products p
      WHERE p.hide = 0 
        AND p.quantity <= p.alert_quantity 
        AND p.alert_quantity > 0
      ORDER BY (p.quantity / NULLIF(p.alert_quantity, 0)) ASC
      LIMIT 10
    `;

    // Execute queries with error handling
    const executeQuery = (query, params = []) => {
      return new Promise((resolve, reject) => {
        db.query(query, params, (err, results) => {
          if (err) {
            console.error('Query error:', err.message);
            console.error('Query:', query);
            reject(err);
          } else {
            resolve(results);
          }
        });
      });
    };

    // Try customers query with fallback
    let customersResults;
    try {
      customersResults = await executeQuery(customersQuery, [monthStr]);
    } catch (error) {
      console.log('Customers query failed, using alternative:', error.message);
      customersResults = await executeQuery(customersQueryAlt);
    }

    // Execute all other queries
    const [
      salesResults,
      productsResults,
      inventoryResults,
      recentSalesResults,
      topProductsResults,
      lowStockResults
    ] = await Promise.all([
      executeQuery(salesQuery, [todayStr, weekStr, monthStr, todayStr, monthStr]),
      executeQuery(productsQuery),
      executeQuery(inventoryQuery),
      executeQuery(recentSalesQuery),
      executeQuery(topProductsQuery, [monthStr]),
      executeQuery(lowStockQuery)
    ]);

    // Process results
    const sales = salesResults[0] || {};
    const products = productsResults[0] || {};
    const customers = customersResults[0] || {};
    const inventory = inventoryResults[0] || {};

    // Process recent sales
    const recent_sales = (recentSalesResults || []).map(sale => ({
      ...sale,
      grand_total: parseFloat(sale.grand_total) || 0,
      date: sale.date
    }));

    // Process top products
    const top_products = (topProductsResults || []).map(product => ({
      ...product,
      total_sold: parseFloat(product.total_sold) || 0,
      total_revenue: parseFloat(product.total_revenue) || 0,
      image_url: getImageUrl(product.image, req)
    }));

    // Process low stock products
    const low_stock_products = (lowStockResults || []).map(product => ({
      ...product,
      quantity: parseFloat(product.quantity) || 0,
      alert_quantity: parseFloat(product.alert_quantity) || 0,
      image_url: getImageUrl(product.image, req)
    }));

    const dashboardData = {
      sales: {
        today: parseFloat(sales.today) || 0,
        this_week: parseFloat(sales.this_week) || 0,
        this_month: parseFloat(sales.this_month) || 0,
        total: parseFloat(sales.total) || 0,
        count_today: parseInt(sales.count_today) || 0,
        count_month: parseInt(sales.count_month) || 0
      },
      products: {
        total: parseInt(products.total) || 0,
        low_stock: parseInt(products.low_stock) || 0,
        out_of_stock: parseInt(products.out_of_stock) || 0,
        categories: parseInt(products.categories) || 0
      },
      customers: {
        total: parseInt(customers.total) || 0,
        new_this_month: parseInt(customers.new_this_month) || 0
      },
      inventory: {
        total_value: parseFloat(inventory.total_value) || 0,
        total_quantity: parseFloat(inventory.total_quantity) || 0,
        avg_cost: parseFloat(inventory.avg_cost) || 0
      },
      recent_sales,
      top_products,
      low_stock_products,
      generated_at: new Date().toISOString(),
      date_ranges: {
        today: todayStr,
        week_start: weekStr,
        month_start: monthStr
      }
    };

    console.log('Dashboard data compiled successfully');
    console.log('Sample data:', {
      sales_today: dashboardData.sales.today,
      total_products: dashboardData.products.total,
      recent_sales_count: dashboardData.recent_sales.length,
      top_products_count: dashboardData.top_products.length,
      low_stock_count: dashboardData.low_stock_products.length
    });

    res.json(dashboardData);

  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getDashboardData
};