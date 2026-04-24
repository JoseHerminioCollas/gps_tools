#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Environment variables for source and destination
const srcDir = process.env.SRC_DIR;
const destDir = process.env.DEST_DIR;

if (!srcDir || !destDir) {
  console.error("Usage: SRC_DIR=/path/to/gpx DEST_DIR=/path/to/kml ts-node src/batch-gpx-to-kml-path.ts");
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });

// Loop through GPX files
const files = fs.readdirSync(srcDir).filter(f => f.endsWith(".gpx"));

if (files.length === 0) {
  console.error("No GPX files found in source folder.");
  process.exit(1);
}

files.forEach(file => {
  const base = path.basename(file, ".gpx");
  const inputPath = path.join(srcDir, file);
  const outputPath = path.join(destDir, `${base}.kml`);

  console.log(`Converting ${inputPath} → ${outputPath}`);
  try {
    // Step 1: Convert GPX → KML with gpsbabel
    execSync(`gpsbabel -i gpx -f "${inputPath}" -o kml -F "${outputPath}"`, { stdio: "inherit" });

    // Step 2: Read KML and normalize altitude to meters
    let kml = fs.readFileSync(outputPath, "utf8");

    kml = kml.replace(/<coordinates>(.*?)<\/coordinates>/gs, (m, coords) => {
      const converted = coords.trim().split(/\s+/).map((line: string) => {
        const [lon, lat, alt] = line.split(",");
        const altMeters = (parseFloat(alt) / 3.28084).toFixed(2); // convert feet → meters
        return `${lon},${lat},${altMeters}`;
      }).join(" ");
      return `<coordinates>${converted}</coordinates>`;
    });

    // Step 3: Extract start time from GPX
    const gpx = fs.readFileSync(inputPath, "utf8");
    const match = gpx.match(/<time>(.*?)<\/time>/);
    const startTime = match ? match[1] : "Unknown Start";

    // Step 4: Replace <Document> contents with a clean Placemark
    kml = kml.replace(/<Document>[\s\S]*<\/Document>/, `
<Document>
  <Placemark>
    <name>${startTime}</name>
    <LineString>
      <tessellate>1</tessellate>
      ${kml.match(/<coordinates>[\s\S]*<\/coordinates>/) || ""}
    </LineString>
  </Placemark>
</Document>`);

    fs.writeFileSync(outputPath, kml, "utf8");
    console.log(`✅ Clean KML written: ${outputPath}`);
  } catch (err) {
    console.error(`❌ Failed to convert ${file}:`, err);
  }
});

console.log("🎉 Batch conversion complete.");
