"use client";

import Icon from "@/components/ui/Icon";

interface AdvancedFiltersSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
  onApply: () => void;
  title?: string;
  children: React.ReactNode;
  clearLabel?: string;
  applyLabel?: string;
}

export default function AdvancedFiltersSidebar({
  isOpen,
  onClose,
  onClear,
  onApply,
  title = "Filtros Avanzados",
  children,
  clearLabel = "Limpiar Todo",
  applyLabel = "Aplicar Filtros",
}: AdvancedFiltersSidebarProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div
        className={`relative w-[400px] h-full bg-bg-primary shadow-[0px_24px_48px_-12px_rgba(0,0,0,0.15)] border-l border-stroke-secondary flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="pl-6 pr-3.5 py-6 border-b border-stroke-secondary flex items-center gap-4">
          <div className="flex-1 flex items-center gap-2">
            <div className="p-2 bg-bg-accent-light rounded-full flex items-center">
              <Icon
                name="filter_list"
                size={20}
                className="text-icon-accent-primary"
              />
            </div>
            <span className="flex-1 text-text-primary text-xl font-semibold leading-6">
              {title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-bg-secondary transition-colors"
          >
            <Icon name="close" size={24} className="text-icon-tertiary" />
          </button>
        </div>

        <div className="flex-1 p-6 flex flex-col gap-8 overflow-y-auto">
          {children}
        </div>

        <div className="p-6 border-t border-stroke-secondary flex justify-end items-center gap-4">
          <button
            onClick={onClear}
            className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center gap-1.5 hover:bg-bg-secondary transition-colors"
          >
            <span className="text-text-tertiary text-sm font-medium leading-4">
              {clearLabel}
            </span>
          </button>
          <button
            onClick={onApply}
            className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg flex items-center gap-1.5 hover:bg-bg-accent-solid-hover transition-colors"
          >
            <span className="text-text-white text-sm font-medium leading-4">
              {applyLabel}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
