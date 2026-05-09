# Working with GPX Files and Digital Imagery

## Overview
The **gps_tools** repository provides utilities to parse GPX files, clean and enrich waypoint data, and associate digital images with waypoints. The final output is a **KML (Keyhole Markup Language)** file that can be opened in mapping software such as Google Earth to visualize a journey.

- **Track points**: Recorded automatically by the GPS device while traveling.  
- **Waypoints**: Created manually by the user.  
- **Images**: Optionally taken at waypoints. Some cameras embed GPS/time metadata in EXIF, but current scripts rely on user‑provided arrays to associate images with waypoints.

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