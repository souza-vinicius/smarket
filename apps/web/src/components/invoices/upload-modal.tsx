"use client";

import { useState, useCallback, useRef, useEffect } from "react";

import { Upload, X, ImagePlus, Camera, Loader2, Send, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isNative } from "@/lib/capacitor";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadXML: (file: File) => void;
  onUploadImages: (files: File[]) => void;
  onProcessQRCode: (url: string) => void;
  isUploading: boolean;
  initialTab?: UploadTab;
}

type UploadTab = "images" | "xml" | "qrcode";

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];
const MAX_IMAGES = 10;

export function UploadModal({
  isOpen,
  onClose,
  onUploadXML,
  onUploadImages,
  onProcessQRCode,
  isUploading,
  initialTab = "images",
}: UploadModalProps) {
  // Determine the effective initial tab based on flags
  const getEffectiveInitialTab = (): UploadTab => {
    if (initialTab === "xml" && !FEATURE_FLAGS.ENABLE_XML_UPLOAD) {
      return "images";
    }
    if (initialTab === "qrcode" && !FEATURE_FLAGS.ENABLE_QR_CODE) {
      return "images";
    }
    return initialTab;
  };

  const [activeTab, setActiveTab] = useState<UploadTab>(getEffectiveInitialTab());
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(getEffectiveInitialTab());
    }
  }, [isOpen, initialTab]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const addImages = useCallback(
    (newFiles: File[]) => {
      const remaining = MAX_IMAGES - selectedImages.length;
      const filesToAdd = newFiles.slice(0, remaining);

      if (filesToAdd.length === 0) {
        return;
      }

      setSelectedImages((prev) => [...prev, ...filesToAdd]);

      filesToAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    },
    [selectedImages.length]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (activeTab === "xml" && FEATURE_FLAGS.ENABLE_XML_UPLOAD) {
        if (e.dataTransfer.files?.[0]) {
          const file = e.dataTransfer.files[0];
          if (file.name.endsWith(".xml")) {
            onUploadXML(file);
          }
        }
      } else if (activeTab === "images") {
        const files = Array.from(e.dataTransfer.files).filter((f) =>
          ACCEPTED_IMAGE_TYPES.includes(f.type)
        );
        if (files.length > 0) {
          addImages(files);
        }
      }
    },
    [activeTab, onUploadXML, addImages]
  );

  const removeImage = useCallback((index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter((f) => ACCEPTED_IMAGE_TYPES.includes(f.type));
      addImages(files);
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { requestCameraPermission } = await import("@/lib/camera-permissions");
      const hasPermission = await requestCameraPermission();

      if (!hasPermission) {
        alert("Permissão de câmera necessária para tirar fotos de notas fiscais. Habilite nas configurações do app.");
        return;
      }

      const { Camera: CapCamera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const photo = await CapCamera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 90,
        width: 1536,
      });

      if (photo.dataUrl) {
        const response = await fetch(photo.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
        addImages([file]);
      }
    } catch (err) {
      if ((err as Error).message !== "User cancelled photos app") {
        console.error("Camera error:", err);
      }
    }
  };

  const handleSubmitImages = () => {
    if (selectedImages.length > 0) {
      onUploadImages(selectedImages);
    }
  };

  const handleQRCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qrCodeUrl.trim() && FEATURE_FLAGS.ENABLE_QR_CODE) {
      onProcessQRCode(qrCodeUrl.trim());
    }
  };

  const handleClose = () => {
    setSelectedImages([]);
    setImagePreviews([]);
    setQrCodeUrl("");
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  const showTabs = FEATURE_FLAGS.ENABLE_XML_UPLOAD || FEATURE_FLAGS.ENABLE_QR_CODE;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 duration-200">
      <div className="w-full max-w-xl scale-100 transform overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-300 dark:bg-slate-900">

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Adicionar Fotos da Nota Fiscal
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="size-6" />
          </button>
        </div>

        {/* Tabs - Only show if there's more than one option */}
        {showTabs && (
          <div className="flex gap-2 px-6 pb-2">
            <button
              onClick={() => { setActiveTab("images"); }}
              className={cn(
                "flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "images"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              Foto
            </button>
            {FEATURE_FLAGS.ENABLE_XML_UPLOAD && (
              <button
                onClick={() => { setActiveTab("xml"); }}
                className={cn(
                  "flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === "xml"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                XML
              </button>
            )}
            {FEATURE_FLAGS.ENABLE_QR_CODE && (
              <button
                onClick={() => { setActiveTab("qrcode"); }}
                className={cn(
                  "flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === "qrcode"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                QR Code
              </button>
            )}
          </div>
        )}

        <div className="p-6 pt-2">
          {activeTab === "images" ? (
            <div className="space-y-6">
              {/* Drop Zone */}
              <div className="group relative">
                <div
                  onDragEnter={!isUploading ? handleDrag : undefined}
                  onDragLeave={!isUploading ? handleDrag : undefined}
                  onDragOver={!isUploading ? handleDrag : undefined}
                  onDrop={!isUploading ? handleDrop : undefined}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-all duration-300",
                    isUploading
                      ? "cursor-wait border-muted bg-muted/20"
                      : dragActive
                        ? "border-primary bg-primary/10"
                        : "border-emerald-400/30 bg-emerald-50/50 hover:bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20"
                  )}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center py-4">
                      <Loader2 className="mb-3 size-10 animate-spin text-primary" />
                      <p className="text-sm font-medium">Processando imagens...</p>
                      <p className="mt-1 text-xs text-muted-foreground">Por favor, aguarde.</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <ImagePlus className="size-8" />
                      </div>
                      <h3 className="mb-1 text-center text-lg font-semibold text-slate-700 dark:text-slate-200">
                        Arraste e solte as fotos aqui
                      </h3>
                      <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        Formatos aceitos: JPG, PNG e WebP (máx. {MAX_IMAGES} arquivos)
                      </p>

                      <div className="flex gap-3">
                        {isNative() && (
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={() => void handleTakePhoto()}
                            className="rounded-full"
                          >
                            <Camera className="mr-2 size-4" />
                            Câmera
                          </Button>
                        )}
                        <label className="inline-block">
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                            multiple
                            onChange={handleImageFileChange}
                            className="hidden"
                          />
                          <div className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-2.5 font-medium text-slate-700 shadow-sm transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            <Upload className="size-5" />
                            Selecionar arquivos
                          </div>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Selected Files Grid */}
              {selectedImages.length > 0 && (
                <div className="animate-in slide-in-from-bottom-5 mt-8 duration-300">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Arquivos selecionados ({selectedImages.length})
                    </span>
                    <button
                      onClick={() => {
                        setSelectedImages([]);
                        setImagePreviews([]);
                      }}
                      className="text-xs font-semibold text-rose-500 hover:underline"
                    >
                      Remover todos
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                    {imagePreviews.map((preview, index) => (
                      <div
                        key={`preview-${String(index)}`}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <img
                          src={preview}
                          alt={`Foto ${String(index + 1)}`}
                          className="size-full object-cover transition-transform group-hover:scale-105"
                        />
                        <button
                          onClick={() => { removeImage(index); }}
                          className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 transition-colors hover:bg-rose-500 group-hover:opacity-100"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}

                    {/* Add More Button */}
                    {selectedImages.length < MAX_IMAGES && (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                          multiple
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                        <div className="flex aspect-square size-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-600">
                          <Plus className="size-6" />
                          <span className="mt-1 text-[10px] font-bold uppercase">Add</span>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmitImages}
                disabled={selectedImages.length === 0 || isUploading}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-6 text-slate-900 shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:bg-primary/90 hover:brightness-105 active:scale-[0.98]"
              >
                <span className="text-lg font-extrabold text-slate-900">
                  {isUploading ? "Enviando..." : "Enviar fotos"}
                </span>
                {!isUploading && (
                  <Send className="size-5 text-slate-900 transition-transform group-hover:translate-x-1" />
                )}
              </Button>
            </div>
          ) : activeTab === "xml" ? (
            <div className="p-8 text-center">
              <p>XML Upload placeholder (use old design here if needed)</p>
            </div>
          ) : (
            <form onSubmit={handleQRCodeSubmit} className="space-y-4 pt-4">
              <Input
                label="URL do QR Code"
                placeholder="https://www.sefaz..."
                value={qrCodeUrl}
                onChange={(e) => { setQrCodeUrl(e.target.value); }}
              />
              <Button type="submit" className="w-full" disabled={!qrCodeUrl.trim()}>
                Processar
              </Button>
            </form>
          )}

          {activeTab === "images" && (
            <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
              Ao enviar, você concorda com nossos <a href="#" className="underline hover:text-slate-600 dark:hover:text-slate-300">Termos de Uso</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
