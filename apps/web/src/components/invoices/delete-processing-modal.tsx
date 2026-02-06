'use client';

import { useEffect, useState } from 'react';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

type DeleteState = 'idle' | 'confirming' | 'deleting' | 'success' | 'error';

interface DeleteProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  error?: string | null;
  issuerName?: string;
}

export function DeleteProcessingModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  error,
  issuerName = 'Processamento',
}: DeleteProcessingModalProps) {
  const [state, setState] = useState<DeleteState>('idle');

  useEffect(() => {
    if (!isOpen) {
      setState('idle');
    } else {
      setState('confirming');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isDeleting) {
      setState('deleting');
    } else if (state === 'deleting') {
      if (error) {
        setState('error');
      } else {
        setState('success');
      }
    }
  }, [isDeleting, error, state]);

  const handleClose = () => {
    if (state === 'success' || state === 'error') {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeButton={state !== 'deleting'}
      size="sm"
    >
      {/* Confirming State */}
      {state === 'confirming' && (
        <div className="py-4">
          <div className="mb-4 flex justify-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="size-8 text-red-600" />
            </div>
          </div>
          <h3 className="mb-2 text-center text-lg font-semibold text-slate-900">
            Deseja remover este processamento?
          </h3>
          <p className="mb-6 text-center text-sm text-slate-600">
            {issuerName}
          </p>
          <p className="mb-6 text-center text-xs text-slate-500">
            Esta ação não pode ser desfeita. O registro será permanentemente removido.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex-1"
            >
              {isDeleting ? 'Removendo...' : 'Remover'}
            </Button>
          </div>
        </div>
      )}

      {/* Deleting State */}
      {state === 'deleting' && (
        <div className="py-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-blue-100">
              <Loader2 className="size-8 animate-spin text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            Removendo processamento...
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Por favor aguarde
          </p>
        </div>
      )}

      {/* Success State */}
      {state === 'success' && (
        <div className="py-4">
          <div className="mb-4 flex justify-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
              <Check className="size-8 text-emerald-600" />
            </div>
          </div>
          <h3 className="mb-2 text-center text-lg font-semibold text-slate-900">
            Removido com sucesso!
          </h3>
          <p className="mb-6 text-center text-sm text-slate-600">
            O processamento foi removido da sua lista.
          </p>
          <Button
            variant="primary"
            onClick={handleClose}
            className="w-full"
          >
            Fechar
          </Button>
        </div>
      )}

      {/* Error State */}
      {state === 'error' && (
        <div className="py-4">
          <div className="mb-4 flex justify-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="size-8 text-red-600" />
            </div>
          </div>
          <h3 className="mb-2 text-center text-lg font-semibold text-slate-900">
            Erro ao remover
          </h3>
          <p className="mb-6 text-center text-sm text-slate-600">
            {error || 'Houve um problema ao remover o processamento. Tente novamente.'}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Fechar
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              className="flex-1"
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
