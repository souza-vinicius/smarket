"use client";

import { useState, useCallback, useRef, useEffect } from "react";

import { Upload, X, FileText, ImagePlus, Trash2, Camera, Loader2, Send, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { isNative } from "@/lib/capacitor";
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

  const handleXMLFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onUploadXML(e.target.files[0]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 transform scale-100">

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Adicionar Fotos da Nota Fiscal
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X className="size-6" />
          </button>
        </div>

        {/* Tabs - Only show if there's more than one option */}
        {showTabs && (
          <div className="px-6 pb-2 flex gap-2">
            <button
              onClick={() => setActiveTab("images")}
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
                onClick={() => setActiveTab("xml")}
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
                onClick={() => setActiveTab("qrcode")}
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
              <div className="relative group">
                <div
                  onDragEnter={!isUploading ? handleDrag : undefined}
                  onDragLeave={!isUploading ? handleDrag : undefined}
                  onDragOver={!isUploading ? handleDrag : undefined}
                  onDrop={!isUploading ? handleDrop : undefined}
                  className={cn(
                    "p-10 flex flex-col items-center justify-center rounded-2xl transition-all duration-300 cursor-pointer border-2 border-dashed",
                    isUploading
                      ? "cursor-wait border-muted bg-muted/20"
                      : dragActive
                        ? "border-primary bg-primary/10"
                        : "border-emerald-400/30 bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20 dark:border-emerald-800/50"
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
                      <div className="size-16 mb-4 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <ImagePlus className="size-8" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1 text-center">
                        Arraste e solte as fotos aqui
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">
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
                          <div className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium hover:border-primary hover:text-primary transition-all shadow-sm cursor-pointer">
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
                <div className="mt-8 animate-in slide-in-from-bottom-5 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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

                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div
                        key={`preview-${String(index)}`}
                        className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 group"
                      >
                        <img
                          src={preview}
                          alt={`Foto ${String(index + 1)}`}
                          className="size-full object-cover transition-transform group-hover:scale-105"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 size-6 bg-slate-900/60 hover:bg-rose-500 text-white rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
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
                        <div className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 hover:text-primary hover:border-primary transition-colors h-full w-full">
                          <Plus className="size-6" />
                          <span className="text-[10px] font-bold uppercase mt-1">Add</span>
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
                className="w-full bg-primary hover:brightness-105 active:scale-[0.98] transition-all duration-200 py-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 group text-slate-900 hover:bg-primary/90"
              >
                <span className="text-slate-900 font-extrabold text-lg">
                  {isUploading ? "Enviando..." : "Enviar fotos"}
                </span>
                {!isUploading && (
                  <Send className="size-5 text-slate-900 group-hover:translate-x-1 transition-transform" />
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
                onChange={(e) => setQrCodeUrl(e.target.value)}
              />
              <Button type="submit" className="w-full" disabled={!qrCodeUrl.trim()}>
                Processar
              </Button>
            </form>
          )}

          {activeTab === "images" && (
            <p className="text-center mt-4 text-xs text-slate-400 dark:text-slate-500">
              Ao enviar, você concorda com nossos <a href="#" className="underline hover:text-slate-600 dark:hover:text-slate-300">Termos de Uso</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
