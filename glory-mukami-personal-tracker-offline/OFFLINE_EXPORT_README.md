# Glory Mukami’s Personal Tracker — Offline VS Code Export

This archive is a self-contained source export of the Personal Tracker. It includes the React client, Express/tRPC server, database schema and migrations, shared types, tests, documentation, configuration, and all media referenced by the source.

## Local media

The actual explorer-visible media libraries are stored locally in the following folders:

- `media/wallpapers/files/` — all renamed wallpapers, paintings, page illustrations, and yoga artwork.
- `media/workouts/videos/` — renamed workout MP4 files by routine and exercise.
- `media/workouts/posters/` — renamed workout poster images by routine and exercise.
- `client/public/media/runtime/` — exact local copies of every media file referenced by source code.

All source references that previously used `/manus-storage/...` have been rewritten to `/media/runtime/...`. The exported application therefore does not need Manus or remote storage to load its referenced images and videos.

## Run in VS Code

Open this folder in VS Code. Install the dependencies with `pnpm install` when a package registry is available, then use the existing `pnpm run dev`, `pnpm test`, and build scripts. The media assets themselves are already local and do not need to be downloaded.

The MongoDB connection and OAuth services remain configuration-dependent backend integrations. The media and frontend source are independent of those remote services.
