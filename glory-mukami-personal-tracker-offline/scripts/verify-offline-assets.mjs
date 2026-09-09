import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceRoots = ["client", "server", "shared", "docs"];
const extensions = new Set([".ts", ".tsx", ".css", ".html", ".json"]);
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (extensions.has(entry.name.slice(entry.name.lastIndexOf(".")))) files.push(path);
  }
}

for (const directory of sourceRoots) await walk(join(root, directory));
const refs = new Set();
const remoteRefs = [];
for (const file of files) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(/\/media\/runtime\/([A-Za-z0-9._/-]+)/g)) refs.add(match[1]);
  if (text.includes("/manus-storage/")) remoteRefs.push(relative(root, file));
}
const missing = [];
for (const ref of refs) {
  try {
    const info = await stat(join(root, "client/public/media/runtime", ref));
    if (!info.isFile()) missing.push(ref);
  } catch {
    missing.push(ref);
  }
}
if (remoteRefs.length || missing.length) {
  console.error(JSON.stringify({ remoteRefs, missing }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ filesScanned: files.length, localReferences: refs.size, missing: 0, remoteReferences: 0 }, null, 2));
