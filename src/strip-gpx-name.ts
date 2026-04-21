import { promises as fs } from "fs";
import * as path from "path";

async function stripNameTags(xml: string): Promise<string> {
  // preserve opening/closing <name> tags but remove any inner text/CDATA
  const nameTagRegex = /(<name\b[^>]*>)([\s\S]*?)(<\/name>)/gi;
  return xml.replace(nameTagRegex, (_m, open, _inner, close) => `${open}${close}`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.error("Usage: node strip-gpx-name.js <input.gpx> [-o <output.gpx>]");
    process.exit(2);
  }

  const inputPath = argv[0];
  const outFlagIndex = argv.indexOf("-o");
  const outputPath =
    outFlagIndex >= 0 && argv[outFlagIndex + 1]
      ? argv[outFlagIndex + 1]
      : inputPath; // overwrite by default

  const xml = await fs.readFile(inputPath, "utf8");
  const result = await stripNameTags(xml);

  const tmp = `${outputPath}.${process.pid}.tmp`;
  await fs.writeFile(tmp, result, "utf8");
  await fs.rename(tmp, outputPath);

  console.log(`Stripped <name> contents: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});