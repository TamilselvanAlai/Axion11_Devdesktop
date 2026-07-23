async function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const all: FileSystemEntry[] = [];
  // readEntries must be called repeatedly — browsers cap each batch (often at 100 entries),
  // a single call doesn't guarantee the full directory listing.
  for (;;) {
    const batch: FileSystemEntry[] = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    if (batch.length === 0) break;
    all.push(...batch);
  }
  return all;
}

async function collectFiles(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => (entry as FileSystemFileEntry).file((file) => resolve([file]), () => resolve([])));
  }
  if (entry.isDirectory) {
    const entries = await readAllEntries((entry as FileSystemDirectoryEntry).createReader());
    const nested = await Promise.all(entries.map(collectFiles));
    return nested.flat();
  }
  return [];
}

export interface DroppedFolder {
  name: string;
  files: File[];
}

export interface DroppedContents {
  /** Files dropped directly (not inside a folder) — upload straight into the drop target. */
  looseFiles: File[];
  /** Top-level folders dropped — each becomes its own new sub-batch named after the folder,
   *  with everything inside it (including nested subfolders) flattened into that batch's files. */
  folders: DroppedFolder[];
  /** Dropped .zip files — held out separately since what to do with them (upload as-is vs.
   *  extract) needs a user decision, unlike loose files/folders which have one obvious behavior. */
  zips: File[];
}

function isZipFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".zip");
}

/** Splits a drop event's DataTransfer into loose files, top-level dropped folders, and dropped
 *  .zip files, via the WebKit File/Directory Entries API — falls back to treating everything as
 *  loose files when that API isn't available (folder-ness can't be detected then). */
export async function contentsFromDataTransfer(dataTransfer: DataTransfer): Promise<DroppedContents> {
  const items = Array.from(dataTransfer.items ?? []);
  const entries = items
    .map((item) => item.webkitGetAsEntry?.())
    .filter((e): e is FileSystemEntry => e !== null && e !== undefined);

  if (entries.length === 0) {
    const files = Array.from(dataTransfer.files ?? []);
    return { looseFiles: files.filter((f) => !isZipFile(f)), folders: [], zips: files.filter(isZipFile) };
  }

  const looseFiles: File[] = [];
  const folders: DroppedFolder[] = [];
  const zips: File[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) {
      const files = await collectFiles(entry);
      folders.push({ name: entry.name, files });
    } else if (entry.isFile) {
      const file = await new Promise<File | null>((resolve) =>
        (entry as FileSystemFileEntry).file((f) => resolve(f), () => resolve(null))
      );
      if (!file) continue;
      if (isZipFile(file)) zips.push(file);
      else looseFiles.push(file);
    }
  }

  return { looseFiles, folders, zips };
}

export interface UploadTarget {
  type: "project" | "batch";
  id: string;
  /** Numeric project id (no "p-" prefix) — needed to create a new sub-batch under this target. */
  rootProjectId: string;
}

/** Tree node ids are prefixed ("p-1" for projects, "b-5" for batches/folders) — the prefix
 *  alone tells us which upload endpoint a drop/upload targets. Batch nodes carry their root
 *  project's tree id separately (ProjectNode.projectId) since a batch id alone doesn't encode it. */
export function toUploadTarget(node: { id: string; projectId?: string | null }): UploadTarget {
  const isBatch = node.id.startsWith("b-");
  const rawProjectId = isBatch ? node.projectId ?? "" : node.id;
  return {
    type: isBatch ? "batch" : "project",
    id: node.id,
    rootProjectId: rawProjectId.startsWith("p-") ? rawProjectId.slice(2) : rawProjectId,
  };
}
