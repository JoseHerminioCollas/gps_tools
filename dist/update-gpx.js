"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
    // Assign images to waypoints by index when waypoint has no link/desc
    let assigned = 0;
    for (let i = 0; i < wpts.length && i < images.length; i++) {
        const w = wpts[i];
        // const hasLink = !!w.link;
        // const hasImageDesc = !!(w.desc && ((typeof w.desc === "object" && w.desc.__cdata) || (typeof w.desc === "string" && w.desc.trim())));
        // if (hasLink || hasImageDesc) {
        //   continue;
        // }
        const absPath = 'https://joseherminiocollas.github.io/path_coop_towpath/images/';
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
