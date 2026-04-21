import { readFile, writeFile } from "fs/promises";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { exit } from "process";

// const DEFAULT_GPX = path.resolve(process.cwd(), "coop_towpath_wpt-30.gpx");
// const OUTPUT_KML = path.resolve(process.cwd(), "coop_towpath_wpt-30.kml");
const [, , DEFAULT_GPX, OUTPUT_KML, fileName] = process.argv;

function ensureArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

async function main() {
  const gpxPath = process.env.GPX_FILE ?? DEFAULT_GPX;
  console.log(`Converting GPX → KML: ${gpxPath} → ${OUTPUT_KML}`);
  const xml = await readFile(gpxPath, "utf8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    cdataPropName: "__cdata",
    // ignoreNameSpace: true,
    parseTagValue: false
  });
  const obj: any = parser.parse(xml);
  const wpts = ensureArray(obj.gpx.wpt);

  const kmlParts: string[] = [];
  kmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
  kmlParts.push('<kml xmlns="http://www.opengis.net/kml/2.2">');
  kmlParts.push('<Document>');
  kmlParts.push(`<name>${fileName}</name>`);
  // Define a style with a custom icon
  kmlParts.push('<Style id="cameraIcon">');
  kmlParts.push('<IconStyle>');
  kmlParts.push('<scale>0.9</scale>');
  kmlParts.push('<Icon>');
  kmlParts.push('<href>https://goatstone.com/map_icons/camera.png</href>');
  kmlParts.push('</Icon>');
  kmlParts.push('</IconStyle>');
  kmlParts.push('<LabelStyle>');
  kmlParts.push('<scale>0.0</scale>'); // Hide labels
  kmlParts.push('</LabelStyle>');
  kmlParts.push('</Style>');
  for (const w of wpts) {
    const lat = w["@_lat"];
    const lon = w["@_lon"];
    if (!lat || !lon) continue;
    const elePart = w.ele ? `,${w.ele}` : "";
    const coords_elevation = `${lon},${lat}${elePart}`;
    const when = w.time && (typeof w.time === "string" ? w.time : (w.time.when || ""));
    let desc = "";
    if (w.desc) {
      if (typeof w.desc === "object" && w.desc.__cdata) desc = w.desc.__cdata;
      else if (typeof w.desc === "string") desc = w.desc;
    } else if (w.link && w.link["@_href"]) {
      const href = w.link["@_href"];
      desc = `<img src="${href}" />`;
    }

    kmlParts.push("<Placemark>");
    if (coords_elevation) kmlParts.push(`<name>${coords_elevation}</name>`);
    if (when) kmlParts.push("<TimeStamp><when>" + escapeXml(when) + "</when></TimeStamp>");
    if (desc) kmlParts.push(`<description><![CDATA[${desc}]]></description>`);
    kmlParts.push("<styleUrl>#cameraIcon</styleUrl>");
    kmlParts.push(`<Point><coordinates>${coords_elevation}</coordinates></Point>`);
    kmlParts.push("</Placemark>");
  }

  kmlParts.push("</Document>");
  kmlParts.push("</kml>");

  const kml = kmlParts.join("\n");
  await writeFile(OUTPUT_KML, kml, "utf8");
  console.log("KML written:", OUTPUT_KML);
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case "\"": return "&quot;";
      default: return c;
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
