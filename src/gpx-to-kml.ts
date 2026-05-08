// gpx-to-kml.ts
// convert gpx to kml input, file or folder, output, target folder
// example run script
// npx ts-node src/gpx-to-kml.ts ~/projects/apu-linli/gpx ~/projects/apu-linli/kml_test/

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: ts-node gpx-to-kml.ts <GPX_FILE|GPX_DIR> <DEST_DIR>");
  process.exit(1);
}

const [inputPath, destDir] = args.map(p => path.resolve(p));
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

function convertWithGpsBabel(gpxFile: string, kmlFile: string) {
  execSync(`gpsbabel -i gpx -f "${gpxFile}" -o kml -F "${kmlFile}"`);
  console.log(`Converted ${path.basename(gpxFile)} → ${path.basename(kmlFile)}`);
}

const stats = fs.statSync(inputPath);
if (stats.isDirectory()) {
  const files = fs.readdirSync(inputPath).filter(f => f.endsWith(".gpx"));
  files.forEach(file => {
    const gpxFile = path.join(inputPath, file);
    const kmlFile = path.join(destDir, file.replace(/\.gpx$/i, ".kml"));
    convertWithGpsBabel(gpxFile, kmlFile);
  });
} else {
  const baseName = path.basename(inputPath, ".gpx");
  const kmlFile = path.join(destDir, `${baseName}.kml`);
  convertWithGpsBabel(inputPath, kmlFile);
}
