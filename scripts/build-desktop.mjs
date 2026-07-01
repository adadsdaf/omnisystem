import { execSync } from "node:child_process";
import { existsSync, mkdirSync, cpSync, rmSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const apiServerDistSource = join(rootDir, "artifacts", "api-server", "dist");
const apiServerNodeModulesSource = join(rootDir, "artifacts", "api-server", "node_modules");
const posSystemDistSource = join(rootDir, "artifacts", "pos-system", "dist", "public");

const apiServerDistTarget = join(rootDir, "electron-app", "dist", "server", "dist");
const apiServerNodeModulesTarget = join(rootDir, "electron-app", "dist", "server", "node_modules");
const frontendDistTarget = join(rootDir, "electron-app", "dist", "frontend");

const electronAppSrc = join(rootDir, "electron-app", "src");
const electronAppDist = join(rootDir, "electron-app", "dist");

function cleanAndCopy(source, target, label) {
  if (!existsSync(source)) {
    console.error(`Source not found: ${source}`);
    process.exit(1);
  }
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true });
  console.log(`  ${label} -> ${target}`);
}

function ensureDirs() {
  mkdirSync(join(electronAppDist, "server", "dist"), { recursive: true });
  mkdirSync(join(electronAppDist, "frontend"), { recursive: true });
  mkdirSync(join(electronAppDist, "main"), { recursive: true });
  mkdirSync(join(electronAppDist, "preload"), { recursive: true });
}

function copySrcToDist() {
  const srcFiles = [
    ["main/index.js", "main/index.js"],
    ["preload/index.js", "preload/index.js"],
  ];

  for (const [srcRel, distRel] of srcFiles) {
    const srcPath = join(electronAppSrc, srcRel);
    const distPath = join(electronAppDist, distRel);
    const distDir = dirname(distPath);
    if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
    copyFileSync(srcPath, distPath);
  }
  console.log("  Source files copied to dist");
}

function tryBuild(label, filter, script) {
  const source = filter === "@workspace/api-server"
    ? apiServerDistSource
    : posSystemDistSource;

  const hasExistingBuild = filter === "@workspace/api-server"
    ? existsSync(source) && existsSync(join(source, "index.mjs"))
    : existsSync(source) && existsSync(join(source, "index.html"));

  if (hasExistingBuild) {
    console.log(`  Using existing build for ${label}...`);
    return;
  }

  console.log(`  Building ${label}...`);
  try {
    const env = {
      ...process.env,
      PORT: filter === "@workspace/pos-system" ? "20639" : undefined,
      BASE_PATH: filter === "@workspace/pos-system" ? "/" : undefined,
    };
    execSync(`pnpm --filter ${filter} run ${script}`, {
      cwd: rootDir,
      stdio: "inherit",
      env,
    });
  } catch (err) {
    console.error(`  ${label} build failed:`, err.message);
    if (existsSync(source)) {
      console.log(`  Using existing build for ${label}...`);
    } else {
      process.exit(1);
    }
  }
}

function main() {
  console.log("Building OmniSystem Desktop Application...\n");

  console.log("Step 1/5: Building API server...");
  tryBuild("API server", "@workspace/api-server", "build");

  console.log("\nStep 2/5: Building frontend...");
  tryBuild("Frontend", "@workspace/pos-system", "build");

  console.log("\nStep 3/5: Copying built assets...");
  ensureDirs();
  cleanAndCopy(apiServerDistSource, apiServerDistTarget, "API server dist");
  cleanAndCopy(posSystemDistSource, frontendDistTarget, "Frontend dist");

  console.log("\nStep 4/5: Copying server dependencies...");
  if (existsSync(apiServerNodeModulesSource)) {
    cleanAndCopy(
      apiServerNodeModulesSource,
      apiServerNodeModulesTarget,
      "API server node_modules"
    );
  } else {
    console.warn("  API server node_modules not found, skipping.");
  }

  console.log("\nStep 5/5: Building icon assets...");
  try {
    execSync("node resources/build-icons.mjs", {
      cwd: join(rootDir, "electron-app"),
      stdio: "inherit",
    });
  } catch (err) {
    console.warn("  Icon build skipped or failed:", err.message);
  }

  console.log("\nStep 6/6: Copying Electron source to dist...");
  copySrcToDist();

  console.log("\nBuild complete!");
  console.log("  To package: cd electron-app && npm run build:app");
  console.log("  To run in dev: cd electron-app && npm run dev");
}

main();
