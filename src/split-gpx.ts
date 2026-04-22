import * as fs from "fs";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

const inputFile = process.env.INPUT_GPX;
const waypointsFile = process.env.WAYPOINTS_GPX;
const tracksFile = process.env.TRACKS_GPX;

if (!inputFile || !waypointsFile || !tracksFile) {
  console.error("Please set INPUT_GPX, WAYPOINTS_GPX, TRACKS_GPX environment variables.");
  process.exit(1);
}

// Read and parse GPX
const xml = fs.readFileSync(inputFile, "utf-8");
const parser = new XMLParser({ ignoreAttributes: false });
const gpxObj = parser.parse(xml);

// Prepare builders
const builder = new XMLBuilder({ ignoreAttributes: false, format: true });

// Extract waypoints
const waypoints = gpxObj.gpx.wpt || [];
const waypointsDoc = {
  gpx: {
    "@_version": "1.1",
    "@_creator": "split-gpx",
    "@_xmlns": "http://www.topografix.com/GPX/1/1",
    wpt: waypoints
  }
};

// Extract tracks
const tracks = gpxObj.gpx.trk || [];
const tracksDoc = {
  gpx: {
    "@_version": "1.1",
    "@_creator": "split-gpx",
    "@_xmlns": "http://www.topografix.com/GPX/1/1",
    trk: tracks
  }
};

// Write outputs
fs.writeFileSync(waypointsFile, builder.build(waypointsDoc));
fs.writeFileSync(tracksFile, builder.build(tracksDoc));

console.log(`✅ Wrote waypoints to ${waypointsFile}`);
console.log(`✅ Wrote tracks to ${tracksFile}`);
