import { toast } from "sonner";

export type ZipUploadChoice = "zip" | "extract";

/** Asks the user how to handle dropped .zip file(s): upload as-is, or extract and upload the
 *  contents (each zip becoming its own new sub-batch, same as a dropped folder). Resolves to
 *  null if dismissed without a choice — callers should treat that as "do nothing with the zips". */
export function confirmZipUpload(zipNames: string[]): Promise<ZipUploadChoice | null> {
  return new Promise((resolve) => {
    let decided = false;

    const label =
      zipNames.length === 1 ? `"${zipNames[0]}"` : `${zipNames.length} ZIP files`;

    toast.custom(
      (toastId) => (
        <div className="flex w-80 flex-col gap-2.5 rounded-lg border border-border bg-popover p-3.5 shadow-xl">
          <p className="text-sm font-medium text-foreground">
            Upload {label} as-is, or extract and upload the contents?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                decided = true;
                toast.dismiss(toastId);
                resolve("zip");
              }}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
            >
              Upload as ZIP
            </button>
            <button
              type="button"
              onClick={() => {
                decided = true;
                toast.dismiss(toastId);
                resolve("extract");
              }}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-accent"
            >
              Extract &amp; Upload
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        onDismiss: () => {
          if (!decided) resolve(null);
        },
      }
    );
  });
}
