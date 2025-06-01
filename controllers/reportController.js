const db = require('../config/database');
const { getImageUrl } = require('../utils/helpers');

// Daily Sales Report
const getDailySalesReport = (req, res) => {
  const { start_date, end_date, warehouse_id } = req.query;
  
  let dateFilter = '';
  let params = [];
  
  if (start_date && end_date) {
    dateFilter = 'AND DATE(s.date) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  } else if (start_date) {
    dateFilter = 'AND DATE(s.date) = ?';
    params.push(start_date);
  } else {
    dateFilter = 'AND DATE(s.date) = CURDATE()';
  }
  
  let warehouseFilter = '';
  if (warehouse_id) {
    warehouseFilter = 'AND s.warehouse_id = ?';
    params.push(warehouse_id);
  }

  const query = `
    SELECT 
      DATE(s.date) as sale_date,
      COUNT(s.id) as total_sales,
      SUM(s.total) as gross_total,
      SUM(s.total_discount) as total_discount,
      SUM(s.total_tax) as total_tax,
      SUM(s.grand_total) as net_total,
      SUM(s.paid) as total_paid,
      SUM(s.grand_total - s.paid) as outstanding,
      AVG(s.grand_total) as average_sale_value
    FROM sma_sales s
    WHERE s.sale_status = 'completed'
    ${dateFilter}
    ${warehouseFilter}
    GROUP BY DATE(s.date)
    ORDER BY sale_date DESC
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching daily sales report:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const processedResults = results.map(row => ({
      ...row,
      gross_total: parseFloat(row.gross_total) || 0,
      total_discount: parseFloat(row.total_discount) || 0,
      total_tax: parseFloat(row.total_tax) || 0,
      net_total: parseFloat(row.net_total) || 0,
      total_paid: parseFloat(row.total_paid) || 0,
      outstanding: parseFloat(row.outstanding) || 0,
      average_sale_value: parseFloat(row.average_sale_value) || 0
    }));

    res.json({
      report_type: 'daily_sales',
      period: { start_date, end_date },
      data: processedResults,
      summary: {
        total_days: results.length,
        total_sales: results.reduce((sum, row) => sum + row.total_sales, 0),
        total_revenue: results.reduce((sum, row) => sum + parseFloat(row.net_total || 0), 0)
      }
    });
  });
};

// Monthly Sales Report
const getMonthlySalesReport = (req, res) => {
  const { year, warehouse_id } = req.query;
  const targetYear = year || new Date().getFullYear();
  
  let warehouseFilter = '';
  let params = [targetYear];
  
  if (warehouse_id) {
    warehouseFilter = 'AND s.warehouse_id = ?';
    params.push(warehouse_id);
  }

  const query = `
    SELECT 
      YEAR(s.date) as year,
      MONTH(s.date) as month,
      MONTHNAME(s.date) as month_name,
      COUNT(s.id) as total_sales,
      SUM(s.total) as gross_total,
      SUM(s.total_discount) as total_discount,
      SUM(s.total_tax) as total_tax,
      SUM(s.grand_total) as net_total,
      SUM(s.paid) as total_paid,
      AVG(s.grand_total) as average_sale_value
    FROM sma_sales s
    WHERE s.sale_status = 'completed'
    AND YEAR(s.date) = ?
    ${warehouseFilter}
    GROUP BY YEAR(s.date), MONTH(s.date)
    ORDER BY month
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching monthly sales report:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const processedResults = results.map(row => ({
      ...row,
      gross_total: parseFloat(row.gross_total) || 0,
      total_discount: parseFloat(row.total_discount) || 0,
      total_tax: parseFloat(row.total_tax) || 0,
      net_total: parseFloat(row.net_total) || 0,
      total_paid: parseFloat(row.total_paid) || 0,
      average_sale_value: parseFloat(row.average_sale_value) || 0
    }));

    res.json({
      report_type: 'monthly_sales',
      year: targetYear,
      data: processedResults,
      summary: {
        total_months: results.length,
        total_sales: results.reduce((sum, row) => sum + row.total_sales, 0),
        total_revenue: results.reduce((sum, row) => sum + parseFloat(row.net_total || 0), 0)
      }
    });
  });
};

