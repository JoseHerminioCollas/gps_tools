/**
 * add-style-kml.ts
 *
 * Purpose:
 *   Add a <Style> block to the KML and apply it to any <LineString> Placemarks.
 *   Reads from source file, writes to destination file (no renaming).
 *
 * Usage:
 *   npx ts-node src/add-style-kml.ts <sourceFile> <destFile>
 */

import * as fs from "fs";
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

function addLineStringStyle(destObj: any, styleId: string = "lineStyle1") {
  // Define a style block (ABGR hex color: ff0000ff = opaque red)
  const styleBlock = {
      "@_id": styleId,
      LineStyle: {
        color: "aaff0000", // green line
        width: 2
      }
  };

  // Ensure Document.Style is an array
  if (!destObj.kml.Document.Style) {
    destObj.kml.Document.Style = [];
  }
  if (!Array.isArray(destObj.kml.Document.Style)) {
    destObj.kml.Document.Style = [destObj.kml.Document.Style];
  }
  destObj.kml.Document.Style.push(styleBlock);

  // Apply styleUrl to any LineString placemarks
  function walk(node: any) {
    if (!node) return;
    if (Array.isArray(node)) node.forEach(walk);
    else {
      if (node.Placemark) {
        const pmArray = Array.isArray(node.Placemark) ? node.Placemark : [node.Placemark];
        for (const pm of pmArray) {
          if (pm.LineString) {
            pm.styleUrl = `#${styleId}`;
          }
        }
      }
      if (node.Folder) walk(node.Folder);
    }
  }
  walk(destObj.kml.Document);
}

function addStyleToKml(sourceFile: string, destFile: string) {
  const kmlObj = parseKml(sourceFile);
  addLineStringStyle(kmlObj);
  const newKml = buildKml(kmlObj);
  fs.writeFileSync(destFile, newKml, "utf8");
  console.log(`Styled KML written to: ${destFile}`);
}

// --- CLI usage ---
const [, , sourceFile, destFile] = process.argv;

if (!sourceFile || !destFile) {
  console.error("Usage: npx ts-node src/add-style-kml.ts <sourceFile> <destFile>");
  process.exit(1);
}

addStyleToKml(sourceFile, destFile);
