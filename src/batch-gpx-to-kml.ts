#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

// Environment variables for source and destination
const srcDir = process.env.SRC_DIR;
const destDir = process.env.DEST_DIR;

if (!srcDir || !destDir) {
  console.error("Usage: SRC_DIR=/path/to/gpx DEST_DIR=/path/to/kml ts-node src/batch-gpx-to-kml.ts");
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

    // Step 2: Inject custom circle icon style
    let kml = readFileSync(outputPath, "utf8");

    const styleBlock = `
    <Style id="circleIcon">
      <IconStyle>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    `;

    // Insert style before closing </Document>
    kml = kml.replace("</Document>", styleBlock + "\n</Document>");

    // Apply style to all Placemarks (basic replacement)
    kml = kml.replace(/<Placemark>/g, "<Placemark>\n<styleUrl>#circleIcon</styleUrl>");

    writeFileSync(outputPath, kml, "utf8");
    console.log(`✅ Customized KML written: ${outputPath}`);
  } catch (err) {
    console.error(`❌ Failed to convert ${file}:`, err);
  }
});

console.log("🎉 Batch conversion complete.");
