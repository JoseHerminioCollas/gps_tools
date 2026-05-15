/**
 * split-outwards-return.ts
 *
 * Purpose:
 *   Split a Wikiloc KML file into outwards + return tracks.
 *   Each output file contains both individual Point Placemarks
 *   and a single LineString Placemark connecting them.
 *
 * Usage:
 *   npx ts-node src/split-outwards-return.ts <sourceFile> <targetFolder>
 */

import * as fs from "fs";
import * as path from "path";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

function parseKml(file: string) {
  const xmlData = fs.readFileSync(file, "utf8");
  const parser = new XMLParser({ ignoreAttributes: false });
  return parser.parse(xmlData);
}

function buildKml(obj: any): string {
  const builder = new XMLBuilder({ ignoreAttributes: false, format: true });
  return builder.build(obj);
}

function collectPlacemarks(obj: any): any[] {
  const placemarks: any[] = [];
  function walk(node: any) {
    if (!node) return;
    if (Array.isArray(node)) node.forEach(walk);
    else {
      if (node.Placemark) {
        const pmArray = Array.isArray(node.Placemark) ? node.Placemark : [node.Placemark];
        placemarks.push(...pmArray.filter((pm: any) => pm.Point?.coordinates));
      }
      if (node.Folder) walk(node.Folder);
    }
  }
  walk(obj.kml?.Document);
  return placemarks;
}

function splitByTime(placemarks: any[]) {
  const sorted = placemarks.slice().sort((a, b) => {
    const ta = new Date(a.TimeStamp?.when || "").getTime();
    const tb = new Date(b.TimeStamp?.when || "").getTime();
    return ta - tb;
  });

  let splitIndex = Math.floor(sorted.length / 2);
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].TimeStamp?.when || "").getTime();
    const curr = new Date(sorted[i].TimeStamp?.when || "").getTime();
    if (curr < prev) {
      splitIndex = i;
      break;
    }
  }

  return {
    outwards: sorted.slice(0, splitIndex),
    returns: sorted.slice(splitIndex)
  };
}

function makeKml(originalObj: any, placemarks: any[], name: string) {
  const newObj = JSON.parse(JSON.stringify(originalObj));

  // Clear existing Placemarks
  function clear(node: any) {
    if (!node) return;
    if (Array.isArray(node)) node.forEach(clear);
    else {
      if (node.Placemark) delete node.Placemark;
      if (node.Folder) clear(node.Folder);
    }
  }
  clear(newObj.kml.Document);

  // Build LineString coordinates
  const coords = placemarks.map(pm => pm.Point.coordinates.trim()).join(" ");

  // Create LineString Placemark
  const linePlacemark = {
    name: `${name} Path`,
    LineString: { coordinates: coords }
  };

  // Insert new Placemarks under Document
  newObj.kml.Document.Folder = {
    name,
    Placemark: [linePlacemark, ...placemarks]
  };

  return newObj;
}

function splitWikiloc(sourceFile: string, targetFolder: string) {
  const sourceObj = parseKml(sourceFile);
  const placemarks = collectPlacemarks(sourceObj);
  console.log(`Source file: ${sourceFile}`);
  console.log(`  Total Placemarks: ${placemarks.length}`);

  const { outwards, returns } = splitByTime(placemarks);
  console.log(`  Outwards: ${outwards.length}`);
  console.log(`  Return: ${returns.length}`);

  const outwardsObj = makeKml(sourceObj, outwards, "Outwards");
  const returnObj = makeKml(sourceObj, returns, "Return");

  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  const outFile = path.join(targetFolder, "outwards.kml");
  const retFile = path.join(targetFolder, "return.kml");

  fs.writeFileSync(outFile, buildKml(outwardsObj), "utf8");
  fs.writeFileSync(retFile, buildKml(returnObj), "utf8");

  console.log(`Output written to:`);
  console.log(`  ${outFile}`);
  console.log(`  ${retFile}`);
}

// --- CLI usage ---
const [, , sourceFile, targetFolder] = process.argv;

if (!sourceFile || !targetFolder) {
  console.error("Usage: npx ts-node src/split-outwards-return.ts <sourceFile> <targetFolder>");
  process.exit(1);
}

splitWikiloc(sourceFile, targetFolder);
