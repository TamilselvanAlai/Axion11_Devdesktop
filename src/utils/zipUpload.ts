import JSZip from "jszip";

/** Unpacks a .zip into plain Files, skipping directory entries and OS junk
 *  (macOS resource forks, hidden files) that shouldn't become assets. */
export async function extractZipToFiles(zipFile: File): Promise<File[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const files: File[] = [];

  for (const [relativePath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const baseName = relativePath.split("/").pop() ?? "";
    if (!baseName || baseName.startsWith(".") || relativePath.startsWith("__MACOSX/")) continue;

    const blob = await entry.async("blob");
    files.push(new File([blob], baseName));
  }

  return files;
}

/** Derives a sub-batch name from a zip's filename (extension stripped). */
export function batchNameFromZip(zipFile: File): string {
  return zipFile.name.replace(/\.zip$/i, "");
}
