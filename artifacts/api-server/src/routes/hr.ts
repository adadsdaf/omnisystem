import { Router } from "express";
import { db } from "../lib/sqlite";
import { getAuthUser } from "./auth";

const router = Router();

function requireAdmin(req: any, res: any): boolean {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "غير مصرح" });
    return false;
  }
  return true;
}

/* ── Departments ── */
router.get("/hr/departments", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const rows = db.prepare("SELECT * FROM hr_departments ORDER BY name").all();
  res.json(rows);
});

router.post("/hr/departments", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { name, budget } = req.body;
  if (!name) { res.status(400).json({ error: "اسم القسم مطلوب" }); return; }
  const r = db.prepare("INSERT INTO hr_departments (name, budget) VALUES (?,?)").run(name, budget ?? 0);
  res.status(201).json(db.prepare("SELECT * FROM hr_departments WHERE id=?").get(r.lastInsertRowid));
});

router.put("/hr/departments/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { name, budget } = req.body;
  db.prepare("UPDATE hr_departments SET name=?, budget=? WHERE id=?").run(name, budget ?? 0, req.params.id);
  res.json(db.prepare("SELECT * FROM hr_departments WHERE id=?").get(req.params.id));
});

router.delete("/hr/departments/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  db.prepare("DELETE FROM hr_departments WHERE id=?").run(req.params.id);
  res.status(204).send();
});

/* ── Employees ── */
router.get("/hr/employees", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const rows = db.prepare(`
    SELECT e.*, d.name as department_name
    FROM hr_employees e
    LEFT JOIN hr_departments d ON d.id = e.department_id
    ORDER BY e.name
  `).all() as any[];
  res.json(rows.map(r => ({ ...r, active: Boolean(r.active) })));
});

router.get("/hr/employees/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const row = db.prepare(`
    SELECT e.*, d.name as department_name
    FROM hr_employees e LEFT JOIN hr_departments d ON d.id=e.department_id
    WHERE e.id=?
  `).get(req.params.id) as any;
  if (!row) { res.status(404).json({ error: "غير موجود" }); return; }
  res.json({ ...row, active: Boolean(row.active) });
});

router.post("/hr/employees", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { employee_number, name, phone, position, department_id, basic_salary, hire_date, active } = req.body;
  if (!name || !employee_number) { res.status(400).json({ error: "الاسم ورقم الموظف مطلوبان" }); return; }
  const r = db.prepare(`
    INSERT INTO hr_employees (employee_number, name, phone, position, department_id, basic_salary, hire_date, active)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(employee_number, name, phone ?? null, position ?? null, department_id ?? null, basic_salary ?? 0, hire_date ?? null, active !== false ? 1 : 0);
  const emp = db.prepare(`
    SELECT e.*, d.name as department_name FROM hr_employees e
    LEFT JOIN hr_departments d ON d.id=e.department_id WHERE e.id=?
  `).get(r.lastInsertRowid) as any;
  res.status(201).json({ ...emp, active: Boolean(emp.active) });
});

router.put("/hr/employees/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { employee_number, name, phone, position, department_id, basic_salary, hire_date, active } = req.body;
  db.prepare(`
    UPDATE hr_employees SET employee_number=?, name=?, phone=?, position=?, department_id=?, basic_salary=?, hire_date=?, active=?
    WHERE id=?
  `).run(employee_number, name, phone ?? null, position ?? null, department_id ?? null, basic_salary ?? 0, hire_date ?? null, active !== false ? 1 : 0, req.params.id);
  const emp = db.prepare(`
    SELECT e.*, d.name as department_name FROM hr_employees e
    LEFT JOIN hr_departments d ON d.id=e.department_id WHERE e.id=?
  `).get(req.params.id) as any;
  res.json({ ...emp, active: Boolean(emp.active) });
});

router.delete("/hr/employees/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  db.prepare("DELETE FROM hr_employees WHERE id=?").run(req.params.id);
  res.status(204).send();
});

