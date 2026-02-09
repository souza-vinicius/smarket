"use client";

import { type ReactNode } from "react";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  closeButton?: boolean;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeButton = true,
}: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
        role="presentation"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`relative flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Close Button */}
          {closeButton && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-5" />
            </button>
          )}

          {/* Header */}
          {title && (
            <div className="border-b border-slate-200 px-6 pb-4 pt-6">
              <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
              {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
            </div>
          )}

          {/* Content */}
          {children && <div className="flex-1 px-6 py-4">{children}</div>}

          {/* Footer */}
          {footer && (
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "default";
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isLoading = false,
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      description={description}
      closeButton={false}
    >
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isLoading} className="flex-1">
          {cancelText}
        </Button>
        <Button
          variant={variant === "danger" ? "destructive" : "primary"}
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? "Processando..." : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
