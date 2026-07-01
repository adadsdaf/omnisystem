const Database = require("better-sqlite3");
const crypto = require("crypto");

const db = new Database("artifacts/api-server/data/pos.db");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const username = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || "مستخدم جديد";
const role = process.argv[5] || "admin";

if (!username || !password) {
  console.error("Usage: node create-admin.mjs <username> <password> [name] [role]");
  process.exit(1);
}

const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
if (existing) {
  console.error(`المستخدم "${username}" موجود بالفعل`);
  process.exit(1);
}

const hash = hashPassword(password);
const r = db.prepare(
  "INSERT INTO users (username, password_hash, name, role, active) VALUES (?,?,?,?,1)"
).run(username, hash, name, role);

console.log(`تم إنشاء المستخدم بنجاح: ${name} | ${username} | ${role} | id=${r.lastInsertRowid}`);