/* ── Salaries ── */
router.get("/hr/salaries", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { employee_id, month } = req.query as any;
  let sql = `
    SELECT s.*, e.name as employee_name, e.employee_number
    FROM hr_salaries s JOIN hr_employees e ON e.id=s.employee_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (employee_id) { sql += " AND s.employee_id=?"; params.push(employee_id); }
  if (month) { sql += " AND s.month=?"; params.push(month); }
  sql += " ORDER BY s.month DESC, e.name";
  res.json(db.prepare(sql).all(...params));
});

router.post("/hr/salaries", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { employee_id, month, basic_salary, bonuses, deductions, notes } = req.body;
  if (!employee_id || !month) { res.status(400).json({ error: "الموظف والشهر مطلوبان" }); return; }
  const existing = db.prepare("SELECT id FROM hr_salaries WHERE employee_id=? AND month=?").get(employee_id, month);
  if (existing) { res.status(400).json({ error: "تم إضافة راتب هذا الشهر مسبقاً" }); return; }
  const net = (basic_salary ?? 0) + (bonuses ?? 0) - (deductions ?? 0);
  const r = db.prepare(`
    INSERT INTO hr_salaries (employee_id, month, basic_salary, bonuses, deductions, net_salary, status, notes)
    VALUES (?,?,?,?,?,?,'pending',?)
  `).run(employee_id, month, basic_salary ?? 0, bonuses ?? 0, deductions ?? 0, net, notes ?? null);
  res.status(201).json(db.prepare(`
    SELECT s.*, e.name as employee_name, e.employee_number FROM hr_salaries s
    JOIN hr_employees e ON e.id=s.employee_id WHERE s.id=?
  `).get(r.lastInsertRowid));
});

router.put("/hr/salaries/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { basic_salary, bonuses, deductions, status, payment_date, notes } = req.body;
  const net = (basic_salary ?? 0) + (bonuses ?? 0) - (deductions ?? 0);
  db.prepare(`
    UPDATE hr_salaries SET basic_salary=?, bonuses=?, deductions=?, net_salary=?, status=?, payment_date=?, notes=?
    WHERE id=?
  `).run(basic_salary ?? 0, bonuses ?? 0, deductions ?? 0, net, status ?? "pending", payment_date ?? null, notes ?? null, req.params.id);
  res.json(db.prepare(`
    SELECT s.*, e.name as employee_name, e.employee_number FROM hr_salaries s
    JOIN hr_employees e ON e.id=s.employee_id WHERE s.id=?
  `).get(req.params.id));
});

router.delete("/hr/salaries/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  db.prepare("DELETE FROM hr_salaries WHERE id=?").run(req.params.id);
  res.status(204).send();
});

/* ── Attendance ── */
router.get("/hr/attendance", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { employee_id, date, month } = req.query as any;
  let sql = `
    SELECT a.*, e.name as employee_name, e.employee_number
    FROM hr_attendance a JOIN hr_employees e ON e.id=a.employee_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (employee_id) { sql += " AND a.employee_id=?"; params.push(employee_id); }
  if (date) { sql += " AND a.date=?"; params.push(date); }
  if (month) { sql += " AND strftime('%Y-%m', a.date)=?"; params.push(month); }
  sql += " ORDER BY a.date DESC, e.name";
  res.json(db.prepare(sql).all(...params));
});

router.post("/hr/attendance", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { employee_id, date, check_in, check_out, status, notes } = req.body;
  if (!employee_id || !date) { res.status(400).json({ error: "الموظف والتاريخ مطلوبان" }); return; }
  const existing = db.prepare("SELECT id FROM hr_attendance WHERE employee_id=? AND date=?").get(employee_id, date);
  if (existing) {
    db.prepare("UPDATE hr_attendance SET check_in=?, check_out=?, status=?, notes=? WHERE employee_id=? AND date=?")
      .run(check_in ?? null, check_out ?? null, status ?? "present", notes ?? null, employee_id, date);
    res.json(db.prepare("SELECT a.*, e.name as employee_name FROM hr_attendance a JOIN hr_employees e ON e.id=a.employee_id WHERE a.employee_id=? AND a.date=?").get(employee_id, date));
    return;
  }
  const r = db.prepare(`
    INSERT INTO hr_attendance (employee_id, date, check_in, check_out, status, notes)
    VALUES (?,?,?,?,?,?)
  `).run(employee_id, date, check_in ?? null, check_out ?? null, status ?? "present", notes ?? null);
  res.status(201).json(db.prepare(`
    SELECT a.*, e.name as employee_name FROM hr_attendance a
    JOIN hr_employees e ON e.id=a.employee_id WHERE a.id=?
  `).get(r.lastInsertRowid));
});

router.put("/hr/attendance/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { check_in, check_out, status, notes } = req.body;
  db.prepare("UPDATE hr_attendance SET check_in=?, check_out=?, status=?, notes=? WHERE id=?")
    .run(check_in ?? null, check_out ?? null, status ?? "present", notes ?? null, req.params.id);
  res.json(db.prepare("SELECT a.*, e.name as employee_name FROM hr_attendance a JOIN hr_employees e ON e.id=a.employee_id WHERE a.id=?").get(req.params.id));
});

router.delete("/hr/attendance/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  db.prepare("DELETE FROM hr_attendance WHERE id=?").run(req.params.id);
  res.status(204).send();
});

/* ── Summary ── */
router.get("/hr/summary", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const totalEmployees = (db.prepare("SELECT COUNT(*) as c FROM hr_employees WHERE active=1").get() as any).c;
  const totalDepts = (db.prepare("SELECT COUNT(*) as c FROM hr_departments").get() as any).c;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const salariesThisMonth = db.prepare(`
    SELECT COALESCE(SUM(net_salary),0) as total, COUNT(*) as count,
           SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) as paid_count
    FROM hr_salaries WHERE month=?
  `).get(currentMonth) as any;
  const todayAttendance = db.prepare(`
    SELECT COUNT(*) as present FROM hr_attendance
    WHERE date=? AND status='present'
  `).get(new Date().toISOString().slice(0, 10)) as any;
  res.json({
    totalEmployees,
    totalDepts,
    currentMonthSalaries: salariesThisMonth.total,
    currentMonthSalaryCount: salariesThisMonth.count,
    paidSalaries: salariesThisMonth.paid_count,
    todayPresent: todayAttendance.present,
  });
});

export default router;
