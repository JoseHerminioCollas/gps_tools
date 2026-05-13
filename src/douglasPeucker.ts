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

export interface GpxPoint {
  ["@_lon"]: string;
  ["@_lat"]: string;
  ele?: number | string;
  time?: string;
}
export default function douglasPeucker(points: GpxPoint[], tolerance: number): GpxPoint[] {
  if (points.length < 3) return points;

  const sqTolerance = tolerance * tolerance;

  function getSqSegDist(p: GpxPoint, p1: GpxPoint, p2: GpxPoint) {
    let x = parseFloat(p1["@_lon"]);
    let y = parseFloat(p1["@_lat"]);
    let dx = parseFloat(p2["@_lon"]) - x;
    let dy = parseFloat(p2["@_lat"]) - y;

    if (dx !== 0 || dy !== 0) {
      const t =
        ((parseFloat(p["@_lon"]) - x) * dx +
          (parseFloat(p["@_lat"]) - y) * dy) /
        (dx * dx + dy * dy);
      if (t > 1) {
        x = parseFloat(p2["@_lon"]);
        y = parseFloat(p2["@_lat"]);
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }

    dx = parseFloat(p["@_lon"]) - x;
    dy = parseFloat(p["@_lat"]) - y;

    return dx * dx + dy * dy;
  }

  function simplifyDP(
    points: GpxPoint[],
    first: number,
    last: number,
    sqTolerance: number,
    simplified: GpxPoint[],
  ) {
    let maxSqDist = sqTolerance;
    let index = -1;

    for (let i = first + 1; i < last; i++) {
      const sqDist = getSqSegDist(points[i], points[first], points[last]);
      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }

    if (maxSqDist > sqTolerance) {
      if (index - first > 1)
        simplifyDP(points, first, index, sqTolerance, simplified);
      simplified.push(points[index]);
      if (last - index > 1)
        simplifyDP(points, index, last, sqTolerance, simplified);
    }
  }

  const simplified: GpxPoint[] = [points[0]];
  simplifyDP(points, 0, points.length - 1, sqTolerance, simplified);
  simplified.push(points[points.length - 1]);

  return simplified;
}