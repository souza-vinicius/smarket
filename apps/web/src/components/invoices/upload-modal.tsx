'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, QrCode, X, FileText, ImagePlus, Trash2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadXML: (file: File) => void;
  onUploadImages: (files: File[]) => void;
  onProcessQRCode: (url: string) => void;
  isUploading: boolean;
}

type UploadTab = 'images' | 'xml' | 'qrcode';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
const MAX_IMAGES = 10;

export function UploadModal({
  isOpen,
  onClose,
  onUploadXML,
  onUploadImages,
  onProcessQRCode,
  isUploading,
}: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<UploadTab>('images');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (activeTab === 'xml') {
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          const file = e.dataTransfer.files[0];
          if (file.name.endsWith('.xml')) {
            onUploadXML(file);
          }
        }
      } else if (activeTab === 'images') {
        const files = Array.from(e.dataTransfer.files).filter((f) =>
          ACCEPTED_IMAGE_TYPES.includes(f.type)
        );
        if (files.length > 0) {
          addImages(files);
        }
      }
    },
    [activeTab, onUploadXML]
  );

  const addImages = useCallback(
    (newFiles: File[]) => {
      const remaining = MAX_IMAGES - selectedImages.length;
      const filesToAdd = newFiles.slice(0, remaining);

      if (filesToAdd.length === 0) return;

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

  const removeImage = useCallback((index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter((f) =>
        ACCEPTED_IMAGE_TYPES.includes(f.type)
      );
      addImages(files);
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleXMLFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadXML(e.target.files[0]);
    }
  };

  const handleSubmitImages = () => {
    if (selectedImages.length > 0) {
      onUploadImages(selectedImages);
    }
  };

  const handleQRCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qrCodeUrl.trim()) {
      onProcessQRCode(qrCodeUrl.trim());
    }
  };

  const handleClose = () => {
    setSelectedImages([]);
    setImagePreviews([]);
    setQrCodeUrl('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Adicionar Nota Fiscal</h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1 hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setActiveTab('images')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              activeTab === 'images'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            <Camera className="h-4 w-4" />
            Fotos
          </button>
          <button
            onClick={() => setActiveTab('xml')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              activeTab === 'xml'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            <FileText className="h-4 w-4" />
            XML
          </button>
          <button
            onClick={() => setActiveTab('qrcode')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              activeTab === 'qrcode'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            <QrCode className="h-4 w-4" />
            QR Code
          </button>
        </div>

        {/* Content */}
        {activeTab === 'images' ? (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              )}
            >
              <ImagePlus className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">
                Arraste e solte as fotos da nota fiscal
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG ou WebP — até {MAX_IMAGES} imagens
              </p>
              <label className="mt-3 inline-block">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                  multiple
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <Button variant="outline" type="button" size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Selecionar fotos
                </Button>
              </label>
            </div>

            {/* Image previews */}
            {selectedImages.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {selectedImages.length} {selectedImages.length === 1 ? 'foto selecionada' : 'fotos selecionadas'}
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
                      <Button variant="ghost" type="button" size="sm">
                        <ImagePlus className="mr-1 h-3 w-3" />
                        Adicionar mais
                      </Button>
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-slate-200"
                    >
                      <img
                        src={preview}
                        alt={`Foto ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
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
              <Upload className="mr-2 h-4 w-4" />
              {isUploading
                ? 'Processando imagens...'
                : `Enviar ${selectedImages.length > 0 ? selectedImages.length + ' ' : ''}${selectedImages.length === 1 ? 'foto' : 'fotos'}`}
            </Button>

            {selectedImages.length > 1 && (
              <p className="text-xs text-center text-muted-foreground">
                As imagens serão combinadas para extrair os dados da nota fiscal completa
              </p>
            )}
          </div>
        ) : activeTab === 'xml' ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              'rounded-lg border-2 border-dashed p-8 text-center transition-colors',
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            )}
          >
            <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">
              Arraste e solte um arquivo XML
            </p>
            <p className="text-xs text-muted-foreground">ou</p>
            <label className="mt-2 inline-block">
              <input
                type="file"
                accept=".xml"
                onChange={handleXMLFileChange}
                className="hidden"
              />
              <Button variant="outline" type="button">
                Selecionar arquivo
              </Button>
            </label>
          </div>
        ) : (
          <form onSubmit={handleQRCodeSubmit} className="space-y-4">
            <div>
              <Input
                label="URL do QR Code"
                placeholder="https://www.sefaz..."
                value={qrCodeUrl}
                onChange={(e) => setQrCodeUrl(e.target.value)}
                helperText="Cole a URL do QR Code da nota fiscal"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              isLoading={isUploading}
              disabled={!qrCodeUrl.trim()}
            >
              <QrCode className="mr-2 h-4 w-4" />
              Processar QR Code
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
