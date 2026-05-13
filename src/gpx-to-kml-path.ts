/**
 * gpx-to-kml-path.ts
 *
 * Convert GPX files to KML with Douglas–Peucker simplification.
 *
 * Features:
 *   - Deletes summary/outlier tracks (Placemark with only one coordinate).
 *   - Outputs only the path as a LineString Placemark (no per‑point Placemarks).
 *   - Optionally thins coordinates in the path using Douglas–Peucker tolerance.
 *
 * Options:
 *   --tolerance <float>     Simplification tolerance (degrees)
 *   --clean_outlier <bool>  Drop tracks with only one point
 *
 * Usage:
 *   npx ts-node src/gpx-to-kml-path.ts <inputFile> <outputFolder> --tolerance 0.00001 --clean_outlier true
 */

import * as fs from "fs";
import * as path from "path";
import { XMLParser } from "fast-xml-parser";
import douglasPeucker, { GpxPoint } from "./douglasPeucker";

// Define a type for GPX points
// interface GpxPoint {
//   ["@_lon"]: string;
//   ["@_lat"]: string;
//   ele?: number | string;
//   time?: string;
// }

function parseGpx(file: string) {
  const xmlData = fs.readFileSync(file, "utf8");
  const parser = new XMLParser({ ignoreAttributes: false });
  return parser.parse(xmlData);
}

// Douglas–Peucker simplification
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

//   function simplifyDP(points: GpxPoint[], first: number, last: number, sqTolerance: number, simplified: GpxPoint[]) {
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
//       if (index - first > 1) simplifyDP(points, first, index, sqTolerance, simplified);
//       simplified.push(points[index]);
//       if (last - index > 1) simplifyDP(points, index, last, sqTolerance, simplified);
//     }
//   }

//   const simplified: GpxPoint[] = [points[0]];
//   simplifyDP(points, 0, points.length - 1, sqTolerance, simplified);
//   simplified.push(points[points.length - 1]);

//   return simplified;
// }

function gpxToKml(obj: any, tolerance: number, cleanOutlier: boolean): string {
  const trks = obj.gpx?.trk;
  if (!trks) throw new Error("No tracks found in GPX");

  const tracks = Array.isArray(trks) ? trks : [trks];
  let kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n`;

  for (const trk of tracks) {
    const name = trk.name || "(unnamed track)";
    const segs = trk.trkseg ? (Array.isArray(trk.trkseg) ? trk.trkseg : [trk.trkseg]) : [];

    // Count total points across all segments
    let totalPoints = 0;
    const segArray = segs ? (Array.isArray(segs) ? segs : [segs]) : [];
    for (const seg of segArray) {
      const pts: GpxPoint[] = seg.trkpt ? (Array.isArray(seg.trkpt) ? seg.trkpt : [seg.trkpt]) : [];
      totalPoints += pts.length;
    }

    // Skip entire track if it's an outlier
    if (cleanOutlier && totalPoints <= 1) {
      console.log(`Skipping outlier track: ${name}`);
      continue;
    }

    for (const seg of segArray) {
      const pts: GpxPoint[] = seg.trkpt ? (Array.isArray(seg.trkpt) ? seg.trkpt : [seg.trkpt]) : [];
      if (pts.length <= 1) continue;

      const simplified = tolerance > 0 ? douglasPeucker(pts, tolerance) : pts;
      if (simplified.length < 2) continue;

      console.log(`Track ${name}: original=${pts.length}, simplified=${simplified.length}`);

      const coords = simplified
        .map((p: GpxPoint) => `${p["@_lon"]},${p["@_lat"]},${p.ele || 0}`)
        .join(" ");
      kml += `<Placemark>\n<name>${name}</name>\n<LineString>\n<coordinates>${coords}</coordinates>\n</LineString>\n</Placemark>\n`;
    }
  }

  kml += `</Document>\n</kml>`;
  return kml;
}

// --- CLI usage ---
const [,, inputFile, outputFolder, ...args] = process.argv;
if (!inputFile || !outputFolder) {
  console.error("Usage: npx ts-node src/gpx-to-kml-path.ts <inputFile> <outputFolder> --tolerance <float> --clean_outlier <bool>");
  process.exit(1);
}

let tolerance = 0.0;
let cleanOutlier = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--tolerance" && args[i+1]) {
    tolerance = parseFloat(args[i+1]);
  }
  if (args[i] === "--clean_outlier" && args[i+1]) {
    cleanOutlier = args[i+1].toLowerCase() === "true";
  }
}

const baseName = path.basename(inputFile, path.extname(inputFile));
const outputFile = path.join(outputFolder, `${baseName}.kml`);

const obj = parseGpx(inputFile);
const kml = gpxToKml(obj, tolerance, cleanOutlier);
fs.writeFileSync(outputFile, kml, "utf8");

console.log(`Converted ${path.basename(inputFile)} → ${outputFile} with tolerance=${tolerance}, clean_outlier=${cleanOutlier}`);
