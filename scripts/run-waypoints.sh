#!/bin/bash

# Usage:
# ./run-waypoints.sh

# Define input and output paths
SRC_FILE="$HOME/projects/gps-waypoints-tracks/gpx/Lctns.gpx"
DEST_FILE="$HOME/projects/gps-waypoints-tracks/kml/waypoints.kml"

# Run the TypeScript parser with environment variables
SRC_FILE="$SRC_FILE" DEST_FILE="$DEST_FILE" npx ts-node src/waypoints-gpx-to-kml.ts

echo "✅ Waypoints KML written to: $DEST_FILE"
