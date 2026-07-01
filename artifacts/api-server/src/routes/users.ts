import { Router } from "express";
import { db, hashPassword } from "../lib/sqlite";
import { getAuthUser } from "./auth";

const router = Router();

const toUser = (u: any) => ({ id: u.id, username: u.username, name: u.name, role: u.role, active: Boolean(u.active) });

router.get("/users", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") { res.status(403).json({ error: "غير مصرح" }); return; }
  const rows = db.prepare("SELECT id, username, name, role, active FROM users ORDER BY name").all();
  res.json((rows as any[]).map(toUser));
});

router.post("/users", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") { res.status(403).json({ error: "غير مصرح" }); return; }
  const { username, name, role, password, active } = req.body;
  if (!username || !name || !role || !password) { res.status(400).json({ error: "بيانات ناقصة" }); return; }
  const hash = hashPassword(password);
  const r = db.prepare("INSERT INTO users (username, password_hash, name, role, active) VALUES (?,?,?,?,?)").run(username, hash, name, role, active !== false ? 1 : 0);
  const u = db.prepare("SELECT id, username, name, role, active FROM users WHERE id=?").get(r.lastInsertRowid) as any;
  res.status(201).json(toUser(u));
});

router.put("/users/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") { res.status(403).json({ error: "غير مصرح" }); return; }
  const { username, name, role, password, active } = req.body;
  if (password) {
    const hash = hashPassword(password);
    db.prepare("UPDATE users SET username=?, name=?, role=?, password_hash=?, active=? WHERE id=?").run(username, name, role, hash, active !== false ? 1 : 0, req.params.id);
  } else {
    db.prepare("UPDATE users SET username=?, name=?, role=?, active=? WHERE id=?").run(username, name, role, active !== false ? 1 : 0, req.params.id);
  }
  const u = db.prepare("SELECT id, username, name, role, active FROM users WHERE id=?").get(req.params.id) as any;
  res.json(toUser(u));
});

router.delete("/users/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") { res.status(403).json({ error: "غير مصرح" }); return; }
  db.prepare("DELETE FROM users WHERE id=?").run(req.params.id);
  res.status(204).send();
});

export default router;
