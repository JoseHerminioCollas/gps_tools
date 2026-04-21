#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Parses a .gpx file and prints a JSON array of arrays like ["name", count]
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const fast_xml_parser_1 = require("fast-xml-parser");
const DEFAULT_GPX = path_1.default.resolve(process.cwd(), "../coop_towpath_wpt.gpx");
function ensureArray(v) {
    if (v === undefined)
        return [];
    return Array.isArray(v) ? v : [v];
}
async function main() {
    const gpxPath = process.env.GPX_FILE ?? process.argv[2] ?? DEFAULT_GPX;
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
        process.exit(2);
    }
    const wpts = ensureArray(obj.gpx.wpt);
    const counts = new Map();
    for (const w of wpts) {
        const name = (typeof w.name === "string" ? w.name : (w.name && w.name["#text"]) || "").trim();
        if (!name)
            continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const arr = Array.from(counts.entries()).map(([k, v]) => [k, v]);
    console.log(JSON.stringify(arr, null, 2));
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
