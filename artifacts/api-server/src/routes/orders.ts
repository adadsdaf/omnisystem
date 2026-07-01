import { Router } from "express";
import { db } from "../lib/sqlite";
import { getAuthUser } from "./auth";

const router = Router();

function formatOrder(o: any, items: any[]) {
  return {
    id: o.id,
    invoiceNumber: o.invoice_number,
    subtotal: o.subtotal,
    discount: o.discount,
    tax: o.tax,
    total: o.total,
    paymentMethod: o.payment_method,
    cashAmount: o.cash_amount,
    cardAmount: o.card_amount,
    customerId: o.customer_id,
    customerName: o.customer_name,
    userId: o.user_id,
    userName: o.user_name,
    note: o.note,
    orderType: o.order_type ?? "dine-in",
    tableNumber: o.table_number ?? null,
    createdAt: o.created_at,
    items: items.map(i => ({
      productId: i.product_id,
      productName: i.product_name,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      total: i.total,
      categoryId: i.category_id ?? null,
      categoryName: i.category_name ?? null,
    })),
  };
}

router.get("/orders", (req, res) => {
  const { startDate, endDate, userId, orderType } = req.query;
  let sql = `
    SELECT o.*, u.name as user_name, c.name as customer_name
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (startDate) { sql += " AND DATE(o.created_at) >= ?"; params.push(startDate); }
  if (endDate) { sql += " AND DATE(o.created_at) <= ?"; params.push(endDate); }
  if (userId) { sql += " AND o.user_id=?"; params.push(userId); }
  if (orderType) { sql += " AND o.order_type=?"; params.push(orderType); }
  sql += " ORDER BY o.created_at DESC LIMIT 200";
  const orders = db.prepare(sql).all(...params) as any[];
  const result = orders.map(o => {
    const items = db.prepare("SELECT * FROM order_items WHERE order_id=?").all(o.id) as any[];
    return formatOrder(o, items);
  });
  res.json(result);
});

router.post("/orders", (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser) { res.status(401).json({ error: "غير مصرح" }); return; }
  const { items, paymentMethod, subtotal, discount, tax, total, cashAmount, cardAmount, customerId, userId, note, orderType, tableNumber } = req.body;
  if (!items?.length) { res.status(400).json({ error: "لا توجد منتجات" }); return; }

  const count = db.prepare("SELECT COUNT(*) as c FROM orders").get() as { c: number };
  const invoiceNumber = `INV-${String(count.c + 1).padStart(4, "0")}`;
  const effectiveUserId = userId ?? authUser.id;

  const r = db.prepare(`
    INSERT INTO orders (invoice_number, subtotal, discount, tax, total, payment_method, cash_amount, card_amount, customer_id, user_id, note, order_type, table_number)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    invoiceNumber,
    subtotal ?? 0,
    discount ?? 0,
    tax ?? 0,
    total,
    paymentMethod ?? "cash",
    cashAmount ?? null,
    cardAmount ?? null,
    customerId ?? null,
    effectiveUserId,
    note ?? null,
    orderType ?? "dine-in",
    tableNumber ?? null,
  );
  const orderId = r.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total, category_id, category_name)
    VALUES (?,?,?,?,?,?,?,?)
  `);
  for (const item of items) {
    const prod = db.prepare("SELECT p.*, c.name as cat_name FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.id=?").get(item.productId) as any;
    const name = prod?.name ?? "منتج محذوف";
    insertItem.run(orderId, item.productId, name, item.quantity, item.unitPrice, item.quantity * item.unitPrice, prod?.category_id ?? null, prod?.cat_name ?? null);
  }

  const order = db.prepare(`
    SELECT o.*, u.name as user_name, c.name as customer_name
    FROM orders o LEFT JOIN users u ON u.id=o.user_id LEFT JOIN customers c ON c.id=o.customer_id
    WHERE o.id=?
  `).get(orderId) as any;
  const orderItems = db.prepare("SELECT * FROM order_items WHERE order_id=?").all(orderId) as any[];
  res.status(201).json(formatOrder(order, orderItems));
});

router.get("/orders/:id", (req, res) => {
  const order = db.prepare(`
    SELECT o.*, u.name as user_name, c.name as customer_name
    FROM orders o LEFT JOIN users u ON u.id=o.user_id LEFT JOIN customers c ON c.id=o.customer_id
    WHERE o.id=?
  `).get(req.params.id) as any;
  if (!order) { res.status(404).json({ error: "غير موجود" }); return; }
  const items = db.prepare("SELECT * FROM order_items WHERE order_id=?").all(order.id) as any[];
  res.json(formatOrder(order, items));
});

router.delete("/orders/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") { res.status(403).json({ error: "غير مصرح" }); return; }
  db.prepare("DELETE FROM orders WHERE id=?").run(req.params.id);
  res.status(204).send();
});

export default router;
