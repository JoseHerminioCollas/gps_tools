# Working with GPX files and digital imagery

## gps_tools is a repository that has files to parse GPX files and associate digital images with the waypoints in the GPX files.

The files and digital images are generated while the user is traveling. The GPS device records latitude and longitude coordinates as the user travels, called track points automatically. The user creates waypoints with the GPS device, manually. The user has the option of taking photos to associate with the created waypoint. Depending on the digital camera used there will be time and GPS data recorded in the metadata of the digital image. Currently the scripts do not use metadata from the digital image. An array that indicates the quantity of images to associate with a way point is provided to a script.

The final output of this process will create a .KML(Keyhole Markup Language) file that can be used in mapping software to create a map recording of the user's journey.

The files used to parse the GPX file.

remove-duplicates.ts

If the user non-intentionally creates multiple waypoints at the same location the file remove-duplicates can be used to clean these duplicate waypoints.

update-gpx-name.ts

GPS devices will provide a default name to a way point. The script update-gpx-name will update the name of the waypoint with the latitude, longitude and elevation information. This information will be displayed in map software.

gpx-names-to-array.ts

In order to update waypoints with image data an array that contains the name of the waypoint with the count of the images to be added must be generated. Once this array is created the user will associate the count of images that will be associated with the waypoint. This array will be provided to the script, update-gpx-image.ts 


process GPX

1 remove duplicates
remove-duplicates.ts

2 update names in GPS with full time
update-gpx-names.ts

3 make array of waypoints and images associated with the waypoint
gpx-names-to-array.ts

4 use array to update GPX with images
update-gpx-image.ts

5 Convert GPX to KLM

6 review and update array
