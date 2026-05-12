/**
 * analyze-gpx.ts
 *
 * Purpose:
 *   Analyze GPX files using fast-xml-parser.
 *   Reports counts of tracks, segments, and points.
 *   Flags "summary/outlier" tracks (single-point).
 *   Applies threshold simplification to point counts for comparison,
 *   but skips tolerance analysis for outlier tracks.
 *
 * Usage:
 *   npx ts-node src/analyze-gpx.ts <inputFile>
 */

import * as fs from "fs";
import * as path from "path";
import { XMLParser } from "fast-xml-parser";

function parseGpx(file: string) {
  const xmlData = fs.readFileSync(file, "utf8");
  const parser = new XMLParser({ ignoreAttributes: false });
  return parser.parse(xmlData);
}

interface TrackSummary {
  name: string;
  segments: number;
  points: number;
  outlier: boolean;
}

function analyzeGpx(obj: any): TrackSummary[] {
  const trks = obj.gpx?.trk;
  if (!trks) return [];

  const tracks = Array.isArray(trks) ? trks : [trks];
  const summaries: TrackSummary[] = [];

  for (const trk of tracks) {
    const name = trk.name || "(unnamed track)";
    const segs = trk.trkseg ? (Array.isArray(trk.trkseg) ? trk.trkseg : [trk.trkseg]) : [];
    let totalPoints = 0;
    let outlier = false;

    for (const seg of segs) {
      const pts = seg.trkpt ? (Array.isArray(seg.trkpt) ? seg.trkpt : [seg.trkpt]) : [];
      totalPoints += pts.length;

      // Outlier criterion: single-point track
      if (pts.length === 1) outlier = true;
    }

    summaries.push({
      name,
      segments: segs.length,
      points: totalPoints,
      outlier,
    });
  }

  return summaries;
}

// Simplify points by threshold (keep every Nth point)
function simplifyCount(points: number, tolerance: number): number {
  const step = Math.max(1, Math.floor(tolerance * 100000));
  return Math.ceil(points / step);
}

function analyzeFile(inputFile: string, tolerances: number[]) {
  console.log(`\nAnalyzing GPX: ${path.basename(inputFile)}`);

  const obj = parseGpx(inputFile);
  const summaries = analyzeGpx(obj);

  for (const s of summaries) {
    console.log(`Track: ${s.name}`);
    console.log(`  Segments: ${s.segments}, Points: ${s.points}`);
    console.log(`  Outlier/Summary: ${s.outlier}`);

    if (!s.outlier) {
      for (const tol of tolerances) {
        const reduced = simplifyCount(s.points, tol);
        console.log(`    Tolerance ${tol.toFixed(6)} → Points: ${reduced}`);
      }
    } else {
      console.log("    Skipped tolerance analysis (outlier track)");
    }
  }
}

// --- CLI usage ---
const [,, inputPath] = process.argv;
if (!inputPath) {
  console.error("Usage: npx ts-node src/analyze-gpx.ts <inputFile>");
  process.exit(1);
}

const tolerances = [
  0.00005, 0.000075, 0.0001,
  0.000125, 0.00015, 0.000175,
  0.0002, 0.000225, 0.00025,
];

analyzeFile(inputPath, tolerances);
