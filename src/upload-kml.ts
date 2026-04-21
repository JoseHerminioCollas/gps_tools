import path from "path";
import { stat } from "fs/promises";

const OUTPUT_KML = path.resolve(process.cwd(), "../coop_towpath_wpt.kml");

async function main() {
  try {
    await stat(OUTPUT_KML);
  } catch {
    console.error("KML not found. Run conversion first.");
    process.exit(2);
  }

  console.log("KML exists:", OUTPUT_KML);
  console.log("To view in Google Earth (web), you can upload the KML at https://earth.google.com/web/");
  console.log('Or open locally in Google Earth Pro / Desktop.');

  if (process.env.BROWSER) {
    console.log('Run in host to open: "$BROWSER" https://earth.google.com/web/');
  } else {
    console.log('Set the BROWSER env variable in the devcontainer host to auto-open.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
