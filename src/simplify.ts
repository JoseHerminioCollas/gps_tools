/**
 * simplify.ts
 *
 * Purpose:
 *   Simplify KML files by thinning Placemark Points (waypoints).
 *   Keeps LineString tracks intact.
 *   Recursively traverses Document/Folder structure.
 *   Writes a new file with "-simplified" suffix.
 *
 * Usage:
 *   npx ts-node src/simplify.ts <inputFile> <tolerance>
 *
 * Example:
 *   npx ts-node src/simplify.ts ./hike-4-27-2026.kml 0.0001
 */

import * as fs from "fs";
import * as path from "path";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

function parseKml(file: string) {
  const xmlData = fs.readFileSync(file, "utf8");
  const parser = new XMLParser({ ignoreAttributes: false });
  return parser.parse(xmlData);
}

// Recursive simplification of Placemark arrays
function simplifyNode(node: any, tolerance: number) {
  if (!node) return;

  if (Array.isArray(node)) {
    node.forEach(n => simplifyNode(n, tolerance));
  } else {
    if (node.Placemark) {
      const placemarks = Array.isArray(node.Placemark) ? node.Placemark : [node.Placemark];
      const tracks = placemarks.filter((pm: { LineString: any; }) => pm.LineString);
      const points = placemarks.filter((pm: { Point: any; }) => pm.Point);

      const step = Math.max(1, Math.floor(tolerance * 100000));
      const reducedPoints = points.filter((_: any, idx: number) => idx % step === 0);

      node.Placemark = [...tracks, ...reducedPoints];
    }
    if (node.Folder) simplifyNode(node.Folder, tolerance);
    if (node.Document) simplifyNode(node.Document, tolerance);
  }
}

function simplifyFile(inputFile: string, tolerance: number) {
  const obj = parseKml(inputFile);

  simplifyNode(obj.kml?.Document, tolerance);

  const builder = new XMLBuilder({ ignoreAttributes: false });
  const newXml = builder.build(obj);

  const outFile = path.join(
    path.dirname(inputFile),
    path.basename(inputFile, ".kml") + "-simplified.kml"
  );
  fs.writeFileSync(outFile, newXml);

  console.log(`Simplified file written: ${outFile}`);
}

// --- CLI usage ---
const [,, inputFile, tolArg] = process.argv;
if (!inputFile || !tolArg) {
  console.error("Usage: npx ts-node src/simplify.ts <inputFile> <tolerance>");
  process.exit(1);
}
const tolerance = parseFloat(tolArg);
simplifyFile(inputFile, tolerance);
