"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ...existing code...
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const fast_xml_parser_1 = require("fast-xml-parser");
const DEFAULT_GPX = path_1.default.resolve(process.cwd(), "../coop_towpath_wpt.gpx");
function ensureArray(v) {
    if (v === undefined)
        return [];
    return Array.isArray(v) ? v : [v];
}
async function fileExists(p) {
    try {
        await (0, promises_1.stat)(p);
        return true;
    }
    catch {
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
    const xml = await (0, promises_1.readFile)(gpxPath, "utf8");
    const parser = new fast_xml_parser_1.XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        cdataPropName: "__cdata",
        parseTagValue: false
    });
    const obj = parser.parse(xml);
    if (!obj.gpx) {
        console.error("Invalid GPX: missing <gpx> root");
        process.exit(3);
    }
    const wpts = ensureArray(obj.gpx.wpt);
    // images folder next to the GPX file
    const imagesDir = path_1.default.resolve(path_1.default.dirname(gpxPath), "images");
    const imagesExist = await fileExists(imagesDir);
    let images = [];
    if (imagesExist) {
        const files = await (0, promises_1.readdir)(imagesDir);
        images = files
            .filter((f) => /\.(jpe?g|png|gif|webp)$/i.test(f))
            .sort();
    }
    console.log(`Found ${wpts.length} waypoint(s). Found ${images.length} image(s) in ${imagesDir}.`);
    // parse IMAGE_COUNTS env var (JSON like "[1,2,3]" or CSV "1,2,3")
    const countsEnv = process.env.IMAGE_COUNTS;
    let counts = null;
    counts = [1, 2, 1, 1, 1, 1, 2, 1, 2, 1, 2, 2, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,];
    //2:22
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
        if (count <= 0)
            continue;
        const absPath = 'https://joseherminiocollas.github.io/path_coop_towpath/images/';
        const imgsForWpt = [];
        for (let c = 0; c < count && imgIndex < images.length; c++, imgIndex++) {
            imgsForWpt.push(images[imgIndex]);
        }
        if (imgsForWpt.length === 0)
            break;
        if (imgsForWpt.length === 1) {
            const rel = absPath + imgsForWpt[0];
            w.link = { "@_href": rel };
            w.desc = { "__cdata": `<img src="${rel}" width="309"/>` };
            console.log(`Assigned image ${imgsForWpt[0]} → waypoint[${i}]`);
        }
        else {
            // multiple links and combined CDATA description with multiple <img> tags
            w.link = imgsForWpt.map(name => ({ "@_href": absPath + name }));
            w.desc = {
                "__cdata": imgsForWpt
                    .map(name => `<img src="${absPath + name}" width="309"/>`)
                    .join("\n")
            };
            console.log(`Assigned ${imgsForWpt.length} images [${imgsForWpt.join(", ")}] → waypoint[${i}]`);
        }
        totalAssignedImages += imgsForWpt.length;
    }
    if (totalAssignedImages === 0) {
        console.log("No assignments made (either no images or all images exhausted).");
    }
    else {
        console.log(`Total images assigned: ${totalAssignedImages}`);
    }
    obj.gpx.wpt = wpts;
    const builder = new fast_xml_parser_1.XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        cdataPropName: "__cdata",
        format: true,
        suppressEmptyNode: false
    });
    const newXml = '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(obj);
    // backup and write
    await (0, promises_1.writeFile)(gpxPath + ".bak", xml, "utf8");
    await (0, promises_1.writeFile)(gpxPath, newXml, "utf8");
    console.log(`Updated GPX written (backup at ${gpxPath}.bak).`);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
// ...existing code...
