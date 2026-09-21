import React, { useState, useRef } from "react";
import { Upload, Image as ImageIcon, Loader2, X, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { uploadImageToImgbb } from "../imageUpload";

interface ImageUploaderProps {
  id: string;
  label?: string;
  imageUrl: string;
  onImageChange: (url: string) => void;
  placeholder?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  id,
  label = "Afbeelding (Optioneel)",
  imageUrl,
  onImageChange,
  placeholder = "https://i.ibb.co/... of plak een afbeeldingslink",
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Kies een geldig afbeeldingsbestand (PNG, JPG, WebP, GIF).");
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const url = await uploadImageToImgbb(file);
      onImageChange(url);
      setSuccessMsg("Foto succesvol geüpload naar ImgBB!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMsg(err.message || "Uploaden naar ImgBB is mislukt. Probeer het opnieuw.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div id={`container-${id}`} className="space-y-2">
      {/* Label and Upload State */}
      <div className="flex items-center justify-between">
        <label htmlFor={`input-${id}`} className="block text-sm font-semibold text-gray-700 dark:text-slate-400">
          {label}
        </label>
        {isUploading && (
          <span className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-bold animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Uploaden via ImgBB...
          </span>
        )}
      </div>

      {/* Upload and URL Input Group with Drag & Drop */}
      <div
        id={`dropzone-${id}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative rounded-xl border transition-all ${
          isDragging
            ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 ring-2 ring-purple-400/40"
            : "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5">
          {/* Text Input for URL */}
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5">
            <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              id={`input-${id}`}
              type="url"
              value={imageUrl}
              onChange={(e) => {
                onImageChange(e.target.value);
                setErrorMsg(null);
              }}
              placeholder={placeholder}
              disabled={isUploading}
              className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium outline-none focus:ring-0 disabled:opacity-50"
            />
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            id={`file-input-${id}`}
            type="file"
            accept="image/*"
            onChange={onInputChange}
            className="hidden"
          />

          {/* Upload Button */}
          <button
            id={`btn-upload-${id}`}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-98 text-white font-bold text-xs shadow-sm shadow-purple-600/20 disabled:opacity-50 transition cursor-pointer shrink-0 whitespace-nowrap min-h-[44px]"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploaden...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Foto Uploaden (ImgBB)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div id={`success-${id}`} className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div id={`error-${id}`} className="flex items-center justify-between gap-2 text-xs text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/40 p-2 rounded-lg border border-red-200 dark:border-red-800/50">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-500 hover:text-red-700 cursor-pointer p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Image Preview & Details Card */}
      {imageUrl && (
        <div
          id={`preview-${id}`}
          className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 transition"
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={imageUrl}
              alt="Voorbeeld afbeelding"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                Afbeelding gekoppeld
              </span>
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium truncate"
              >
                <span>{imageUrl.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
              </a>
            </div>
          </div>

          <button
            id={`btn-remove-${id}`}
            type="button"
            onClick={() => {
              onImageChange("");
              setErrorMsg(null);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer min-h-[36px]"
            title="Afbeelding verwijderen"
          >
            <X className="w-3.5 h-3.5" />
            <span>Wis</span>
          </button>
        </div>
      )}
    </div>
  );
};
