// ...existing code...
import { readFile, writeFile, readdir, stat } from "fs/promises";
import path from "path";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

// const DEFAULT_GPX = path.resolve(process.cwd(), "../coop_towpath_wpt.gpx");
const [,, gpxPath, imagePath, outputPath] = process.argv;

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
  // const gpxPath = process.env.GPX_FILE ?? DEFAULT_GPX;
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
  const imagesDir = path.resolve(imagePath);
  const imagesExist = await fileExists(imagesDir);
  let images: string[] = [];
  if (imagesExist) {
    const files = await readdir(imagesDir);
    images = files
      .filter((f) => /\.(jpe?g|png|gif|webp)$/i.test(f))
      .sort();
  }

  console.log(`Found ${wpts.length} waypoint(s). Found ${images.length} image(s) in ${imagesDir}.`);

  // parse IMAGE_COUNTS env var (JSON like "[1,2,3]" or CSV "1,2,3")
  const countsEnv = process.env.IMAGE_COUNTS;
  // let counts: number[] | null = null;
  const gpxPoints: Array<[string, number]> = [
  [
    "2025-09-29T18:09:35Z",
    1
  ],
  [
    "2025-09-29T18:11:01Z",
    2
  ],
  [
    "2025-09-29T18:11:52Z",
    1
  ],
  [
    "2025-09-29T18:13:20Z",
    1
  ],
  [
    "2025-09-29T18:14:47Z",
    1
  ],
  [
    "2025-09-29T18:16:21Z",
    1
  ],
  [
    "2025-09-29T18:17:45Z",
    2
  ],
  [
    "2025-09-29T18:18:50Z",
    1
  ],
  [
    "2025-09-29T18:20:08Z",
    2
  ],
  [
    "2025-09-29T18:21:25Z",
    1
  ],
  [
    "2025-09-29T18:22:45Z",
    2
  ],
  [
    "2025-09-29T18:25:51Z",
    2
  ],
  [
    "2025-09-29T18:27:08Z",
    3
  ],
  [
    "2025-09-29T18:29:22Z",
    2
  ],
  [
    "2025-09-29T18:30:28Z",
    1
  ],
  [
    "2025-09-29T18:31:51Z",
    2
  ],
  [
    "2025-09-29T18:32:47Z",
    2
  ],
  [
    "2025-09-29T18:34:58Z",
    1
  ],
  [
    "2025-09-29T18:36:15Z",
    1
  ],
  [
    "2025-09-29T18:37:33Z",
    2
  ],
  [
    "2025-09-29T18:39:39Z",
    1
  ],
  [
    "2025-09-29T18:41:14Z",
    1
  ],
  [
    "2025-09-29T18:41:56Z",
    1
  ],
  [
    "2025-09-29T18:42:50Z",
    1
  ],
  [
    "2025-09-29T18:43:43Z",
    1
  ],
  [
    "2025-09-29T18:44:42Z",
    1
  ],
  [
    "2025-09-29T18:45:38Z",
    1
  ],
  [
    "2025-09-29T18:47:30Z",
    2
  ],
  [
    "2025-09-29T18:49:00Z",
    1
  ],
  [
    "2025-09-29T18:50:47Z",
    1
  ],
  [
    "2025-09-29T18:52:07Z",
    2
  ],
  [
    "2025-09-29T18:53:50Z",
    1
  ],
  [
    "2025-09-29T18:55:18Z",
    1
  ],
  [
    "2025-09-29T18:56:13Z",
    1
  ],
  [
    "2025-09-29T18:57:21Z",
    1
  ],
  [
    "2025-09-29T18:59:19Z",
    1
  ],
  [
    "2025-09-29T19:02:30Z",
    1
  ]
];
const counts = gpxPoints.map(p => p[1]);
  // how many images per waypoint
  // const a = [['2:22', 1]]
  // if (countsEnv) {
  //   try {
  //     if (countsEnv.trim().startsWith("[")) {
  //       counts = JSON.parse(countsEnv);
  //     } else {
  //       counts = countsEnv.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n));
  //     }
  //     // use the inline variable in development mode for now

  //     if (!Array.isArray(counts) || counts.some(n => typeof n !== "number" || n < 0)) {
  //       throw new Error("Invalid counts");
  //     }
  //     console.log("Using IMAGE_COUNTS:", counts);
  //   } catch (e) {
  //     console.error("Failed to parse IMAGE_COUNTS. Use JSON array like \"[1,2,3]\" or CSV \"1,2,3\".");
  //     process.exit(4);
  //   }
  // } else {
  //   console.log("No IMAGE_COUNTS provided — defaulting to 1 image per waypoint.");
  // }

  // Assign images to waypoints according to counts (or 1 each if counts not provided).
  let imgIndex = 0;
  let totalAssignedImages = 0;
  for (let i = 0; i < wpts.length && imgIndex < images.length; i++) {
    const w = wpts[i];
    const count = counts ? (counts[i % counts.length] ?? 1) : 1;
    if (count <= 0) continue;

    const absPath = 'https://joseherminiocollas.github.io/path_coop_towpath/images/';
    const imgsForWpt: string[] = [];
    for (let c = 0; c < count && imgIndex < images.length; c++, imgIndex++) {
      imgsForWpt.push(images[imgIndex]);
    }
    if (imgsForWpt.length === 0) break;

    if (imgsForWpt.length === 1) {
      const rel = absPath + imgsForWpt[0];
      w.link = { "@_href": rel };
      w.desc = { "__cdata": `<img src="${rel}" width="309" height="232"/>` };
      console.log(`Assigned image ${imgsForWpt[0]} → waypoint[${i}]`);
    } else {
      // multiple links and combined CDATA description with multiple <img> tags
      w.link = imgsForWpt.map(name => ({ "@_href": absPath + name }));
      w.desc = {
        "__cdata": imgsForWpt
          .map(name => `<img src="${absPath + name}" width="309" height="232"/>`)
          .join("\n")
      };
      console.log(`Assigned ${imgsForWpt.length} images [${imgsForWpt.join(", ")}] → waypoint[${i}]`);
    }

    totalAssignedImages += imgsForWpt.length;
  }

  if (totalAssignedImages === 0) {
    console.log("No assignments made (either no images or all images exhausted).");
  } else {
    console.log(`Total images assigned: ${totalAssignedImages}`);
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
  // await writeFile(gpxPath + ".bak", xml, "utf8");
  await writeFile(outputPath, newXml, "utf8");
  console.log(`Updated GPX written (${outputPath}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
