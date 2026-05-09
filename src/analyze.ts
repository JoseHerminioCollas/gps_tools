/**
 * analyze.ts
 *
 * Purpose:
 *   Analyze KML files using fast-xml-parser.
 *   Separates Placemark Points (waypoints) and LineStrings (tracks).
 *   Reports counts and applies thinning to Points across many tolerances.
 *
 * Usage:
 *   npx ts-node src/analyze.ts <inputFile|inputFolder>
 */

import * as fs from "fs";
import * as path from "path";
import { XMLParser } from "fast-xml-parser";

function parseKml(file: string) {
  const xmlData = fs.readFileSync(file, "utf8");
  const parser = new XMLParser({ ignoreAttributes: false });
  const obj = parser.parse(xmlData);

  const placemarks: any[] = [];
  function collect(node: any) {
    if (!node) return;
    if (Array.isArray(node)) node.forEach(collect);
    else {
      if (node.Placemark) {
        placemarks.push(...(Array.isArray(node.Placemark) ? node.Placemark : [node.Placemark]));
      }
      if (node.Folder) collect(node.Folder);
      if (node.Document) collect(node.Document);
    }
  }
  collect(obj.kml?.Document);

  const tracks: any[] = placemarks.filter(pm => pm.LineString);
  const points: any[] = placemarks.filter(pm => pm.Point);

  return { tracks, points };
}

// Thin out points by keeping every Nth based on tolerance
function reducePoints(points: any[], tolerance: number): number {
  const step = Math.max(1, Math.floor(tolerance * 100000));
  return Math.ceil(points.length / step);
}

function analyzeFile(inputFile: string, tolerances: number[]) {
  console.log(`\nAnalyzing: ${path.basename(inputFile)}`);
  const { tracks, points } = parseKml(inputFile);

  console.log(`Full (no simplify) → Tracks: ${tracks.length}, Points: ${points.length}`);

  for (const tol of tolerances) {
    const reducedPoints = reducePoints(points, tol);
    console.log(`Tolerance ${tol.toFixed(6)} → Tracks: ${tracks.length}, Points: ${reducedPoints}`);
  }
}

// --- CLI usage ---
const [,, inputPath] = process.argv;
if (!inputPath) {
  console.error("Usage: npx ts-node src/analyze.ts <inputFile|inputFolder>");
  process.exit(1);
}

// Define finer-grained tolerances
const tolerances = [
  0.00005, 0.000075, 0.0001,
  0.000125, 0.00015, 0.000175,
  0.0002, 0.000225, 0.00025
];

analyzeFile(inputPath, tolerances);
