import { readFile, writeFile, readdir, stat } from "fs/promises";
import path from "path";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

const DEFAULT_GPX = path.resolve(process.cwd(), "../coop_towpath_wpt.gpx");

function ensureArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

async function fileExists(p: string) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const gpxPath = process.env.GPX_FILE ?? DEFAULT_GPX;
  console.log(`Using GPX: ${gpxPath}`);
  if (!(await fileExists(gpxPath))) {
    console.error("GPX file not found:", gpxPath);
    process.exit(2);
  }

  const xml = await readFile(gpxPath, "utf8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    cdataPropName: "__cdata",
    parseTagValue: false
  });

  const obj: any = parser.parse(xml);
  if (!obj.gpx) {
    console.error("Invalid GPX: missing <gpx> root");
    process.exit(3);
  }

  const wpts = ensureArray(obj.gpx.wpt);

  // images folder next to the GPX file
  const imagesDir = path.resolve(path.dirname(gpxPath), "images");
  const imagesExist = await fileExists(imagesDir);
  let images: string[] = [];
  if (imagesExist) {
    const files = await readdir(imagesDir);
    images = files
      .filter((f) => /\.(jpe?g|png|gif|webp)$/i.test(f))
      .sort();
  }

  console.log(`Found ${wpts.length} waypoint(s). Found ${images.length} image(s) in ${imagesDir}.`);

  // Assign images to waypoints by index when waypoint has no link/desc
  let assigned = 0;
  for (let i = 0; i < wpts.length && i < images.length; i++) {
    const w = wpts[i];
    // const hasLink = !!w.link;
    // const hasImageDesc = !!(w.desc && ((typeof w.desc === "object" && w.desc.__cdata) || (typeof w.desc === "string" && w.desc.trim())));
    // if (hasLink || hasImageDesc) {
    //   continue;
    // }
    const absPath = 'https://joseherminiocollas.github.io/path_coop_towpath/images/'
    const imgName = images[i];
    const rel = absPath + imgName;
    w.link = { "@_href": rel };
    w.desc = { "__cdata": `<img src="${rel}" width="309"/>` };
    assigned++;
    console.log(`Assigned image ${imgName} → waypoint[${i}]`);
  }

  if (assigned === 0) {
    console.log("No assignments made (either no images or waypoints already have links/descriptions).");
  }

  obj.gpx.wpt = wpts;

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    cdataPropName: "__cdata",
    format: true,
    suppressEmptyNode: false
  });

  const newXml = '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(obj);

  // backup and write
  await writeFile(gpxPath + ".bak", xml, "utf8");
  await writeFile(gpxPath, newXml, "utf8");
  console.log(`Updated GPX written (backup at ${gpxPath}.bak).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
