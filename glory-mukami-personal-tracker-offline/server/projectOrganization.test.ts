import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const docs = join(root, "docs");
const workoutMedia = join(root, "media", "workouts");
const wallpaperMedia = join(root, "media", "wallpapers");

function mediaFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (["files", "videos", "posters"].includes(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() && !entry.isSymbolicLink()
      ? mediaFiles(path)
      : !entry.isSymbolicLink() &&
          /\.(mp4|gif|webm|mov|png|jpe?g|webp|wav|mp3)$/i.test(entry.name)
        ? [path]
        : [];
  });
}

describe("project organization", () => {
  it("keeps documentation in its respective folders", () => {
    expect(existsSync(join(docs, "README.md"))).toBe(true);
    expect(existsSync(join(docs, "assets", "asset-manifest.md"))).toBe(true);
    expect(existsSync(join(docs, "audits"))).toBe(true);
    expect(existsSync(join(docs, "inspections"))).toBe(true);
    expect(existsSync(join(docs, "verification"))).toBe(true);
    expect(existsSync(join(docs, "notes"))).toBe(true);
    expect(existsSync(join(docs, "project"))).toBe(true);
    expect(existsSync(workoutMedia)).toBe(true);
    expect(existsSync(join(workoutMedia, "README.md"))).toBe(true);
    expect(existsSync(wallpaperMedia)).toBe(true);
    expect(existsSync(join(wallpaperMedia, "README.md"))).toBe(true);
    expect(
      readdirSync(wallpaperMedia, { withFileTypes: true }).some(
        entry =>
          entry.name === "files" &&
          (entry.isSymbolicLink() || entry.isDirectory())
      )
    ).toBe(true);
    expect(
      readdirSync(workoutMedia, { withFileTypes: true }).some(
        entry =>
          entry.name === "videos" &&
          (entry.isSymbolicLink() || entry.isDirectory())
      )
    ).toBe(true);
    expect(
      readdirSync(workoutMedia, { withFileTypes: true }).some(
        entry =>
          entry.name === "posters" &&
          (entry.isSymbolicLink() || entry.isDirectory())
      )
    ).toBe(true);
  });

  it("keeps the project-visible workout folder deployment-safe", () => {
    expect(mediaFiles(workoutMedia)).toEqual([]);
  });

  it("keeps the project-visible wallpaper folder deployment-safe", () => {
    expect(mediaFiles(wallpaperMedia)).toEqual([]);
  });

  it("exposes the complete renamed local media libraries", () => {
    const wallpaperFiles = readdirSync(join(wallpaperMedia, "files"));
    const workoutVideos = readdirSync(join(workoutMedia, "videos"));
    const workoutPosters = readdirSync(join(workoutMedia, "posters"));
    expect(
      wallpaperFiles.filter(name => /\.(png|jpe?g|webp)$/i.test(name))
    ).toHaveLength(98);
    expect(
      workoutVideos.filter(name => name.endsWith("_video.mp4"))
    ).toHaveLength(31);
    expect(
      workoutPosters.filter(name => /_poster\.(png|jpe?g|webp)$/i.test(name))
    ).toHaveLength(26);
    expect(wallpaperFiles.every(name => !/_[0-9a-f]{8}\./i.test(name))).toBe(
      true
    );
    expect(
      workoutVideos.every(name =>
        /^(core|glutes|arms|back)_.+_video\.mp4$/.test(name)
      )
    ).toBe(true);
    expect(
      workoutPosters.every(name =>
        /^(core|glutes|arms|back)_.*_poster\.(png|jpe?g|webp)$/.test(name)
      )
    ).toBe(true);
  });

  it("keeps large media out of deployable client source", () => {
    expect(mediaFiles(join(root, "client", "src"))).toEqual([]);
    const publicMedia = mediaFiles(join(root, "client", "public")).filter(
      file =>
        !file.includes("media/runtime") && !file.includes("media\\runtime")
    );
    expect(publicMedia).toEqual([]);
  });
});
