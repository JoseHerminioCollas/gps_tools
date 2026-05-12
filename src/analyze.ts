/**
 * analyze.ts
 *
 * Purpose:
 *   Analyze KML files using fast-xml-parser.
 *   Separates Placemark Points (waypoints) and LineStrings (tracks).
 *   Reports counts and applies thinning to Points across many tolerances.
 *
 *   Detects "summary" blocks of XML based on one criterion:
 *     - If a Folder <description> contains "Distance 0.0 ft",
 *       then that Folder is marked as a summary block and
 *       all child Placemarks inside it are flagged as summary.
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
  return parser.parse(xmlData);
}

function collectPlacemarks(node: any): any[] {
  const placemarks: any[] = [];
  function collect(n: any) {
    if (!n) return;
    if (Array.isArray(n)) n.forEach(collect);
    else {
      if (n.Placemark) {
        placemarks.push(...(Array.isArray(n.Placemark) ? n.Placemark : [n.Placemark]));
      }
      if (n.Folder) collect(n.Folder);
      if (n.Document) collect(n.Document);
    }
  }
  collect(node);
  return placemarks;
}

function reducePoints(points: any[], tolerance: number): number {
  const step = Math.max(1, Math.floor(tolerance * 100000));
  return Math.ceil(points.length / step);
}

/**
 * Recursively traverse the KML tree.
 * If a Folder description contains "Distance 0.0 ft",
 * mark the folder itself and all child Placemarks as summary.
 */
function reportSummary(node: any, summaries: any[] = [], parentIsSummary: boolean = false): any[] {
  if (!node) return summaries;

  if (Array.isArray(node)) {
    node.forEach(n => reportSummary(n, summaries, parentIsSummary));
    return summaries;
  }

  let thisIsSummary = parentIsSummary;

  // If this node has a description string
  const desc = node.description || "";
  if (/Distance\s*0\.0/.test(desc)) {
    thisIsSummary = true;
    summaries.push({
      name: node.name || "(unnamed folder)",
      description: desc.substring(0, 120),
    });
  }

  // Recurse into Folder children
  if (node.Folder) {
    const folders = Array.isArray(node.Folder) ? node.Folder : [node.Folder];
    folders.forEach((f: any) => reportSummary(f, summaries, thisIsSummary));
  }

  // Recurse into Document
  if (node.Document) {
    reportSummary(node.Document, summaries, thisIsSummary);
  }

  // Flag Placemarks if inside a summary folder
  if (node.Placemark) {
    const pms = Array.isArray(node.Placemark) ? node.Placemark : [node.Placemark];
    for (const pm of pms) {
      if (thisIsSummary) {
        summaries.push({
          name: pm.name || "(unnamed placemark)",
          description: (pm.description || desc).substring(0, 120),
        });
      }
    }
  }

  return summaries;
}

function analyzeFile(inputFile: string, tolerances: number[]) {
  console.log(`\nAnalyzing: ${path.basename(inputFile)}`);

  const obj = parseKml(inputFile);
  const placemarks = collectPlacemarks(obj.kml?.Document);

  const tracks = placemarks.filter(pm => pm.LineString);
  const points = placemarks.filter(pm => pm.Point);

  const summaries = reportSummary(obj.kml?.Document);
  if (summaries.length) {
    console.log("Summary blocks detected:");
    summaries.forEach(s => {
      console.log(`  Block Name: ${s.name}`);
      console.log(`  Description: ${s.description}...`);
    });
  }

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

const tolerances = [
  0.00005, 0.000075, 0.0001,
  0.000125, 0.00015, 0.000175,
  0.0002, 0.000225, 0.00025,
];

analyzeFile(inputPath, tolerances);
