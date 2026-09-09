# Project organization

The application source remains under `client/src`, `server`, `shared`, and `drizzle`, matching the fullstack template. Project documentation is grouped under `docs/` by purpose.

| Folder | Contents |
|---|---|
| `docs/assets/` | Asset metadata, approved Yoga choices, the managed-storage manifest, and artwork maps. |
| `docs/audits/` | Accessibility, contrast, persistence, and visual-refinement audits. |
| `docs/inspections/` | Exercise and workout inspection notes. |
| `docs/verification/` | Browser, SVG, layout, and artwork verification records. |
| `docs/notes/` | Comparative notes and structured media-analysis records. |
| `docs/project/` | Project scope and planning documents. |

## Media storage rule

Large wallpapers, workout videos, GIFs, posters, and illustrations are not copied into `client/src` or `client/public`. Their source files are preserved outside the repository in `/home/ubuntu/webdev-static-assets/`, and the application references their managed `/media/runtime/` URLs. This keeps the editor tree organized and avoids deployment timeouts while retaining all media in the project’s managed storage.

The canonical inventory is [`assets/asset-manifest.md`](assets/asset-manifest.md). Its automated regression test ensures every managed-storage reference used by the source appears exactly once in the manifest.
