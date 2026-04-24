#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";

const srcFile = process.env.SRC_FILE;
const destFile = process.env.DEST_FILE;

if (!srcFile || !destFile) {
  console.error("Usage: SRC_FILE=/path/to/Lctns.gpx DEST_FILE=/path/to/waypoints.kml ts-node src/waypoints-gpx-to-kml.ts");
  process.exit(1);
}

try {
  const gpx = fs.readFileSync(srcFile, "utf8");

  // Regex to capture <wpt lat="…" lon="…"> … </wpt>
  const wptRegex = /<wpt lat="([^"]+)" lon="([^"]+)">([\s\S]*?)<\/wpt>/g;

  let placemarks: string[] = [];
  let match;
  while ((match = wptRegex.exec(gpx)) !== null) {
    const lat = match[1];
    const lon = match[2];
    const inner = match[3];

    const nameMatch = inner.match(/<name>(.*?)<\/name>/);
    const eleMatch = inner.match(/<ele>(.*?)<\/ele>/);

    const name = nameMatch ? nameMatch[1] : "Waypoint";
    const ele = eleMatch ? eleMatch[1] : "0";

    placemarks.push(`
    <Placemark>
      <name>${name}</name>
      <styleUrl>#circleIcon</styleUrl>
      <Point>
        <coordinates>${lon},${lat},${ele}</coordinates>
      </Point>
    </Placemark>`);
  }

  if (placemarks.length === 0) {
    console.error("⚠️ No waypoints found in GPX file.");
    process.exit(1);
  }

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <!-- Define reusable style with hidden labels -->
    <Style id="circleIcon">
      <IconStyle>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <scale>0.0</scale>
      </LabelStyle>
    </Style>

${placemarks.join("\n")}
  </Document>
</kml>`;

  fs.writeFileSync(destFile, kml, "utf8");
  console.log(`✅ Waypoints KML written with hidden labels: ${destFile}`);
} catch (err) {
  console.error("❌ Failed to process GPX:", err);
}
