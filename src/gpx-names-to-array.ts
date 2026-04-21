#!/usr/bin/env node
// Parses a .gpx file and prints a JSON array of arrays like ["name", count]
import { readFile } from "fs/promises";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { writeFile } from 'fs/promises';
let outputData = '[1, 2, 3]'; // Example data to write to file]';
// const outputPath = './gpx_array.json'; // You can change the filename and path
// const DEFAULT_GPX = path.resolve(process.cwd(), "../coop_towpath_wpt.gpx");
const [,, inputPath, outputPath] = process.argv;
// const inputPath = path.resolve(__dirname, '../coop_towpath_wpt.gpx');
function ensureArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

async function main() {
  // const gpxPath = process.env.GPX_FILE ?? process.argv[2] ?? DEFAULT_GPX;
  // const xml = await readFile(gpxPath, "utf8");
  const xml = await readFile(inputPath, 'utf-8');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    cdataPropName: "__cdata",
    parseTagValue: false
  });

  const obj: any = parser.parse(xml);
  if (!obj.gpx) {
    console.error("Invalid GPX: missing <gpx> root");
    process.exit(2);
  }

  const wpts = ensureArray(obj.gpx.wpt);
  const counts = new Map<string, number>();

  for (const w of wpts) {
    const name = (typeof w.name === "string" ? w.name : (w.name && w.name["#text"]) || "").trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const arr: [string, number][] = Array.from(counts.entries()).map(([k, v]) => [k, v]);
  outputData = JSON.stringify(arr, null, 2);
  console.log(outputData);
  await writeFile(outputPath, outputData, 'utf-8');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});