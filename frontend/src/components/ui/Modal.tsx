"use client";

import { useEffect, useCallback } from "react";
import Icon from "./Icon";

// ============================================
// Tipos
// ============================================

type ModalSize = "sm" | "md" | "lg";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: ModalSize;
  /** Footer con botones de acción. Si no se pasa, no se muestra footer. */
  footer?: React.ReactNode;
  /** Si true, cierra el modal al hacer click en el overlay. Default: true */
  closeOnOverlay?: boolean;
  /** Si true, muestra el botón X en el header. Default: true */
  showCloseButton?: boolean;
  /** z-index personalizado para casos especiales (ej. SessionClosedModal). Default: 50 */
  zIndex?: number;
  /** Clases extra para el body del modal */
  bodyClassName?: string;
}

// ============================================
// Subcomponentes para el footer
// ============================================

type ButtonVariant = "primary" | "secondary" | "danger";

interface ModalButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  type?: "button" | "submit";
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-bg-accent-primary-solid text-text-white hover:bg-bg-accent-solid-hover",
  secondary:
    "bg-bg-primary text-text-tertiary outline outline-1 outline-offset-[-1px] outline-stroke-primary hover:bg-bg-secondary",
  danger: "bg-bg-error-solid text-text-white hover:bg-bg-error-solid/90",
};

function ModalButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  loading = false,
  loadingText,
  type = "button",
  className = "",
}: ModalButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`px-6 py-3 rounded-lg flex justify-center items-center gap-1.5 text-sm font-medium leading-4 transition-colors ${isDisabled ? "bg-bg-disabled text-text-disabled cursor-not-allowed" : variantStyles[variant]} ${className}`}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

// ============================================
// Helpers de tamaño
// ============================================

const sizeClasses: Record<ModalSize, string> = {
  sm: "w-[448px]", // 384px - Figma "Small"
  md: "max-w-lg w-full", // 512px
  lg: "max-w-2xl w-full", // 672px
};

// ============================================
// Componente principal
// ============================================

function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "sm",
  footer,
  closeOnOverlay = true,
  showCloseButton = true,
  zIndex = 50,
  bodyClassName = "",
}: ModalProps) {
  // Cerrar con Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener("keydown", handleKeyDown);
    // Bloquear scroll del body
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/25"
        onClick={closeOnOverlay ? onClose : undefined}
      />

      {/* Panel */}
      <div
        className={`relative ${sizeClasses[size]} bg-bg-primary rounded-xl shadow-[0px_24px_48px_-12px_rgba(0,0,0,0.25)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col animate-slideUp`}
      >
        {/* Header */}
        <div className="pl-6 pr-3 py-3 border-b border-stroke-secondary flex items-center gap-3">
          <h2 className="flex-1 text-text-primary text-xl font-semibold leading-6">
            {title}
          </h2>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full flex justify-center items-center hover:bg-bg-secondary transition-colors"
            >
              <Icon name="close" size={24} className="text-icon-tertiary" />
            </button>
          )}
        </div>

        {/* Body */}
        <div
          className={`p-6 flex flex-col gap-5 overflow-y-auto max-h-[calc(90vh-140px)] ${bodyClassName}`}
        >
          {children}
        </div>

        {/* Footer (opcional) */}
        {footer && (
          <div className="px-6 py-4 border-t border-stroke-secondary flex justify-end items-center gap-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Exportar como namespace para acceso limpio: Modal, Modal.Button
Modal.Button = ModalButton;

export default Modal;
export { ModalButton };
export type { ModalProps, ModalButtonProps, ModalSize, ButtonVariant };
