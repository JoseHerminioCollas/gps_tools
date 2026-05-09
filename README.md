# Working with GPX Files and Digital Imagery

## Overview
The **gps_tools** repository provides utilities to parse GPX files, clean and enrich waypoint data, and associate digital images with waypoints. The final output is a **KML (Keyhole Markup Language)** file that can be opened in mapping software such as Google Earth to visualize a journey.

- **Track points**: Recorded automatically by the GPS device while traveling.  
- **Waypoints**: Created manually by the user.  
- **Images**: Optionally taken at waypoints. Some cameras embed GPS/time metadata in EXIF, but current scripts rely on user‑provided arrays to associate images with waypoints.

# Trek Data Workflow

## 1. Convert `.fit` → `.gpx`
Use **gpsbabel** or Garmin tools to convert raw FIT files into GPX format.

<code>gpsbabel -i garmin_fit -f hike.fit -o gpx -F hike.gpx</code>

Output: `hike.gpx` containing trackpoints and waypoints.

---

## 2. Convert `.gpx` → `.kml`
Use your TypeScript wrapper (`gpx-to-kml.ts`) or direct gpsbabel call.

<code>npx ts-node src/gpx-to-kml.ts ./gpx/hike.gpx ./kml</code>

Output: `hike.kml` with full metadata (waypoints, trackpoints, timestamps).

---

## 3. Analyze `.kml`
Run the **analyze.ts** utility to inspect feature counts at different simplification tolerances.

<code>npx ts-node analyze.ts ./kml/hike.kml 0.0001 0.00015 0.0002</code>

Console output example:
<code>
Analyzing: hike.kml
Full (no simplify) → Features: 20015
Tolerance 0.0001 → Features: 18050
Tolerance 0.00015 → Features: 12050
Tolerance 0.0002 → Features: 9500
</code>

---

## 4. Modify `.kml`
Apply simplification with `ogr2ogr` or your **simplify.ts** script until feature count ≤10,000.

<code>npx ts-node simplify.ts ./kml/hike.kml ./simplified</code>

Output: `hike-simplified.kml` with adjusted tolerance.

Optional modifications:
- **remove-duplicates.ts** → clean duplicate waypoints  
- **update-gpx-name.ts** → rename waypoints with lat/long/elevation  
- **update-gpx-image.ts** → associate images with waypoints  

---

## Summary
1. **Convert FIT → GPX**  
2. **Convert GPX → KML**  
3. **Analyze KML feature counts**  
4. **Simplify/modify KML for Google Earth compatibility**


## Scripts
- **remove-duplicates.ts**  
  Cleans duplicate waypoints created unintentionally at the same location.

- **update-gpx-name.ts**  
  Replaces default GPS waypoint names with latitude, longitude, and elevation for better display in mapping software.

- **gpx-names-to-array.ts**  
  Generates an array mapping waypoint names to the number of images to be associated.

- **update-gpx-image.ts**  
  Uses the array to update GPX waypoints with image associations.


# GPX to KML Conversion Tools

## Overview
This repository includes TypeScript scripts for converting GPX files into KML format. These tools allow you to either generate full KML files with metadata or produce simplified path‑only KMLs for lightweight visualization.


## Files

- **gpx-to-kml.ts**  
  Converts GPX files into full KML outputs.  
  - Accepts either a single GPX file or a directory of GPX files.  
  - Creates the destination folder if it does not exist.  
  - Output filenames mirror the GPX input names, with `.kml` extension.  
  - Internally calls `gpsbabel` via Node’s `child_process` for reliable conversion.  
  - Preserves metadata such as waypoints, trackpoints, and timestamps.

- **gpx-to-kml-path.ts**  
  Produces a simplified KML containing only the path geometry.  
  - Strips out metadata and attributes, leaving just the track line.  
  - Useful for lightweight visualization when only the route shape is needed.  
  - Accepts single GPX files or directories, mirroring input filenames.  
  - Creates destination folder if missing.  
  - Output is minimal, optimized for display in Google Earth or other mapping tools.

## Usage

Run with `ts-node`:

```bash
# Full GPX → KML conversion
npx ts-node src/gpx-to-kml.ts ./gpx/trek1.gpx ./kml
```
```bash
# Path-only conversion
npx ts-node src/gpx-to-kml-path.ts ./gpx/trek1.gpx ./kml
```

## Introspection Utilities
- **ogrinfo**  

```bash
  ogrinfo -al -so hike.gpx
```

Summarizes tracks, waypoints, and feature counts.

```bash
grep -c "<trkpt" hike.gpx
  ```

Counts raw trackpoints in the XML.

```bash
gpsbabel -i gpx -f hike.gpx -o gpx -F /dev/null -V
  ```

Reports tracks, routes, and point counts.

## Simplification Utilities

- **ogrinfo**  

```bash
ogr2ogr -f KML hike-simplified.kml hike.kml -simplify 0.00015
  ```

Reduces trackpoints to stay under Google Earth’s 10,000‑feature limit.

- 0.0001° ≈ 11 meters tolerance

- 0.00015° ≈ 16 meters tolerance

- 0.0002° ≈ 22 meters tolerance
  
Adjust tolerance until feature count is acceptable.

## Workflow

1. Remove duplicates → remove-duplicates.ts

2. Update waypoint names → update-gpx-name.ts

3. Generate waypoint–image array → gpx-names-to-array.ts

4. Associate images → update-gpx-image.ts

5. Convert GPX → KML → gpsbabel or ogr2ogr

6. Introspect and simplify → ogrinfo, grep, ogr2ogr -simplify

7. Review and update array → adjust image associations or metadata

## Notes

- Tolerance values in ogr2ogr -simplify are in decimal degrees (~0.0001° ≈ 11 m).

- Google Earth limits: Map Features imports are capped at 10,000 features. Use Data Layers for larger datasets.

- Images: Current scripts rely on user‑defined arrays, not EXIF metadata.