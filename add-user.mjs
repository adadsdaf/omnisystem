import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('data/pos.db');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('aymen');
if (existing) {
  console.log('المستخدم موجود بالفعل');
  process.exit(1);
}

const hash = hashPassword('123456');
const r = db.prepare(
  'INSERT INTO users (username, password_hash, name, role, active) VALUES (?,?,?,?,1)'
).run('aymen', hash, 'aymen', 'admin');

console.log(`تم إنشاء المستخدم بنجاح: id=${r.lastInsertRowid}`);