import { ImageIcon, TrashIcon, UploadIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "#/components/ui/button";

type ImageUploadProps = {
  initialImage: string | null | undefined;
  onClear: () => void;
  /** The parent receives the file here and orchestrates the upload + persistence. */
  onFileSelect: (file: File | null) => void;
  /** Set to true while the parent is uploading the file. */
  isUploading?: boolean;
};

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "image/avif": [".avif"],
};

const ALLOWED_EXTENSIONS = ".jpg, .jpeg, .png, .webp, .gif, .avif";

export function ImageUpload({
  initialImage,
  onClear,
  onFileSelect,
  isUploading,
}: ImageUploadProps) {
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const prevPreviewRef = useRef<string | null>(null);

  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      setRejectionError(null);
      const file = acceptedFiles[0];
      if (!file) return;

      if (prevPreviewRef.current) URL.revokeObjectURL(prevPreviewRef.current);

      const objectUrl = URL.createObjectURL(file);
      prevPreviewRef.current = objectUrl;
      setPreviewUrl(objectUrl);

      onFileSelect(file);
    },
    [onFileSelect],
  );

  const clearPending = useCallback(() => {
    if (prevPreviewRef.current) URL.revokeObjectURL(prevPreviewRef.current);
    prevPreviewRef.current = null;
    setPreviewUrl(null);
    onFileSelect(null);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleDrop,
    onDropRejected: useCallback((rejections) => {
      const rejection = rejections[0];
      if (!rejection) return;
      const [error] = rejection.errors;
      if (error.code === "file-too-large") {
        setRejectionError("La imagen no puede superar los 5 MB");
      } else if (error.code === "file-invalid-type") {
        setRejectionError(`Tipo no permitido. Usa: ${ALLOWED_EXTENSIONS}`);
      } else {
        setRejectionError(error.message);
      }
    }, []),
    accept: ACCEPT,
    maxSize: MAX_SIZE,
    multiple: false,
  });

  // ── Existing image from DB ──────────────────────────────

  if (initialImage && !previewUrl && !isUploading) {
    return (
      <div className="relative overflow-hidden rounded-lg border">
        <img src={initialImage} alt="Preview" className="aspect-square w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/40 p-2 backdrop-blur-sm">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1 text-xs"
            onClick={open}
          >
            <UploadIcon className="mr-1 size-3" />
            Cambiar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="text-xs"
            onClick={onClear}
          >
            <TrashIcon className="mr-1 size-3" />
            Quitar
          </Button>
        </div>
        <input {...getInputProps()} />
      </div>
    );
  }

  // ── Pending file preview (selected, not yet uploaded) ───

  if (previewUrl || isUploading) {
    return (
      <div className="relative overflow-hidden rounded-lg border">
        {previewUrl && (
          <img src={previewUrl} alt="Preview" className="aspect-square w-full object-cover" />
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="size-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/40 p-2 backdrop-blur-sm">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1 text-xs"
            onClick={open}
          >
            <UploadIcon className="mr-1 size-3" />
            Cambiar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="text-xs"
            onClick={clearPending}
          >
            <TrashIcon className="mr-1 size-3" />
            Quitar
          </Button>
        </div>
        <input {...getInputProps()} />
      </div>
    );
  }

  // ── Empty dropzone ──────────────────────────────────────

  return (
    <div
      {...getRootProps()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${
        isDragActive
          ? "border-earth bg-earth/5"
          : "border-gray-300 hover:border-earth/50 hover:bg-earth/5"
      }`}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <div className="size-6 animate-spin rounded-full border-2 border-gray-300 border-t-earth" />
      ) : (
        <ImageIcon className="size-8 text-gray-400" />
      )}
      <p className="text-center text-gray-500 text-sm">
        {isUploading ? "Subiendo..." : "Click o arrastra una imagen"}
      </p>
      <p className="text-gray-400 text-xs">JPG, PNG, WebP, GIF o AVIF (máx. 5 MB)</p>
      {rejectionError && <p className="font-medium text-red-600 text-xs">{rejectionError}</p>}
    </div>
  );
}
