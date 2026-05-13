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
import douglasPeucker, { GpxPoint } from "./douglasPeucker";

function parseGpx(file: string) {
  const xmlData = fs.readFileSync(file, "utf8");
  const parser = new XMLParser({ ignoreAttributes: false });
  return parser.parse(xmlData);
}
// interface GpxPoint {
//   ["@_lon"]: string;
//   ["@_lat"]: string;
//   ele?: number | string;
//   time?: string;
// }
interface TrackSummary {
  name: string;
  segments: number;
  points: number;
  outlier: boolean;
  trackPoints: GpxPoint[];
}

function analyzeGpx(obj: any): TrackSummary[] {
  const trks = obj.gpx?.trk;
  if (!trks) return [];

  const tracks = Array.isArray(trks) ? trks : [trks];
  const summaries: TrackSummary[] = [];

  for (const trk of tracks) {
    const name = trk.name || "(unnamed track)";
    const segs = trk.trkseg
      ? Array.isArray(trk.trkseg)
        ? trk.trkseg
        : [trk.trkseg]
      : [];
    let totalPoints = 0;
    let outlier = false;
    let allPoints: GpxPoint[] = [];

    for (const seg of segs) {
      const pts: GpxPoint[] = seg.trkpt
        ? Array.isArray(seg.trkpt)
          ? seg.trkpt
          : [seg.trkpt]
        : [];
      totalPoints += pts.length;
      allPoints = allPoints.concat(pts);

      // Outlier criterion: single-point track
      if (pts.length === 1) outlier = true;
    }

    summaries.push({
      name,
      segments: segs.length,
      points: totalPoints,
      outlier,
      trackPoints: allPoints, // ✅ include actual points
    });
  }

  return summaries;
}
// function douglasPeucker(points: GpxPoint[], tolerance: number): GpxPoint[] {
//   if (points.length < 3) return points;

//   const sqTolerance = tolerance * tolerance;

//   function getSqSegDist(p: GpxPoint, p1: GpxPoint, p2: GpxPoint) {
//     let x = parseFloat(p1["@_lon"]);
//     let y = parseFloat(p1["@_lat"]);
//     let dx = parseFloat(p2["@_lon"]) - x;
//     let dy = parseFloat(p2["@_lat"]) - y;

//     if (dx !== 0 || dy !== 0) {
//       const t =
//         ((parseFloat(p["@_lon"]) - x) * dx +
//           (parseFloat(p["@_lat"]) - y) * dy) /
//         (dx * dx + dy * dy);
//       if (t > 1) {
//         x = parseFloat(p2["@_lon"]);
//         y = parseFloat(p2["@_lat"]);
//       } else if (t > 0) {
//         x += dx * t;
//         y += dy * t;
//       }
//     }

//     dx = parseFloat(p["@_lon"]) - x;
//     dy = parseFloat(p["@_lat"]) - y;

//     return dx * dx + dy * dy;
//   }

//   function simplifyDP(
//     points: GpxPoint[],
//     first: number,
//     last: number,
//     sqTolerance: number,
//     simplified: GpxPoint[],
//   ) {
//     let maxSqDist = sqTolerance;
//     let index = -1;

//     for (let i = first + 1; i < last; i++) {
//       const sqDist = getSqSegDist(points[i], points[first], points[last]);
//       if (sqDist > maxSqDist) {
//         index = i;
//         maxSqDist = sqDist;
//       }
//     }

//     if (maxSqDist > sqTolerance) {
//       if (index - first > 1)
//         simplifyDP(points, first, index, sqTolerance, simplified);
//       simplified.push(points[index]);
//       if (last - index > 1)
//         simplifyDP(points, index, last, sqTolerance, simplified);
//     }
//   }

//   const simplified: GpxPoint[] = [points[0]];
//   simplifyDP(points, 0, points.length - 1, sqTolerance, simplified);
//   simplified.push(points[points.length - 1]);

//   return simplified;
// }
// Simplify points by threshold (keep every Nth point)
// function simplifyCount(points: number, tolerance: number): number {
//   const step = Math.max(1, Math.floor(tolerance * 100000));
//   return Math.ceil(points / step);
// }
function simplifyCount(points: GpxPoint[], tolerance: number): number {
  const simplified = douglasPeucker(points, tolerance);
  return simplified.length;
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
        const reduced = simplifyCount(s.trackPoints, tol);
        console.log(`    Tolerance ${tol.toFixed(6)} → Points: ${reduced}`);
      }
    } else {
      console.log("    Skipped tolerance analysis (outlier track)");
    }
  }
}

// --- CLI usage ---
const [, , inputPath] = process.argv;
if (!inputPath) {
  console.error("Usage: npx ts-node src/analyze-gpx.ts <inputFile>");
  process.exit(1);
}
const tolerances = [
  0.000001, 0.0000025, 0.000005, 0.0000075, 0.00001, 0.000015, 0.00002, 0.00003,
  0.00005, 0.000075, 0.0001, 0.000125, 0.00015, 0.000175, 0.0002, 0.000225,
  0.00025, 0.0003, 0.0004, 0.0005,
];

analyzeFile(inputPath, tolerances);
