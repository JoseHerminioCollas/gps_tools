/**
 * splice-kml.ts
 *
 * Purpose:
 *   Replace a section of <Point> Placemarks in the destination KML
 *   with coordinates spliced from the source KML, using start/end lat/lon.
 *   Updates both the Point Placemarks and the LineString path.
 *
 * Usage:
 *   npx ts-node src/splice-kml.ts <sourceFile> <destFile> <startLat> <startLon> <endLat> <endLon> <targetFolder>
 */

import * as fs from "fs";
import * as path from "path";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

function parseKml(file: string) {
  const xmlData = fs.readFileSync(file, "utf8");
  const parser = new XMLParser({ ignoreAttributes: false });
  return parser.parse(xmlData);
}

function buildKml(obj: any): string {
  const builder = new XMLBuilder({ ignoreAttributes: false, format: true });
  return builder.build(obj);
}

function extractCoords(obj: any): string[] {
  const coords: string[] = [];
  function walk(node: any) {
    if (!node) return;
    if (Array.isArray(node)) node.forEach(walk);
    else {
      if (node.Placemark) {
        const pmArray = Array.isArray(node.Placemark) ? node.Placemark : [node.Placemark];
        for (const pm of pmArray) {
          if (pm.Point?.coordinates) coords.push(pm.Point.coordinates.trim());
          if (pm.LineString?.coordinates) coords.push(...pm.LineString.coordinates.trim().split(/\s+/));
        }
      }
      if (node.Folder) walk(node.Folder);
    }
  }
  walk(obj.kml?.Document);
  return coords;
}

function findNearestIndex(coords: string[], lat: number, lon: number): number {
  let minDist = Infinity, minIndex = -1;
  for (let i = 0; i < coords.length; i++) {
    const [cLon, cLat] = coords[i].split(",").map(parseFloat);
    const dLat = cLat - lat;
    const dLon = cLon - lon;
    const dist = dLat * dLat + dLon * dLon;
    if (dist < minDist) { minDist = dist; minIndex = i; }
  }
  return minIndex;
}

function replacePointsAndLineString(
  destObj: any,
  splicedCoords: string[],
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
) {
  // Get Placemark array
  let pmArray: any[] = [];
  if (Array.isArray(destObj.kml.Document.Folder?.Placemark)) {
    pmArray = destObj.kml.Document.Folder.Placemark;
  } else if (Array.isArray(destObj.kml.Document.Placemark)) {
    pmArray = destObj.kml.Document.Placemark;
  } else {
    console.error("No Placemark array found in destination KML");
    return;
  }

  // Find nearest indices in destination
  function nearestIndex(lat: number, lon: number): number {
    let minDist = Infinity, idx = -1;
    for (let i = 0; i < pmArray.length; i++) {
      const pm = pmArray[i];
      if (!pm.Point?.coordinates) continue;
      const [cLon, cLat] = pm.Point.coordinates.split(",").map(parseFloat);
      const dLat = cLat - lat;
      const dLon = cLon - lon;
      const dist = dLat * dLat + dLon * dLon;
      if (dist < minDist) { minDist = dist; idx = i; }
    }
    return idx;
  }

  const startIndex = nearestIndex(startLat, startLon);
  const endIndex = nearestIndex(endLat, endLon);
  const [i1, i2] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

  console.log(`Destination range: ${i1} → ${i2} (${i2 - i1 + 1} Placemarks)`);

  // Remove old slice
  const removed = pmArray.splice(i1, i2 - i1 + 1);
  console.log(`Removed ${removed.length} old Placemarks`);

  // Insert new Placemarks
  const newPlacemarks = splicedCoords.map((coord, idx) => ({
    name: `Spliced-${i1 + idx}`,
    Point: { coordinates: coord }
  }));
  pmArray.splice(i1, 0, ...newPlacemarks);
  console.log(`Inserted ${newPlacemarks.length} new Placemarks`);

  // 🔑 Update LineString coordinates
  const linePm = pmArray.find(pm => pm.LineString?.coordinates);
  if (linePm) {
    linePm.LineString.coordinates = pmArray
      .filter(pm => pm.Point?.coordinates)
      .map(pm => pm.Point.coordinates.trim())
      .join(" ");
    console.log(`Updated LineString with ${pmArray.filter(pm => pm.Point?.coordinates).length} coordinates`);
  } else {
    console.warn("No LineString found in destination KML");
  }
}

function spliceKml(
  sourceFile: string,
  destFile: string,
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  targetFolder: string
) {
  const sourceObj = parseKml(sourceFile);
  const destObj = parseKml(destFile);

  const srcCoords = extractCoords(sourceObj);
  console.log(`Source file: ${sourceFile}`);
  console.log(`  Found ${srcCoords.length} coordinates`);

  const startIndex = findNearestIndex(srcCoords, startLat, startLon);
  const endIndex = findNearestIndex(srcCoords, endLat, endLon);
  console.log(`  Start nearest index: ${startIndex}`);
  console.log(`  End nearest index: ${endIndex}`);

  const [i1, i2] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
  const splicedCoords = srcCoords.slice(i1, i2 + 1);
  console.log(`  Spliced section length: ${splicedCoords.length} points`);

  replacePointsAndLineString(destObj, splicedCoords, startLat, startLon, endLat, endLon);

  const newKml = buildKml(destObj);

  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  const outFile = path.join(
    targetFolder,
    path.basename(destFile, ".kml") + "-spliced.kml"
  );
  fs.writeFileSync(outFile, newKml, "utf8");

  console.log(`Output written to: ${outFile}`);
}

// --- CLI usage ---
const [, , sourceFile, destFile, startLatStr, startLonStr, endLatStr, endLonStr, targetFolder] =
  process.argv;

if (!sourceFile || !destFile || !startLatStr || !startLonStr || !endLatStr || !endLonStr || !targetFolder) {
  console.error(
    "Usage: npx ts-node src/splice-kml.ts <sourceFile> <destFile> <startLat> <startLon> <endLat> <endLon> <targetFolder>"
  );
  process.exit(1);
}

spliceKml(
  sourceFile,
  destFile,
  parseFloat(startLatStr),
  parseFloat(startLonStr),
  parseFloat(endLatStr),
  parseFloat(endLonStr),
  targetFolder
);
