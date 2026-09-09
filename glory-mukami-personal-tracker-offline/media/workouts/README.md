# Workout media library

The project explorer now exposes the actual local workout-media library through these entries:

- `videos/` — 31 renamed MP4 files, grouped by routine prefix: `core_`, `glutes_`, `arms_`, and `back_`.
- `posters/` — 26 renamed poster images using the same routine and exercise naming convention.

Examples include `core_basic_crunches_video.mp4`, `glutes_fire_hydrants_video.mp4`, `arms_front_raise_verified_video.mp4`, `back_dumbbell_lat_pull_video.mp4`, `back_resistance_band_upper_back_pull_poster.jpg`, and `arms_wrist_curl_poster.png`.

The actual files are stored in the safe local asset library at `/home/ubuntu/webdev-static-assets/workouts/` and exposed in this project explorer through the `videos` and `posters` links. They are not remote-only references. The live app continues using its canonical managed-storage URLs because the web deployment must not bundle large binary media into the deployable source tree.

The authoritative exercise-to-video mapping remains in [`client/src/lib/workoutDemoCatalog.ts`](../../client/src/lib/workoutDemoCatalog.ts), while the complete managed-source inventory remains in [`docs/assets/asset-manifest.md`](../../docs/assets/asset-manifest.md).

## Naming convention

| Routine | Local filename pattern |
|---|---|
| Core | `core_<exercise>_video.mp4` and `core_<exercise>_poster.<ext>` |
| Glutes | `glutes_<exercise>_video.mp4` and `glutes_<exercise>_poster.<ext>` |
| Arms | `arms_<exercise>_video.mp4` and `arms_<exercise>_poster.<ext>` |
| Back | `back_<exercise>_video.mp4` and `back_<exercise>_poster.<ext>` |

The filenames are local inspection names only; changing them does not change the live app’s managed-storage URLs or exercise mapping.
