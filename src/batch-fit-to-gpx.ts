#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Environment variables for source and destination
const srcDir = process.env.SRC_DIR;
const destDir = process.env.DEST_DIR;

if (!srcDir || !destDir) {
  console.error("Usage: SRC_DIR=/path/to/fit DEST_DIR=/path/to/gpx npx ts-node src/batch-fit-to-gpx.ts");
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });

// Loop through FIT files
const files = fs.readdirSync(srcDir).filter(f => f.endsWith(".fit"));

if (files.length === 0) {
  console.error("No FIT files found in source folder.");
  process.exit(1);
}

files.forEach(file => {
  const base = path.basename(file, ".fit");
  const inputPath = path.join(srcDir, file);
  const outputPath = path.join(destDir, `${base}.gpx`);

  console.log(`Converting ${inputPath} → ${outputPath}`);
  try {
    execSync(`gpsbabel -i garmin_fit -f "${inputPath}" -o gpx -F "${outputPath}"`, { stdio: "inherit" });
    console.log(`✅ Converted: ${outputPath}`);
  } catch (err) {
    console.error(`❌ Failed to convert ${file}:`, err);
  }
});

console.log("🎉 Bulk FIT → GPX conversion complete.");
