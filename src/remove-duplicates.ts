import fs from 'fs';
import path from 'path';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

if (process.argv.length < 4) {
  console.error('Usage: ts-node src/removeDuplicates.ts input.gpx output.gpx');
  process.exit(2);
}

const [,, inputPath, outputPath] = process.argv;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: false,
  parseAttributeValue: false,
  trimValues: true,
});
const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  suppressEmptyNode: true,
});

function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v as T[] : [v as T];
}

function pointKey(lat: string | number, lon: string | number, time?: string): string {
  // Normalize coordinates to 6 decimal places to avoid tiny float differences
  const latNum = Number(lat).toFixed(6);
  const lonNum = Number(lon).toFixed(6);
  return time ? `${latNum}|${lonNum}|${time}` : `${latNum}|${lonNum}|notime`;
}

function dedupePoints<T extends { '@_lat': string | number; '@_lon': string | number; time?: any }>(pts: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const p of pts) {
    // time may be in child object or string depending on parser
    let timeVal: string | undefined;
    if ('time' in p) {
      const tv = (p as any).time;
      if (typeof tv === 'string') timeVal = tv;
      else if (tv && typeof tv === 'object' && '#text' in tv) timeVal = (tv as any)['#text'];
    }
    const key = pointKey(p['@_lat'], p['@_lon']);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
    else {
      console.log('Duplicate point skipped:', key);
    }
  }
  return out;
}

try {
  const xml = fs.readFileSync(inputPath, 'utf8');
  const obj = parser.parse(xml) as any;

  // GPX root can be 'gpx'
  const gpx = obj.gpx ?? obj; // fast-xml-parser returns object with gpx root
  if (!gpx) throw new Error('No <gpx> root found');

  // Deduplicate waypoints (<wpt>)
  if ('wpt' in gpx) {
    const wpts = toArray(gpx.wpt);
    gpx.wpt = dedupePoints(wpts);
  }

  // Deduplicate trackpoints (<trk><trkseg><trkpt>)
  if ('trk' in gpx) {
    const trks = toArray(gpx.trk);
    for (const trk of trks) {
      if (!('trkseg' in trk)) continue;
      const segs = toArray(trk.trkseg);
      for (const seg of segs) {
        const trkpts = toArray(seg.trkpt);
        seg.trkpt = dedupePoints(trkpts);
      }
    }
    gpx.trk = trks;
  }

  // Deduplicate route points (<rte><rtept>)
  if ('rte' in gpx) {
    const rtes = toArray(gpx.rte);
    for (const rte of rtes) {
      const rtepts = toArray(rte.rtept);
      rte.rtept = dedupePoints(rtepts);
    }
    gpx.rte = rtes;
  }

  const outXml = builder.build({ gpx });
  fs.writeFileSync(outputPath, outXml, 'utf8');
  console.log(`Wrote deduplicated GPX to ${outputPath}`);
} catch (err: any) {
  console.error('Error:', err.message ?? err);
  process.exit(1);
}