// Top Selling Products Report
const getTopSellingProducts = (req, res) => {
  const { start_date, end_date, limit = 10 } = req.query;
  
  let dateFilter = '';
  let params = [];
  
  if (start_date && end_date) {
    dateFilter = 'AND DATE(s.date) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }
  
  params.push(parseInt(limit));

  const query = `
    SELECT 
      si.product_id,
      si.product_code,
      si.product_name,
      p.image,
      c.name as category_name,
      SUM(si.quantity) as total_quantity_sold,
      COUNT(DISTINCT si.sale_id) as total_orders,
      SUM(si.subtotal) as total_revenue,
      AVG(si.net_unit_price) as average_price,
      SUM(si.quantity * (si.net_unit_price - COALESCE(p.cost, 0))) as total_profit
    FROM sma_sale_items si
    INNER JOIN sma_sales s ON si.sale_id = s.id
    LEFT JOIN sma_products p ON si.product_id = p.id
    LEFT JOIN sma_categories c ON p.category_id = c.id
    WHERE s.sale_status = 'completed'
    ${dateFilter}
    GROUP BY si.product_id, si.product_code, si.product_name
    ORDER BY total_quantity_sold DESC
    LIMIT ?
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching top selling products:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const processedResults = results.map(row => ({
      ...row,
      total_quantity_sold: parseFloat(row.total_quantity_sold) || 0,
      total_revenue: parseFloat(row.total_revenue) || 0,
      average_price: parseFloat(row.average_price) || 0,
      total_profit: parseFloat(row.total_profit) || 0,
      image_url: getImageUrl(row.image, req)
    }));

    res.json({
      report_type: 'top_selling_products',
      period: { start_date, end_date },
      data: processedResults
    });
  });
};

// Stock Levels Report
const getStockLevelsReport = (req, res) => {
  const { warehouse_id, category_id, low_stock_only } = req.query;
  
  let warehouseFilter = '';
  let categoryFilter = '';
  let lowStockFilter = '';
  let params = [];
  
  if (warehouse_id) {
    warehouseFilter = 'AND (wp.warehouse_id = ? OR wp.warehouse_id IS NULL)';
    params.push(warehouse_id);
  }
  
  if (category_id) {
    categoryFilter = 'AND p.category_id = ?';
    params.push(category_id);
  }
  
  if (low_stock_only === 'true') {
    lowStockFilter = 'HAVING current_stock <= alert_quantity';
  }

  const query = `
    SELECT 
      p.id,
      p.code,
      p.name,
      p.image,
      c.name as category_name,
      COALESCE(SUM(wp.quantity), p.quantity, 0) as current_stock,
      p.alert_quantity,
      p.cost,
      p.price,
      CASE 
        WHEN COALESCE(SUM(wp.quantity), p.quantity, 0) <= p.alert_quantity THEN 'Low Stock'
        WHEN COALESCE(SUM(wp.quantity), p.quantity, 0) = 0 THEN 'Out of Stock'
        ELSE 'In Stock'
      END as stock_status,
      COALESCE(SUM(wp.quantity), p.quantity, 0) * p.cost as stock_value
    FROM sma_products p
    LEFT JOIN sma_warehouses_products wp ON p.id = wp.product_id
    LEFT JOIN sma_categories c ON p.category_id = c.id
    WHERE p.hide = 0
    ${warehouseFilter}
    ${categoryFilter}
    GROUP BY p.id, p.code, p.name, p.alert_quantity, p.cost, p.price
    ${lowStockFilter}
    ORDER BY current_stock ASC, p.name
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching stock levels report:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const processedResults = results.map(row => ({
      ...row,
      current_stock: parseFloat(row.current_stock) || 0,
      alert_quantity: parseFloat(row.alert_quantity) || 0,
      cost: parseFloat(row.cost) || 0,
      price: parseFloat(row.price) || 0,
      stock_value: parseFloat(row.stock_value) || 0,
      image_url: getImageUrl(row.image, req)
    }));

    const summary = {
      total_products: processedResults.length,
      total_stock_value: processedResults.reduce((sum, row) => sum + row.stock_value, 0),
      low_stock_items: processedResults.filter(row => row.stock_status === 'Low Stock').length,
      out_of_stock_items: processedResults.filter(row => row.stock_status === 'Out of Stock').length
    };

    res.json({
      report_type: 'stock_levels',
      data: processedResults,
      summary
    });
  });
};

