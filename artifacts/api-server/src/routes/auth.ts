import { Router } from "express";
import { db, verifyPassword, createSession, getSessionUser, deleteSession } from "../lib/sqlite";
import { logger } from "../lib/logger";

const router = Router();

function getAuthUser(req: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const userId = getSessionUser(token);
  if (!userId) return null;
  const user = db.prepare("SELECT id, username, name, role, active FROM users WHERE id=?").get(userId) as any;
  return user;
}

router.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "بيانات ناقصة" });
    return;
  }
  const user = db.prepare("SELECT * FROM users WHERE username=?").get(username) as any;
  if (!user || !user.active) {
    res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    return;
  }
  const ok = verifyPassword(password, user.password_hash);
  if (!ok) {
    res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    return;
  }
  const token = createSession(user.id);
  res.json({
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role, active: Boolean(user.active) },
  });
});

router.get("/auth/me", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }
  res.json({ id: user.id, username: user.username, name: user.name, role: user.role, active: Boolean(user.active) });
});

router.post("/auth/logout", (req, res) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    deleteSession(auth.slice(7));
  }
  res.json({ ok: true });
});

export { getAuthUser };
export default router;
