import { readFile, writeFile } from 'fs/promises';
import { parseStringPromise, Builder } from 'xml2js';

const [,, inputPath, outputPath] = process.argv;

async function updateWaypointNames(inputPath: string, outputPath: string) {
  const xml = await readFile(inputPath, 'utf-8');
  const gpx = await parseStringPromise(xml);

  const waypoints = gpx.gpx.wpt;
  for (const wpt of waypoints) {
    const time = wpt.time?.[0];
    if (time) {
      wpt.name = [time]; // Replace <name> with <time>
    }
  }

  const builder = new Builder();
  const updatedXml = builder.buildObject(gpx);
  await writeFile(outputPath, updatedXml, 'utf-8');

  console.log(`✅ Updated GPX saved to ${outputPath}`);
}

updateWaypointNames(inputPath, outputPath);