// Profit Loss Report
const getProfitLossReport = (req, res) => {
  const { start_date, end_date } = req.query;
  
  let dateFilter = '';
  let params = [];
  
  if (start_date && end_date) {
    dateFilter = 'AND DATE(c.date) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  } else {
    // Default to current month
    dateFilter = 'AND YEAR(c.date) = YEAR(CURDATE()) AND MONTH(c.date) = MONTH(CURDATE())';
  }

  const query = `
    SELECT 
      DATE(c.date) as transaction_date,
      SUM(c.sale_net_unit_price * c.quantity) as total_sales,
      SUM(c.purchase_net_unit_cost * c.quantity) as total_cost,
      SUM((c.sale_net_unit_price - c.purchase_net_unit_cost) * c.quantity) as gross_profit,
      COUNT(DISTINCT c.sale_id) as total_transactions
    FROM sma_costing c
    WHERE c.sale_id IS NOT NULL
    ${dateFilter}
    GROUP BY DATE(c.date)
    ORDER BY transaction_date DESC
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching profit loss report:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const processedResults = results.map(row => ({
      ...row,
      total_sales: parseFloat(row.total_sales) || 0,
      total_cost: parseFloat(row.total_cost) || 0,
      gross_profit: parseFloat(row.gross_profit) || 0,
      profit_margin: row.total_sales > 0 ? ((parseFloat(row.gross_profit) / parseFloat(row.total_sales)) * 100).toFixed(2) : 0
    }));

    const summary = {
      total_sales: processedResults.reduce((sum, row) => sum + row.total_sales, 0),
      total_cost: processedResults.reduce((sum, row) => sum + row.total_cost, 0),
      total_profit: processedResults.reduce((sum, row) => sum + row.gross_profit, 0),
      average_margin: processedResults.length > 0 ? 
        (processedResults.reduce((sum, row) => sum + parseFloat(row.profit_margin), 0) / processedResults.length).toFixed(

            2) : 0
    };

    res.json({
      report_type: 'profit_loss',
      period: { start_date, end_date },
      data: processedResults,
      summary
    });
  });
};

// Top Customers Report
const getTopCustomersReport = (req, res) => {
  const { start_date, end_date, limit = 10 } = req.query;
  
  let dateFilter = '';
  let params = [];
  
  if (start_date && end_date) {
    dateFilter = 'AND DATE(s.date) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }
  
  params.push(parseInt(limit));

  const query = `
    SELECT 
      s.customer_id,
      s.customer,
      c.company,
      c.phone,
      c.email,
      COUNT(s.id) as total_orders,
      SUM(s.grand_total) as total_spent,
      AVG(s.grand_total) as average_order_value,
      MAX(s.date) as last_order_date,
      SUM(s.paid) as total_paid,
      SUM(s.grand_total - s.paid) as outstanding_balance
    FROM sma_sales s
    LEFT JOIN sma_companies c ON s.customer_id = c.id
    WHERE s.sale_status = 'completed'
    ${dateFilter}
    GROUP BY s.customer_id, s.customer
    ORDER BY total_spent DESC
    LIMIT ?
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching top customers report:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const processedResults = results.map(row => ({
      ...row,
      total_spent: parseFloat(row.total_spent) || 0,
      average_order_value: parseFloat(row.average_order_value) || 0,
      total_paid: parseFloat(row.total_paid) || 0,
      outstanding_balance: parseFloat(row.outstanding_balance) || 0
    }));

    res.json({
      report_type: 'top_customers',
      period: { start_date, end_date },
      data: processedResults
    });
  });
};

