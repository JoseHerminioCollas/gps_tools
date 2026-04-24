#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";

const srcDir = process.env.SRC_DIR;
const destDir = process.env.DEST_DIR;

if (!srcDir || !destDir) {
  console.error("Usage: SRC_DIR=/path/to/gpx DEST_DIR=/path/to/kml ts-node src/batch-gpx-to-kml-path.ts");
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });

const files = fs.readdirSync(srcDir).filter(f => f.endsWith(".gpx"));

if (files.length === 0) {
  console.error("No GPX files found in source folder.");
  process.exit(1);
}

files.forEach(file => {
  const base = path.basename(file, ".gpx");
  const inputPath = path.join(srcDir, file);
  const outputPath = path.join(destDir, `${base}.kml`);

  console.log(`Processing ${inputPath} → ${outputPath}`);

  try {
    // Step 1: Read GPX file
    const gpx = fs.readFileSync(inputPath, "utf8");

    // Step 2: Extract all trackpoints (lat, lon, ele)
    const trkptRegex = /<trkpt lat="([^"]+)" lon="([^"]+)">[\s\S]*?<ele>([^<]+)<\/ele>/g;
    let coords: string[] = [];
    let match;
    while ((match = trkptRegex.exec(gpx)) !== null) {
      const lat = match[1];
      const lon = match[2];
      const ele = match[3];
      coords.push(`${lon},${lat},${ele}`);
    }

    if (coords.length === 0) {
      console.error(`⚠️ No trackpoints found in ${file}, skipping.`);
      return;
    }

    // Step 3: Extract start time
    const timeMatch = gpx.match(/<time>(.*?)<\/time>/);
    const startTime = timeMatch ? timeMatch[1] : "Unknown Start";

    // Step 4: Build minimal KML with full path
    const cleanKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>${startTime}</name>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
${coords.join("\n")}
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

    fs.writeFileSync(outputPath, cleanKml, "utf8");
    console.log(`✅ KML written: ${outputPath}`);
  } catch (err) {
    console.error(`❌ Failed to process ${file}:`, err);
  }
});

console.log("🎉 Batch GPX → KML conversion complete.");
