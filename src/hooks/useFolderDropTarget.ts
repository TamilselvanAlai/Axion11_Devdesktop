import { useState } from "react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { contentsFromDataTransfer, type UploadTarget } from "@/utils/dragDropFiles";

function hasFiles(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes("Files");
}

/** Wires up drag-over/drop handlers that upload whatever's dropped straight to the given
 *  project/batch — loose files go directly into it, and dropped folders each become a new
 *  sub-batch named after the folder. Pass null to disable (e.g. scopes like "Recent" that
 *  aren't a valid upload destination). */
export function useFolderDropTarget(target: UploadTarget | null) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { uploadDroppedContents } = useFileUpload();

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      if (!target || !hasFiles(e)) return;
      e.preventDefault();
      setIsDragOver(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!target) return;
      e.preventDefault();
      setIsDragOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!target || !hasFiles(e)) return;
      e.preventDefault();
      setIsDragOver(false);
      contentsFromDataTransfer(e.dataTransfer).then((contents) => uploadDroppedContents(contents, target));
    },
  };

  return { isDragOver, dropHandlers };
}