// Category Sales Report
const getCategorySalesReport = (req, res) => {
  const { start_date, end_date } = req.query;
  
  let dateFilter = '';
  let params = [];
  
  if (start_date && end_date) {
    dateFilter = 'AND DATE(s.date) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  const query = `
    SELECT 
      c.id as category_id,
      c.name as category_name,
      c.image as category_image,
      COUNT(DISTINCT si.product_id) as products_sold,
      SUM(si.quantity) as total_quantity_sold,
      SUM(si.subtotal) as total_revenue,
      AVG(si.net_unit_price) as average_price,
      COUNT(DISTINCT si.sale_id) as total_orders
    FROM sma_sale_items si
    INNER JOIN sma_sales s ON si.sale_id = s.id
    INNER JOIN sma_products p ON si.product_id = p.id
    INNER JOIN sma_categories c ON p.category_id = c.id
    WHERE s.sale_status = 'completed'
    ${dateFilter}
    GROUP BY c.id, c.name
    ORDER BY total_revenue DESC
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching category sales report:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const processedResults = results.map(row => ({
      ...row,
      total_quantity_sold: parseFloat(row.total_quantity_sold) || 0,
      total_revenue: parseFloat(row.total_revenue) || 0,
      average_price: parseFloat(row.average_price) || 0,
      image_url: getImageUrl(row.category_image, req)
    }));

    const totalRevenue = processedResults.reduce((sum, row) => sum + row.total_revenue, 0);
    
    const resultsWithPercentage = processedResults.map(row => ({
      ...row,
      revenue_percentage: totalRevenue > 0 ? ((row.total_revenue / totalRevenue) * 100).toFixed(2) : 0
    }));

    res.json({
      report_type: 'category_sales',
      period: { start_date, end_date },
      data: resultsWithPercentage,
      summary: {
        total_categories: results.length,
        total_revenue: totalRevenue
      }
    });
  });
};

// Payments Report
const getPaymentsReport = (req, res) => {
  const { start_date, end_date, payment_method } = req.query;
  
  let dateFilter = '';
  let methodFilter = '';
  let params = [];
  
  if (start_date && end_date) {
    dateFilter = 'AND DATE(p.date) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }
  
  if (payment_method) {
    methodFilter = 'AND p.paid_by = ?';
    params.push(payment_method);
  }

  const query = `
    SELECT 
      DATE(p.date) as payment_date,
      p.paid_by as payment_method,
      COUNT(p.id) as total_transactions,
      SUM(p.amount) as total_amount,
      AVG(p.amount) as average_amount,
      p.type as payment_type
    FROM sma_payments p
    WHERE 1=1
    ${dateFilter}
    ${methodFilter}
    GROUP BY DATE(p.date), p.paid_by, p.type
    ORDER BY payment_date DESC, total_amount DESC
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching payments report:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const processedResults = results.map(row => ({
      ...row,
      total_amount: parseFloat(row.total_amount) || 0,
      average_amount: parseFloat(row.average_amount) || 0
    }));

    // Summary by payment method
    const methodSummary = {};
    processedResults.forEach(row => {
      if (!methodSummary[row.payment_method]) {
        methodSummary[row.payment_method] = {
          method: row.payment_method,
          total_transactions: 0,
          total_amount: 0
        };
      }
      methodSummary[row.payment_method].total_transactions += row.total_transactions;
      methodSummary[row.payment_method].total_amount += row.total_amount;
    });

    res.json({
      report_type: 'payments',
      period: { start_date, end_date },
      data: processedResults,
      summary: {
        by_method: Object.values(methodSummary),
        total_amount: processedResults.reduce((sum, row) => sum + row.total_amount, 0),
        total_transactions: processedResults.reduce((sum, row) => sum + row.total_transactions, 0)
      }
    });
  });
};

// Product Performance Report
const getProductPerformanceReport = (req, res) => {
  const { start_date, end_date, category_id } = req.query;
  
  let dateFilter = '';
  let categoryFilter = '';
  let params = [];
  
  if (start_date && end_date) {
    dateFilter = 'AND DATE(s.date) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }
  
  if (category_id) {
    categoryFilter = 'AND p.category_id = ?';
    params.push(category_id);
  }

  const query = `
    SELECT 
      p.id,
      p.code,
      p.name,
      p.image,
      c.name as category_name,
      COALESCE(SUM(si.quantity), 0) as total_sold,
      COALESCE(SUM(si.subtotal), 0) as total_revenue,
      COALESCE(AVG(si.net_unit_price), p.price) as average_selling_price,
      p.cost,
      p.price as current_price,
      COALESCE(wp.quantity, p.quantity, 0) as current_stock,
      p.alert_quantity,
      COALESCE(SUM(si.quantity * (si.net_unit_price - p.cost)), 0) as total_profit,
      COUNT(DISTINCT si.sale_id) as total_orders,
      p.views
    FROM sma_products p
    LEFT JOIN sma_sale_items si ON p.id = si.product_id
    LEFT JOIN sma_sales s ON si.sale_id = s.id AND s.sale_status = 'completed'
    LEFT JOIN sma_categories c ON p.category_id = c.id
    LEFT JOIN (
      SELECT product_id, SUM(quantity) as quantity 
      FROM sma_warehouses_products 
      GROUP BY product_id
    ) wp ON p.id = wp.product_id
    WHERE p.hide = 0
    ${dateFilter}
    ${categoryFilter}
    GROUP BY p.id, p.code, p.name, p.cost, p.price, p.alert_quantity, p.views
    ORDER BY total_revenue DESC
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching product performance report:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const processedResults = results.map(row => ({
      ...row,
      total_sold: parseFloat(row.total_sold) || 0,
      total_revenue: parseFloat(row.total_revenue) || 0,
      average_selling_price: parseFloat(row.average_selling_price) || 0,
      cost: parseFloat(row.cost) || 0,
      current_price: parseFloat(row.current_price) || 0,
      current_stock: parseFloat(row.current_stock) || 0,
      alert_quantity: parseFloat(row.alert_quantity) || 0,
      total_profit: parseFloat(row.total_profit) || 0,
      profit_margin: row.total_revenue > 0 ? ((parseFloat(row.total_profit) / parseFloat(row.total_revenue)) * 100).toFixed(2) : 0,
      stock_status: parseFloat(row.current_stock) <= parseFloat(row.alert_quantity) ? 'Low Stock' : 'In Stock',
      image_url: getImageUrl(row.image, req)
    }));

    res.json({
      report_type: 'product_performance',
      period: { start_date, end_date },
      data: processedResults,
      summary: {
        total_products: processedResults.length,
        total_revenue: processedResults.reduce((sum, row) => sum + row.total_revenue, 0),
        total_profit: processedResults.reduce((sum, row) => sum + row.total_profit, 0),
        products_sold: processedResults.filter(row => row.total_sold > 0).length
      }
    });
  });
};

