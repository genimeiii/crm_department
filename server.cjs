require('dotenv').config(); 
// server.cjs
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Connect to Neon PostgreSQL using .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.static(path.join(__dirname, 'public')));

// Dashboard API
app.get('/api/dashboard-data', async (req, res) => {
  try {
    const client = await pool.connect();

    // Summary stats
    const totalCustomers = (await client.query(
      `SELECT COUNT(*)::int AS total FROM customers`
    )).rows[0].total;

    const activeOrders = (await client.query(
      `SELECT COUNT(*)::int AS total 
       FROM sales_orders 
       WHERE order_status IN ('pending','processing','shipped')`
    )).rows[0].total;

    const openOpportunities = (await client.query(
      `SELECT COUNT(*)::int AS total 
       FROM opportunities 
       WHERE opportunity_status = 'open'`
    )).rows[0].total;

    const totalRevenue = (await client.query(
      `SELECT COALESCE(SUM(total_amount),0)::float AS total 
       FROM sales_orders 
       WHERE payment_status = 'paid'`
    )).rows[0].total;

    // Sales trend (last 6 months)
    const salesTrend = (await client.query(
      `SELECT TO_CHAR(order_date, 'Mon') AS month, 
              SUM(total_amount)::float AS amount
       FROM sales_orders
       WHERE order_date >= CURRENT_DATE - INTERVAL '6 months'
       GROUP BY TO_CHAR(order_date, 'Mon'), DATE_TRUNC('month', order_date)
       ORDER BY DATE_TRUNC('month', order_date)`
    )).rows;

    // New leads this week
    const newLeads = (await client.query(
      `SELECT CONCAT(c.first_name, ' ', c.last_name) AS name, 
              sl.lead_status AS interest, 
              sl.lead_source AS source, 
              sl.assigned_to
       FROM sales_leads sl
       LEFT JOIN customers c ON sl.customer_id = c.customer_id
       WHERE sl.created_at >= CURRENT_DATE - INTERVAL '7 days'`
    )).rows;

    // Top customers by number of orders
    const topCustomers = (await client.query(
      `SELECT CONCAT(c.first_name, ' ', c.last_name) AS category, 
              COUNT(so.order_id)::int AS total_orders
       FROM sales_orders so
       JOIN customers c ON so.customer_id = c.customer_id
       GROUP BY c.first_name, c.last_name
       ORDER BY total_orders DESC
       LIMIT 5`
    )).rows;

    // Opportunities by stage
    const opportunities = (await client.query(
      `SELECT opportunity_status AS stage, 
              COUNT(*)::int AS count, 
              SUM(potential_value)::float AS total_value
       FROM opportunities
       GROUP BY opportunity_status`
    )).rows;

    client.release();

    res.json({
      summary: { totalCustomers, activeOrders, openOpportunities, totalRevenue },
      salesTrend,
      newLeads,
      topCustomers,
      opportunities
    });

  } catch (err) {
    console.error('Dashboard API error:', err);
    res.status(500).json({
      error: 'Server error',
      detail: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});