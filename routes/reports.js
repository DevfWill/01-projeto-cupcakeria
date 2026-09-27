const express = require('express');
const { getDb } = require('../utils/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// HU20 - Como administrador, quero visualizar relatórios de vendas e desempenho.
router.get('/sales', requireAdmin, (req, res) => {
  const db = getDb();
  const { from, to } = req.query;

  let sql = "SELECT * FROM orders WHERE status != 'cancelado'";
  const params = [];
  if (from) { sql += ' AND datetime(created_at) >= datetime(?)'; params.push(from); }
  if (to) { sql += ' AND datetime(created_at) <= datetime(?)'; params.push(to); }
  const orders = db.prepare(sql).all(...params);

  const totalRevenue = +orders.reduce((sum, o) => sum + o.total, 0).toFixed(2);
  const totalOrders = orders.length;
  const averageTicket = totalOrders ? +(totalRevenue / totalOrders).toFixed(2) : 0;

  const revenueByDay = {};
  const productSales = {};
  const itemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');

  for (const order of orders) {
    const day = order.created_at.slice(0, 10);
    revenueByDay[day] = +((revenueByDay[day] || 0) + order.total).toFixed(2);

    for (const item of itemsStmt.all(order.id)) {
      if (!productSales[item.product_id]) {
        productSales[item.product_id] = { productId: item.product_id, name: item.product_name, qty: 0, revenue: 0 };
      }
      productSales[item.product_id].qty += item.qty;
      productSales[item.product_id].revenue = +(productSales[item.product_id].revenue + item.line_total).toFixed(2);
    }
  }

  const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 10);

  const ordersByStatus = db.prepare('SELECT status, COUNT(*) AS count FROM orders GROUP BY status').all()
    .reduce((acc, r) => { acc[r.status] = r.count; return acc; }, {});

  res.json({
    totalRevenue, totalOrders, averageTicket,
    revenueByDay: Object.entries(revenueByDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, total })),
    topProducts, ordersByStatus
  });
});

module.exports = router;