// Low Stock Report
const getLowStockReport = (req, res) => {
  const { warehouse_id } = req.query;
  
  let warehouseFilter = '';
  let params = [];
  
  if (warehouse_id) {
    warehouseFilter = 'AND (wp.warehouse_id = ? OR wp.warehouse_id IS NULL)';
    params.push(warehouse_id);
  }

  const query = `
    SELECT 
      p.id,
      p.code,
      p.name,
      p.image,
      c.name as category_name,
      COALESCE(SUM(wp.quantity), p.quantity, 0) as current_stock,
      p.alert_quantity,
      p.cost,
      p.price,
      CASE 
        WHEN COALESCE(SUM(wp.quantity), p.quantity, 0) = 0 THEN 'Out of Stock'
        WHEN COALESCE(SUM(wp.quantity), p.quantity, 0) <= p.alert_quantity THEN 'Low Stock'
        ELSE 'In Stock'
      END as stock_status,
      (p.alert_quantity - COALESCE(SUM(wp.quantity), p.quantity, 0)) as reorder_quantity
    FROM sma_products p
    LEFT JOIN sma_warehouses_products wp ON p.id = wp.product_id
    LEFT JOIN sma_categories c ON p.category_id = c.id
    WHERE p.hide = 0
    ${warehouseFilter}
    GROUP BY p.id, p.code, p.name, p.alert_quantity, p.cost, p.price
    HAVING current_stock <= p.alert_quantity
    ORDER BY current_stock ASC, p.name
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching low stock report:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const processedResults = results.map(row => ({
      ...row,
      current_stock: parseFloat(row.current_stock) || 0,
      alert_quantity: parseFloat(row.alert_quantity) || 0,
      cost: parseFloat(row.cost) || 0,
      price: parseFloat(row.price) || 0,
      reorder_quantity: Math.max(0, parseFloat(row.reorder_quantity) || 0),
      image_url: getImageUrl(row.image, req)
    }));

    res.json({
      report_type: 'low_stock',
      data: processedResults,
      summary: {
        total_low_stock_items: processedResults.length,
        out_of_stock_items: processedResults.filter(row => row.current_stock === 0).length,
        low_stock_items: processedResults.filter(row => row.current_stock > 0 && row.current_stock <= row.alert_quantity).length
      }
    });
  });
};

// Sales Summary Report
const getSalesSummaryReport = (req, res) => {
  const { start_date, end_date } = req.query;
  
  let dateFilter = '';
  let params = [];
  
  if (start_date && end_date) {
    dateFilter = 'AND DATE(s.date) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  } else {
    // Default to current month
    dateFilter = 'AND YEAR(s.date) = YEAR(CURDATE()) AND MONTH(s.date) = MONTH(CURDATE())';
  }

  const summaryQuery = `
    SELECT 
      COUNT(s.id) as total_sales,
      SUM(s.total) as gross_sales,
      SUM(s.total_discount) as total_discount,
      SUM(s.total_tax) as total_tax,
      SUM(s.grand_total) as net_sales,
      SUM(s.paid) as total_paid,
      SUM(s.grand_total - s.paid) as outstanding,
      AVG(s.grand_total) as average_sale_value,
      COUNT(DISTINCT s.customer_id) as unique_customers,
      SUM(s.total_items) as total_items_sold
    FROM sma_sales s
    WHERE s.sale_status = 'completed'
    ${dateFilter}
  `;

  const statusQuery = `
    SELECT 
      s.sale_status,
      s.payment_status,
      COUNT(*) as count,
      SUM(s.grand_total) as total_amount
    FROM sma_sales s
    WHERE 1=1
    ${dateFilter}
    GROUP BY s.sale_status, s.payment_status
  `;

  const paymentMethodQuery = `
    SELECT 
      p.paid_by as payment_method,
      COUNT(*) as transaction_count,
      SUM(p.amount) as total_amount
    FROM sma_payments p
    WHERE p.type = 'received'
    ${dateFilter}
    GROUP BY p.paid_by
    ORDER BY total_amount DESC
  `;

  // Execute all queries
  db.query(summaryQuery, params, (err, summaryResults) => {
    if (err) {
      console.error('Error fetching sales summary:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    db.query(statusQuery, params, (err, statusResults) => {
      if (err) {
        console.error('Error fetching status breakdown:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      db.query(paymentMethodQuery, params, (err, paymentResults) => {
        if (err) {
          console.error('Error fetching payment methods:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        const summary = summaryResults[0] || {};
        const processedSummary = {
          total_sales: summary.total_sales || 0,
          gross_sales: parseFloat(summary.gross_sales) || 0,
          total_discount: parseFloat(summary.total_discount) || 0,
          total_tax: parseFloat(summary.total_tax) || 0,
          net_sales: parseFloat(summary.net_sales) || 0,
          total_paid: parseFloat(summary.total_paid) || 0,
          outstanding: parseFloat(summary.outstanding) || 0,
          average_sale_value: parseFloat(summary.average_sale_value) || 0,
          unique_customers: summary.unique_customers || 0,
          total_items_sold: summary.total_items_sold || 0
        };

        const processedStatus = statusResults.map(row => ({
          ...row,
          total_amount: parseFloat(row.total_amount) || 0
        }));

        const processedPayments = paymentResults.map(row => ({
          ...row,
          total_amount: parseFloat(row.total_amount) || 0
        }));

        res.json({
          report_type: 'sales_summary',
          period: { start_date, end_date },
          summary: processedSummary,
          status_breakdown: processedStatus,
          payment_methods: processedPayments
        });
      });
    });
  });
};

// Warehouse Stock Report
const getWarehouseStockReport = (req, res) => {
  const { warehouse_id } = req.query;
  
  let warehouseFilter = '';
  let params = [];
  
  if (warehouse_id) {
    warehouseFilter = 'AND w.id = ?';
    params.push(warehouse_id);
  }

  const query = `
    SELECT 
      w.id as warehouse_id,
      w.name as warehouse_name,
      w.code as warehouse_code,
      p.id as product_id,
      p.code as product_code,
      p.name as product_name,
      p.image,
      c.name as category_name,
      COALESCE(wp.quantity, 0) as stock_quantity,
      wp.avg_cost,
      p.price,
      COALESCE(wp.quantity, 0) * COALESCE(wp.avg_cost, p.cost, 0) as stock_value,
      p.alert_quantity,
      CASE 
        WHEN COALESCE(wp.quantity, 0) = 0 THEN 'Out of Stock'
        WHEN COALESCE(wp.quantity, 0) <= p.alert_quantity THEN 'Low Stock'
        ELSE 'In Stock'
      END as stock_status
    FROM sma_warehouses w
    CROSS JOIN sma_products p
    LEFT JOIN sma_warehouses_products wp ON w.id = wp.warehouse_id AND p.id = wp.product_id
    LEFT JOIN sma_categories c ON p.category_id = c.id
    WHERE p.hide = 0
    ${warehouseFilter}
    ORDER BY w.name, p.name
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching warehouse stock report:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const processedResults = results.map(row => ({
      ...row,
      stock_quantity: parseFloat(row.stock_quantity) || 0,
      avg_cost: parseFloat(row.avg_cost) || 0,
      price: parseFloat(row.price) || 0,
      stock_value: parseFloat(row.stock_value) || 0,
      alert_quantity: parseFloat(row.alert_quantity) || 0,
      image_url: getImageUrl(row.image, req)
    }));

    // Group by warehouse
    const warehouseGroups = {};
    processedResults.forEach(row => {
      if (!warehouseGroups[row.warehouse_id]) {
        warehouseGroups[row.warehouse_id] = {
          warehouse_id: row.warehouse_id,
          warehouse_name: row.warehouse_name,
          warehouse_code: row.warehouse_code,
          products: [],
          summary: {
            total_products: 0,
            total_stock_value: 0,
            low_stock_items: 0,
            out_of_stock_items: 0
          }
        };
      }
      
      warehouseGroups[row.warehouse_id].products.push(row);
      warehouseGroups[row.warehouse_id].summary.total_products++;
      warehouseGroups[row.warehouse_id].summary.total_stock_value += row.stock_value;
      
      if (row.stock_status === 'Low Stock') {
        warehouseGroups[row.warehouse_id].summary.low_stock_items++;
      } else if (row.stock_status === 'Out of Stock') {
        warehouseGroups[row.warehouse_id].summary.out_of_stock_items++;
      }
    });

    res.json({
      report_type: 'warehouse_stock',
      data: Object.values(warehouseGroups)
    });
  });
};

