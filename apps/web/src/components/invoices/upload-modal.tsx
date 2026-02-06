'use client';

import { useState, useCallback } from 'react';

import { Upload, QrCode, X, FileText, Camera, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadXML: (file: File) => void;
  onUploadPhoto: (file: File) => void;
  onProcessQRCode: (url: string) => void;
  isUploading: boolean;
  initialTab?: UploadTab;
}

type UploadTab = 'xml' | 'qrcode' | 'photo';

export function UploadModal({
  isOpen,
  onClose,
  onUploadXML,
  onUploadPhoto,
  onProcessQRCode,
  isUploading,
  initialTab = 'xml',
}: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<UploadTab>(initialTab);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);

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

      if (e.dataTransfer.files?.[0]) {
        const file = e.dataTransfer.files[0];
        if (activeTab === 'xml' && file.name.endsWith('.xml')) {
          onUploadXML(file);
        } else if (activeTab === 'photo' && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/heic')) {
          onUploadPhoto(file);
        }
      }
    },
    [activeTab, onUploadXML, onUploadPhoto]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      if (activeTab === 'xml') {
        onUploadXML(e.target.files[0]);
      } else if (activeTab === 'photo') {
        onUploadPhoto(e.target.files[0]);
      }
    }
  };

  const handleQRCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qrCodeUrl.trim()) {
      onProcessQRCode(qrCodeUrl.trim());
    }
  };

  if (!isOpen) {return null;}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Adicionar Nota Fiscal</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-accent"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => { setActiveTab('xml'); }}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'xml'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            <FileText className="size-4" />
            XML
          </button>
          <button
            onClick={() => { setActiveTab('photo'); }}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'photo'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            <Camera className="size-4" />
            Foto
          </button>
          <button
            onClick={() => { setActiveTab('qrcode'); }}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'qrcode'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            <QrCode className="size-4" />
            QR Code
          </button>
        </div>

        {/* Content */}
        {activeTab === 'xml' || activeTab === 'photo' ? (
          <div
            onDragEnter={!isUploading ? handleDrag : undefined}
            onDragLeave={!isUploading ? handleDrag : undefined}
            onDragOver={!isUploading ? handleDrag : undefined}
            onDrop={!isUploading ? handleDrop : undefined}
            className={cn(
              'rounded-lg border-2 border-dashed p-8 text-center transition-colors',
              isUploading
                ? 'cursor-wait border-muted bg-muted/20'
                : dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
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
                <p className="mt-2 text-sm font-medium">
                  {activeTab === 'xml' ? 'Arraste e solte um arquivo XML' : 'Arraste e solte uma foto (JPEG)'}
                </p>
                <p className="text-xs text-muted-foreground">ou</p>
                <label className="mt-2 inline-block">
                  <input
                    type="file"
                    accept={activeTab === 'xml' ? ".xml" : ".jpg,.jpeg,.png,.heic"}
                    onChange={handleFileChange}
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
                onChange={(e) => { setQrCodeUrl(e.target.value); }}
                helperText="Cole a URL do QR Code da nota fiscal"
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
