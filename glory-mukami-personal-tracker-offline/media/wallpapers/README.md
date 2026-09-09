# Wallpaper and painting library

The project explorer now exposes the actual local wallpaper and painting library through `files/`. It contains all **98** wallpaper, painting, illustration, and yoga-art image files with readable names.

## Naming convention

| Asset kind | Local filename pattern | Example |
|---|---|---|
| Page wallpaper | `<page>_page_wallpaper.<ext>` | `nutrition_orchard_page_wallpaper.png` |
| Page painting | `<page>_page_painting.<ext>` | `workouts_sunrise_motion_page_painting.png` |
| Page illustration | `<page>_page_illustration.<ext>` | `habits_ochre_painter_page_illustration.png` |
| Yoga illustration | `yoga_<pose>_illustration.<ext>` | `yoga_lizard_pose_illustration.png` |
| Workout poster | `workout_<exercise>_poster.<ext>` | `workout_dumbbell_lat_pull_user_supplied_poster.png` |

Page-related examples include `nutrition_orchard_page_painting.png`, `nutrition_floral_tea_table_page_illustration.png`, `sleep_celestial_ocean_page_painting.png`, `goals_night_bloom_page_wallpaper.png`, `habits_ochre_painter_page_illustration.png`, and `workouts_night_motion_page_wallpaper.png`.

The actual image files are stored in the safe local asset library at `/home/ubuntu/webdev-static-assets/wallpapers-renamed/` and exposed here through the `files` link. They are not remote-only references. The live app continues using canonical managed-storage URLs so the deployable web bundle does not package 98 large images.

The complete managed-source inventory remains in [`docs/assets/asset-manifest.md`](../../docs/assets/asset-manifest.md). The explorer-visible local names are a readable local copy and do not alter the app’s runtime mappings.
