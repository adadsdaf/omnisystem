import { Router } from "express";
import { db } from "../lib/sqlite";
import { getAuthUser } from "./auth";

const router = Router();

function requireAuth(req: any, res: any): any {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return null; }
  return user;
}

function requireAdmin(req: any, res: any): boolean {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "غير مصرح" });
    return false;
  }
  return true;
}

router.get("/returns", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { startDate, endDate, search } = req.query as any;
  let sql = `
    SELECT r.*, u.name as cashier_name, c.name as customer_name
    FROM returns r
    LEFT JOIN users u ON u.id=r.user_id
    LEFT JOIN customers c ON c.id=r.customer_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (startDate) { sql += " AND DATE(r.created_at)>=?"; params.push(startDate); }
  if (endDate) { sql += " AND DATE(r.created_at)<=?"; params.push(endDate); }
  if (search) { sql += " AND (r.return_number LIKE ? OR r.invoice_number LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
  sql += " ORDER BY r.created_at DESC";
  const rows = db.prepare(sql).all(...params) as any[];
  const result = rows.map(r => {
    const items = db.prepare("SELECT * FROM return_items WHERE return_id=?").all(r.id);
    return { ...r, items };
  });
  res.json(result);
});

router.get("/returns/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const row = db.prepare(`
    SELECT r.*, u.name as cashier_name, c.name as customer_name
    FROM returns r
    LEFT JOIN users u ON u.id=r.user_id
    LEFT JOIN customers c ON c.id=r.customer_id
    WHERE r.id=?
  `).get(req.params.id) as any;
  if (!row) { res.status(404).json({ error: "المرتجع غير موجود" }); return; }
  row.items = db.prepare("SELECT * FROM return_items WHERE return_id=?").all(row.id);
  res.json(row);
});

router.post("/returns", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const { invoice_number, order_id, reason, payment_method, customer_id, notes, items } = req.body;
  if (!invoice_number || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "رقم الفاتورة والمنتجات المرتجعة مطلوبة" });
    return;
  }
  const total_refund = items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0);
  const countRow = db.prepare("SELECT COUNT(*) as c FROM returns").get() as { c: number };
  const returnNum = `RET-${String(countRow.c + 1).padStart(4, "0")}-${Date.now().toString().slice(-6)}`;
  const r = db.prepare(`
    INSERT INTO returns (return_number, invoice_number, order_id, reason, total_refund, payment_method, customer_id, user_id, notes)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(returnNum, invoice_number, order_id ?? null, reason ?? null, total_refund, payment_method ?? "cash", customer_id ?? null, user.id, notes ?? null);
  const returnId = r.lastInsertRowid;
  const insertItem = db.prepare(`
    INSERT INTO return_items (return_id, product_id, product_name, quantity, unit_price, total)
    VALUES (?,?,?,?,?,?)
  `);
  for (const item of items) {
    insertItem.run(returnId, item.product_id ?? null, item.product_name, item.quantity, item.unit_price, item.unit_price * item.quantity);
    if (item.product_id) {
      db.prepare("UPDATE products SET stock = COALESCE(stock, 0) + ? WHERE id=?").run(item.quantity, item.product_id);
    }
  }
  const created = db.prepare(`
    SELECT r.*, u.name as cashier_name FROM returns r
    LEFT JOIN users u ON u.id=r.user_id WHERE r.id=?
  `).get(returnId) as any;
  created.items = db.prepare("SELECT * FROM return_items WHERE return_id=?").all(returnId);
  res.status(201).json(created);
});

router.delete("/returns/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const row = db.prepare("SELECT * FROM returns WHERE id=?").get(req.params.id) as any;
  if (!row) { res.status(404).json({ error: "غير موجود" }); return; }
  const returnItems = db.prepare("SELECT * FROM return_items WHERE return_id=?").all(row.id) as any[];
  for (const item of returnItems) {
    if (item.product_id) {
      db.prepare("UPDATE products SET stock = MAX(0, COALESCE(stock, 0) - ?) WHERE id=?").run(item.quantity, item.product_id);
    }
  }
  db.prepare("DELETE FROM returns WHERE id=?").run(req.params.id);
  res.status(204).send();
});

router.get("/returns-summary", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";
  const todayStats = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total_refund),0) as total FROM returns WHERE DATE(created_at)=?").get(today) as any;
  const monthStats = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total_refund),0) as total FROM returns WHERE DATE(created_at)>=?").get(monthStart) as any;
  const totalCount = (db.prepare("SELECT COUNT(*) as c FROM returns").get() as any).c;
  res.json({
    todayCount: todayStats.count,
    todayTotal: todayStats.total,
    monthCount: monthStats.count,
    monthTotal: monthStats.total,
    totalCount,
  });
});

export default router;
