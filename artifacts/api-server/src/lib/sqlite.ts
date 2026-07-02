import Database from "better-sqlite3";
import path from "node:path";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const dbPath = path.resolve(workspaceRoot, "artifacts/api-server/data/pos.db");

import { mkdirSync } from "node:fs";
mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(":");
  const hash = scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(storedHash, "hex");
  return timingSafeEqual(hash, storedBuf);
}

export const sessions = new Map<string, number>();

export function createSession(userId: number): string {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, userId);
  return token;
}

export function getSessionUser(token: string): number | undefined {
  return sessions.get(token);
}

export function deleteSession(token: string): void {
  sessions.delete(token);
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier',
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER UNIQUE NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      cost REAL,
      barcode TEXT,
      category_id INTEGER REFERENCES categories(id),
      active INTEGER NOT NULL DEFAULT 1,
      stock INTEGER
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      cash_amount REAL,
      card_amount REAL,
      customer_id INTEGER REFERENCES customers(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      note TEXT,
      order_type TEXT NOT NULL DEFAULT 'dine-in',
      table_number TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      category_name TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS receipt_copy_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      copy_number INTEGER NOT NULL,
      label TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS department_print_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
      printer_name TEXT,
      copies INTEGER NOT NULL DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 1,
      print_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS print_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      invoice_number TEXT NOT NULL,
      receipt_type TEXT NOT NULL,
      department_name TEXT,
      printer_name TEXT,
      printed_at TEXT NOT NULL DEFAULT (datetime('now')),
      user_id INTEGER NOT NULL,
      user_name TEXT,
      copies INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'success',
      reprint_reason TEXT,
      reprint_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS printer_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      paper_width INTEGER NOT NULL DEFAULT 80,
      left_margin REAL NOT NULL DEFAULT 4,
      right_margin REAL NOT NULL DEFAULT 4,
      top_margin REAL NOT NULL DEFAULT 2,
      bottom_margin REAL NOT NULL DEFAULT 2,
      font_size INTEGER NOT NULL DEFAULT 10,
      line_spacing REAL NOT NULL DEFAULT 2,
      characters_per_line INTEGER NOT NULL DEFAULT 48
    );

    CREATE TABLE IF NOT EXISTS hr_departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      budget REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS hr_employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      position TEXT,
      department_id INTEGER REFERENCES hr_departments(id),
      basic_salary REAL NOT NULL DEFAULT 0,
      hire_date TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS hr_salaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      basic_salary REAL NOT NULL DEFAULT 0,
      bonuses REAL NOT NULL DEFAULT 0,
      deductions REAL NOT NULL DEFAULT 0,
      net_salary REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hr_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      status TEXT NOT NULL DEFAULT 'present',
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT UNIQUE NOT NULL,
      invoice_number TEXT NOT NULL,
      order_id INTEGER,
      reason TEXT,
      total_refund REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      customer_id INTEGER REFERENCES customers(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL
    );
  `);
}

function runMigrations() {
  // orders table migrations
  try { db.exec("ALTER TABLE order_items ADD COLUMN category_id INTEGER REFERENCES categories(id)"); } catch {}
  try { db.exec("ALTER TABLE order_items ADD COLUMN category_name TEXT"); } catch {}
  try { db.exec("ALTER TABLE orders ADD COLUMN order_type TEXT NOT NULL DEFAULT 'dine-in'"); } catch {}
  try { db.exec("ALTER TABLE orders ADD COLUMN table_number TEXT"); } catch {}
  try { db.exec("ALTER TABLE printer_settings ADD COLUMN main_printer_name TEXT"); } catch {}
  // printer_settings default row
  try {
    db.exec(`INSERT OR IGNORE INTO printer_settings (id, paper_width, left_margin, right_margin, top_margin, bottom_margin, font_size, line_spacing, characters_per_line)
             VALUES (1, 80, 4, 4, 2, 2, 10, 2, 48)`);
  } catch {}
}

function seedData() {
  const userCount = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
  if (userCount > 0) return;

  const adminHash = hashPassword("admin123");
  const cashierHash = hashPassword("cashier123");

  db.prepare(`INSERT INTO users (username, password_hash, name, role, active) VALUES (?,?,?,?,1)`)
    .run("admin", adminHash, "مدير النظام", "admin");
  db.prepare(`INSERT INTO users (username, password_hash, name, role, active) VALUES (?,?,?,?,1)`)
    .run("cashier", cashierHash, "الكاشير الأول", "cashier");

  const categories = [
    { name: "المطبخ", color: "#f59e0b" },
    { name: "العصائر", color: "#3b82f6" },
    { name: "الحلويات", color: "#ec4899" },
    { name: "الشاورما", color: "#10b981" },
  ];
  const insertCat = db.prepare("INSERT INTO categories (name, color) VALUES (?,?)");
  const catIds: number[] = [];
  for (const cat of categories) {
    const r = insertCat.run(cat.name, cat.color);
    catIds.push(r.lastInsertRowid as number);
  }

  const products = [
    { number: 1, name: "برياني دجاج", price: 14000, cost: 8000, category_id: catIds[0] },
    { number: 2, name: "رز أبيض", price: 6500, cost: 3000, category_id: catIds[0] },
    { number: 3, name: "دجاج مشوي", price: 18000, cost: 10000, category_id: catIds[0] },
    { number: 4, name: "لحم مشوي", price: 25000, cost: 15000, category_id: catIds[0] },
    { number: 5, name: "سمك مقلي", price: 20000, cost: 12000, category_id: catIds[0] },
    { number: 6, name: "عصير برتقال", price: 3000, cost: 1000, category_id: catIds[1] },
    { number: 7, name: "شاي", price: 1500, cost: 500, category_id: catIds[1] },
    { number: 8, name: "ماء معدني", price: 1000, cost: 300, category_id: catIds[1] },
    { number: 9, name: "كولا", price: 2000, cost: 800, category_id: catIds[1] },
    { number: 10, name: "كيك شوكولاتة", price: 5000, cost: 2500, category_id: catIds[2] },
    { number: 11, name: "آيس كريم", price: 4000, cost: 1500, category_id: catIds[2] },
    { number: 12, name: "شاورما دجاج", price: 8000, cost: 4000, category_id: catIds[3] },
    { number: 13, name: "شاورما لحم", price: 10000, cost: 5000, category_id: catIds[3] },
    { number: 14, name: "فتة", price: 8000, cost: 4000, category_id: catIds[0] },
    { number: 15, name: "مرق لحم", price: 5000, cost: 2000, category_id: catIds[0] },
  ];

  const insertProd = db.prepare(
    "INSERT INTO products (number, name, price, cost, category_id, active) VALUES (?,?,?,?,?,1)"
  );
  for (const p of products) {
    insertProd.run(p.number, p.name, p.price, p.cost, p.category_id);
  }

  const defaultSettings: [string, string][] = [
    ["businessName", "مطعم إتقان"],
    ["address", "الرياض، المملكة العربية السعودية"],
    ["phone", "0501234567"],
    ["taxNumber", "300000000000003"],
    ["taxRate", "15"],
    ["currency", "ريال"],
    ["receiptMessage", "شكراً لزيارتكم - يسعدنا خدمتكم"],
    ["printLogo", "true"],
    ["printQr", "false"],
    ["showCashier", "true"],
    ["showCustomer", "true"],
    ["receiptPaperSize", "80mm"],
    ["showOrderNumber", "true"],
    ["showTableNumber", "true"],
    ["showDateTime", "true"],
    ["showBarcode", "false"],
    ["showOrderType", "true"],
    ["showTax", "true"],
    ["showDiscount", "true"],
    ["showNotes", "true"],
    ["autoPrintTrigger", "after_payment"],
    ["maxReprintCount", "3"],
    ["masterCopiesCount", "1"],
    ["logoUrl", ""],
  ];
  const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?,?)");
  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }

  // Seed receipt copy configs
  const copyConfigs = [
    { copy_number: 1, label: "نسخة العميل" },
    { copy_number: 2, label: "نسخة الكاشير" },
    { copy_number: 3, label: "نسخة المحاسبة" },
    { copy_number: 4, label: "نسخة الأرشيف" },
  ];
  const insertCopy = db.prepare("INSERT OR IGNORE INTO receipt_copy_configs (copy_number, label, enabled) VALUES (?,?,?)");
  for (const c of copyConfigs) {
    insertCopy.run(c.copy_number, c.label, c.copy_number <= 2 ? 1 : 0);
  }

  // Seed department print configs
  const insertDept = db.prepare(
    "INSERT OR IGNORE INTO department_print_configs (category_id, printer_name, copies, enabled, print_order) VALUES (?,?,?,?,?)"
  );
  catIds.forEach((cid, idx) => {
    insertDept.run(cid, null, 1, 1, idx + 1);
  });

  const now = new Date();
  const adminUser = db.prepare("SELECT id FROM users WHERE username='admin'").get() as { id: number };

  const insertOrder = db.prepare(`
    INSERT INTO orders (invoice_number, subtotal, discount, tax, total, payment_method, cash_amount, user_id, created_at)
    VALUES (?,?,?,?,?,?,?,?,?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total, category_id, category_name)
    VALUES (?,?,?,?,?,?,?,?)
  `);

  for (let i = 0; i < 20; i++) {
    const d = new Date(now);
    d.setHours(d.getHours() - i * 2);
    const subtotal = 20500 + i * 3000;
    const tax = Math.round(subtotal * 0.15);
    const total = subtotal + tax;
    const invNum = `INV-${String(i + 1).padStart(4, "0")}`;
    const result = insertOrder.run(invNum, subtotal, 0, tax, total, "cash", total, adminUser.id, d.toISOString());
    const orderId = result.lastInsertRowid;
    insertItem.run(orderId, 1, "برياني دجاج", 4, 14000, 56000, catIds[0], "المطبخ");
    insertItem.run(orderId, 2, "رز أبيض", 5, 6500, 32500, catIds[0], "المطبخ");
  }
}

initSchema();
runMigrations();
seedData();
