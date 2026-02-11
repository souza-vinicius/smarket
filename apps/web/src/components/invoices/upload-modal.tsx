"use client";

import { useState, useCallback, useRef, useEffect } from "react";

import { Upload, QrCode, X, FileText, ImagePlus, Trash2, Camera, Loader2 } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Adicionar Nota Fiscal</h2>
          <button onClick={handleClose} className="rounded-full p-1 hover:bg-accent">
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs - Only show if there's more than one option */}
        {showTabs && (
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => {
                setActiveTab("images");
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "images"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              <Camera className="size-4" />
              Fotos
            </button>
            {FEATURE_FLAGS.ENABLE_XML_UPLOAD && (
              <button
                onClick={() => {
                  setActiveTab("xml");
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === "xml"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                <FileText className="size-4" />
                XML
              </button>
            )}
            {FEATURE_FLAGS.ENABLE_QR_CODE && (
              <button
                onClick={() => {
                  setActiveTab("qrcode");
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === "qrcode"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                <QrCode className="size-4" />
                QR Code
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {activeTab === "images" ? (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDragEnter={!isUploading ? handleDrag : undefined}
              onDragLeave={!isUploading ? handleDrag : undefined}
              onDragOver={!isUploading ? handleDrag : undefined}
              onDrop={!isUploading ? handleDrop : undefined}
              className={cn(
                "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                isUploading
                  ? "cursor-wait border-muted bg-muted/20"
                  : dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
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
                  <ImagePlus className="mx-auto size-10 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">
                    Arraste e solte as fotos da nota fiscal
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG ou WebP — até {MAX_IMAGES} imagens
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    {isNative() && (
                      <Button
                        variant="default"
                        type="button"
                        size="sm"
                        onClick={() => void handleTakePhoto()}
                      >
                        <Camera className="mr-2 size-4" />
                        Tirar Foto
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
                      <Button
                        variant="outline"
                        type="button"
                        size="sm"
                        className="pointer-events-none"
                      >
                        <Upload className="mr-2 size-4" />
                        Selecionar fotos
                      </Button>
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Image previews */}
            {selectedImages.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {selectedImages.length}{" "}
                    {selectedImages.length === 1 ? "foto selecionada" : "fotos selecionadas"}
                  </p>
                  {selectedImages.length < MAX_IMAGES && (
                    <label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                        multiple
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                      <Button
                        variant="ghost"
                        type="button"
                        size="sm"
                        className="pointer-events-none"
                      >
                        <ImagePlus className="mr-1 size-3" />
                        Adicionar mais
                      </Button>
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={`preview-${String(index)}`}
                      className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-slate-200"
                    >
                      <img
                        src={preview}
                        alt={`Foto ${String(index + 1)}`}
                        className="size-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30" />
                      <button
                        onClick={() => {
                          removeImage(index);
                        }}
                        className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="size-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                        {index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="button"
              className="w-full"
              onClick={handleSubmitImages}
              isLoading={isUploading}
              disabled={selectedImages.length === 0}
            >
              <Upload className="mr-2 size-4" />
              {isUploading
                ? "Processando imagens..."
                : `Enviar ${selectedImages.length > 0 ? `${String(selectedImages.length)} ` : ""}${selectedImages.length === 1 ? "foto" : "fotos"}`}
            </Button>

            {selectedImages.length > 1 && (
              <p className="text-center text-xs text-muted-foreground">
                As imagens serão combinadas para extrair os dados da nota fiscal completa
              </p>
            )}
          </div>
        ) : activeTab === "xml" ? (
          <div
            onDragEnter={!isUploading ? handleDrag : undefined}
            onDragLeave={!isUploading ? handleDrag : undefined}
            onDragOver={!isUploading ? handleDrag : undefined}
            onDrop={!isUploading ? handleDrop : undefined}
            className={cn(
              "rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              isUploading
                ? "cursor-wait border-muted bg-muted/20"
                : dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
            )}
          >
            {isUploading ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="mb-3 size-10 animate-spin text-primary" />
                <p className="text-sm font-medium">Enviando arquivo...</p>
                <p className="mt-1 text-xs text-muted-foreground">Por favor, aguarde.</p>
              </div>
            ) : (
              <>
                <Upload className="mx-auto size-10 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">Arraste e solte um arquivo XML</p>
                <p className="text-xs text-muted-foreground">ou</p>
                <label className="mt-2 inline-block">
                  <input
                    type="file"
                    accept=".xml"
                    onChange={handleXMLFileChange}
                    className="hidden"
                  />
                  <Button variant="outline" type="button" className="pointer-events-none">
                    Selecionar arquivo
                  </Button>
                </label>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleQRCodeSubmit} className="space-y-4">
            <div>
              <Input
                label="URL do QR Code"
                placeholder="https://www.sefaz..."
                value={qrCodeUrl}
                onChange={(e) => {
                  setQrCodeUrl(e.target.value);
                }}
                hint="Cole a URL do QR Code da nota fiscal"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              isLoading={isUploading}
              disabled={!qrCodeUrl.trim()}
            >
              <QrCode className="mr-2 size-4" />
              Processar QR Code
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
