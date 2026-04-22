#!/usr/bin/env ts-node

import * as fs from "fs";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

const inputFile = process.env.INPUT_GPX;
const outputDir = process.env.OUTPUT_DIR;

if (!inputFile || !outputDir) {
  console.error("Please set INPUT_GPX and OUTPUT_DIR environment variables.");
  process.exit(1);
}

console.log(`OUTPUT_DIR is set to: ${outputDir}`);

const xml = fs.readFileSync(inputFile, "utf-8");
const parser = new XMLParser({ ignoreAttributes: false });
const gpxObj = parser.parse(xml);

const builder = new XMLBuilder({ ignoreAttributes: false, format: true });

const tracks = gpxObj.gpx.trk || [];

if (!Array.isArray(tracks)) {
  console.error("No <trk> elements found in GPX file.");
  process.exit(1);
}

tracks.forEach((trk, index) => {
  let timestamp: string;

  try {
    // Always look at the first <trkseg> and its first <trkpt>
    const firstSeg = Array.isArray(trk.trkseg) ? trk.trkseg[0] : trk.trkseg;
    const firstPt = firstSeg?.trkpt?.[0];

    if (firstPt?.time) {
      const date = new Date(firstPt.time);
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(date.getUTCDate()).padStart(2, "0");
      const hh = String(date.getUTCHours()).padStart(2, "0");
      const min = String(date.getUTCMinutes()).padStart(2, "0");
      timestamp = `${yyyy}-${mm}-${dd}-${hh}:${min}`;
    } else {
      timestamp = `${index}`;
    }
  } catch {
    timestamp = `${index}`;
  }

  const trackDoc = {
    gpx: {
      "@_version": "1.1",
      "@_creator": "split-tracks",
      "@_xmlns": "http://www.topografix.com/GPX/1/1",
      trk: trk
    }
  };

  const filename = `${outputDir}/track_${timestamp}.gpx`;
  fs.writeFileSync(filename, builder.build(trackDoc));
  console.log(`✅ Wrote ${filename}`);
});
