import fs from "fs";
import path from "path";

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Copy EJS templates
const srcDir = path.resolve(process.cwd(), "src/app/templates");
const destDir = path.resolve(process.cwd(), "dist/app/templates");

if (fs.existsSync(srcDir)) {
  console.log(`Copying templates from ${srcDir} to ${destDir}...`);
  copyDir(srcDir, destDir);
  console.log("Templates copied successfully!");
} else {
  console.error(`Source directory ${srcDir} does not exist.`);
  process.exit(1);
}

// 2. Clean and copy tsup-built bundle so Vercel uses it
const vercelApiDir = path.resolve(process.cwd(), "api");
const builtApi = path.resolve(process.cwd(), "dist/index.js");
const vercelApiFile = path.resolve(vercelApiDir, "index.js");

if (fs.existsSync(vercelApiDir)) {
  console.log("Cleaning api directory...");
  fs.rmSync(vercelApiDir, { recursive: true, force: true });
}
fs.mkdirSync(vercelApiDir, { recursive: true });

if (fs.existsSync(builtApi)) {
  fs.copyFileSync(builtApi, vercelApiFile);
  console.log("Copied dist/index.js → api/index.js for Vercel.");
} else {
  console.warn("dist/index.js not found; skipping Vercel bundle copy.");
}