// Sales by Customer Report
const getSalesByCustomerReport = (req, res) => {
  const { customer_id, start_date, end_date } = req.query;
  
  let customerFilter = '';
  let dateFilter = '';
  let params = [];
  
  if (customer_id) {
    customerFilter = 'AND s.customer_id = ?';
    params.push(customer_id);
  }
  
  if (start_date && end_date) {
    dateFilter = 'AND DATE(s.date) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  const query = `
    SELECT 
      s.id as sale_id,
      s.reference_no,
      s.date,
      s.customer_id,
      s.customer,
      c.company,
      c.phone,
      c.email,
      s.total,
      s.total_discount,
      s.total_tax,
      s.grand_total,
      s.paid,
      (s.grand_total - s.paid) as balance,
      s.sale_status,
      s.payment_status,
      s.total_items
    FROM sma_sales s
    LEFT JOIN sma_companies c ON s.customer_id = c.id
    WHERE 1=1
    ${customerFilter}
    ${dateFilter}
    ORDER BY s.date DESC
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching sales by customer report:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const processedResults = results.map(row => ({
      ...row,
      total: parseFloat(row.total) || 0,
      total_discount: parseFloat(row.total_discount) || 0,
      total_tax: parseFloat(row.total_tax) || 0,
      grand_total: parseFloat(row.grand_total) || 0,
      paid: parseFloat(row.paid) || 0,
      balance: parseFloat(row.balance) || 0
    }));

    const summary = {
      total_sales: processedResults.length,
      total_amount: processedResults.reduce((sum, row) => sum + row.grand_total, 0),
      total_paid: processedResults.reduce((sum, row) => sum + row.paid, 0),
      total_outstanding: processedResults.reduce((sum, row) => sum + row.balance, 0),
      average_sale_value: processedResults.length > 0 ? 
        processedResults.reduce((sum, row) => sum + row.grand_total, 0) / processedResults.length : 0
    };

    res.json({
      report_type: 'sales_by_customer',
      period: { start_date, end_date },
      customer_id,
      data: processedResults,
      summary
    });
  });
};

module.exports = {
  getDailySalesReport,
  getMonthlySalesReport,
  getTopSellingProducts,
  getStockLevelsReport,
  getProfitLossReport,
  getTopCustomersReport,
  getCategorySalesReport,
  getPaymentsReport,
  getProductPerformanceReport,
  getLowStockReport,
  getSalesSummaryReport,
  getWarehouseStockReport,
  getSalesByCustomerReport
};

