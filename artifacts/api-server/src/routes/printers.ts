import { Router } from "express";
import { execSync } from "node:child_process";
import { platform } from "node:os";
import { createWriteStream, unlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import net from "node:net";

const router = Router();

function listPrinters(): string[] {
  const os = platform();
  try {
    if (os === "win32") {
      const out = execSync(
        `powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"`,
        { timeout: 5000, encoding: "utf8" }
      );
      return out.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    } else {
      const out = execSync("lpstat -a 2>/dev/null || lpstat -p 2>/dev/null || echo ''", {
        timeout: 5000,
        encoding: "utf8",
        shell: "/bin/bash",
      });
      return out
        .split(/\r?\n/)
        .map(line => {
          const match = line.match(/^(\S+)/);
          return match ? match[1] : "";
        })
        .filter(Boolean);
    }
  } catch {
    return [];
  }
}

function printViaSystem(printerName: string, content: string, copies: number): void {
  const os = platform();
  const tmpFile = join(tmpdir(), `pos-receipt-${randomBytes(6).toString("hex")}.txt`);
  try {
    const ws = createWriteStream(tmpFile, { encoding: "utf8" });
    ws.write(content);
    ws.end();
    for (let i = 0; i < copies; i++) {
      if (os === "win32") {
        execSync(`print /D:"${printerName}" "${tmpFile}"`, { timeout: 10000 });
      } else {
        execSync(`lp -d "${printerName}" "${tmpFile}"`, { timeout: 10000, shell: "/bin/bash" });
      }
    }
  } finally {
    try { if (existsSync(tmpFile)) unlinkSync(tmpFile); } catch {}
  }
}

function printViaTcp(host: string, port: number, content: string, copies: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let sent = 0;
    function sendCopy() {
      if (sent >= copies) { resolve(); return; }
      const client = new net.Socket();
      client.connect(port, host, () => {
        client.write(Buffer.from(content, "utf8"), () => {
          client.end();
        });
      });
      client.on("close", () => { sent++; sendCopy(); });
      client.on("error", reject);
      client.setTimeout(8000, () => { client.destroy(); reject(new Error("TCP print timeout")); });
    }
    sendCopy();
  });
}

router.get("/printers/list", (_req, res) => {
  const printers = listPrinters();
  res.json(printers);
});

router.post("/printers/print", async (req, res) => {
  const { printerName, content, copies = 1 } = req.body as {
    printerName?: string | null;
    content: string;
    copies?: number;
  };

  if (!content) {
    res.status(400).json({ ok: false, message: "content is required" });
    return;
  }

  try {
    if (!printerName) {
      res.json({ ok: false, message: "لا توجد طابعة محددة" });
      return;
    }

    const ipPortMatch = printerName.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::(\d+))?$/);
    if (ipPortMatch) {
      const host = ipPortMatch[1];
      const port = ipPortMatch[2] ? parseInt(ipPortMatch[2]) : 9100;
      await printViaTcp(host, port, content, copies);
    } else {
      printViaSystem(printerName, content, copies);
    }

    res.json({ ok: true, message: "تمت الطباعة بنجاح" });
  } catch (err: any) {
    res.json({ ok: false, message: err?.message ?? "فشلت الطباعة" });
  }
});

export default router;
