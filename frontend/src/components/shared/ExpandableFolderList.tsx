"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { FolderMaterial } from "@/types/material";
import Icon from "@/components/ui/Icon";
import {
  getFileNameWithoutExtension,
  getFileExtension,
  getFileIconPath,
} from "@/components/pages/student/EvaluationShared";

// ============================================
// Types
// ============================================

export interface ExpandableFolder {
  id: string;
  name: string;
  materialCount: number;
}

export interface FolderIconConfig {
  name: string;
  variant?: "rounded" | "outlined";
  bgClosed: string;
  colorClosed: string;
  bgOpen: string;
  colorOpen: string;
}

export type MaterialAction = "open" | "rename" | "download" | "info" | "delete";

interface ExpandableFolderListProps {
  title?: string;
  folders: ExpandableFolder[];
  loadFolderMaterials: (folderId: string) => Promise<FolderMaterial[]>;
  onDownloadMaterial: (material: FolderMaterial) => Promise<void>;
  onPreviewMaterial?: (materials: FolderMaterial[], index: number) => void;
  iconConfig?: FolderIconConfig;
  /** Acción extra renderizada a la derecha de "Expandir Todo" */
  headerAction?: React.ReactNode;
  /** Callback para subir material directamente a una carpeta específica */
  onUploadToFolder?: (folderId: string) => void;
  /** If provided, shows three-dot menu instead of download button */
  onMaterialAction?: (material: FolderMaterial, action: MaterialAction) => void;
}

// ============================================
// Defaults
// ============================================

const defaultIconConfig: FolderIconConfig = {
  name: "folder",
  variant: "rounded",
  bgClosed: "bg-bg-disabled",
  colorClosed: "text-icon-disabled",
  bgOpen: "bg-gray-700",
  colorOpen: "text-icon-white",
};

// ============================================
// Date formatting for file items
// ============================================

function formatMaterialDate(createdAt: string): string {
  const date = new Date(createdAt);
  const dateStr = `${date.getDate()}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  const hours = date.getHours();
  const ampm = hours >= 12 ? "pm" : "am";
  const hourNum = hours % 12 || 12;
  const mins = date.getMinutes();
  const timeStr =
    mins === 0
      ? `${hourNum}${ampm}`
      : `${hourNum}:${mins.toString().padStart(2, "0")}${ampm}`;
  return `${dateStr} - ${timeStr}`;
}

// ============================================
// Material file item row
// ============================================

function MaterialFileItem({
  material,
  onDownload,
  onPreview,
  onAction,
}: {
  material: FolderMaterial;
  onDownload: (material: FolderMaterial) => void;
  onPreview?: () => void;
  onAction?: (material: FolderMaterial, action: MaterialAction) => void;
}) {
  const matNameOnly = getFileNameWithoutExtension(material.displayName);
  const matExt = getFileExtension(material.displayName);
  const matIcon = getFileIconPath("", material.displayName);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const updateMenuPos = useCallback(() => {
    if (!menuBtnRef.current) return;
    const rect = menuBtnRef.current.getBoundingClientRect();
    const menuWidth = 240;
    const menuHeight = 224;
    const viewportPadding = 8;
    const verticalOffset = 4;

    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const shouldOpenUpward = spaceBelow < menuHeight && rect.top > spaceBelow;

    const top = shouldOpenUpward
      ? Math.max(viewportPadding, rect.top - menuHeight - verticalOffset)
      : Math.min(
          rect.bottom + verticalOffset,
          window.innerHeight - menuHeight - viewportPadding,
        );

    const left = Math.min(
      Math.max(viewportPadding, rect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );

    setMenuPos({ top, left });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    updateMenuPos();
    const handleClick = (e: MouseEvent) => {
      if (
        menuBtnRef.current &&
        !menuBtnRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      )
        setMenuOpen(false);
    };
    const handleViewportChange = () => updateMenuPos();
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [menuOpen, updateMenuPos]);

  const handleMenuAction = (action: MaterialAction) => {
    setMenuOpen(false);
    if (action === "open") {
      onPreview?.();
      return;
    }
    onAction?.(material, action);
  };

  return (
    <div className="self-stretch p-3 bg-bg-secondary rounded-lg inline-flex justify-start items-center gap-3 hover:bg-bg-tertiary transition-colors w-full">
      <button
        type="button"
        onClick={() => onPreview?.()}
        className="flex-1 flex justify-start items-center gap-1 text-left min-w-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={matIcon} alt="" className="w-8 h-8 shrink-0" />
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1 min-w-0">
          <div className="self-stretch inline-flex justify-start items-start">
            <span className="text-text-primary text-sm font-normal leading-4 line-clamp-1">
              {matNameOnly}
            </span>
            <span className="text-text-primary text-sm font-normal leading-4 flex-shrink-0">
              {matExt}
            </span>
            {material.isPendingDeletion && (
              <Icon
                name="visibility_off"
                size={14}
                className="ml-1 flex-shrink-0 text-icon-tertiary"
                variant="rounded"
              />
            )}
          </div>
          <span className="text-text-tertiary text-[10px] font-normal leading-3">
            Última modificación: {formatMaterialDate(material.createdAt)}
          </span>
        </div>
      </button>

      {onAction ? (
        <div>
          <button
            ref={menuBtnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-bg-tertiary transition-colors flex-shrink-0"
          >
            <Icon name="more_vert" size={20} className="text-icon-tertiary" />
          </button>
          {menuOpen &&
            createPortal(
              <div
                ref={menuRef}
                style={{
                  position: "fixed",
                  top: menuPos.top,
                  left: menuPos.left,
                  zIndex: 9999,
                }}
                className="w-60 p-1 bg-bg-primary rounded-lg shadow-[2px_4px_4px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col"
              >
                <button
                  onClick={() => handleMenuAction("open")}
                  className="self-stretch px-2 py-3 rounded inline-flex items-center gap-2 hover:bg-bg-secondary transition-colors"
                >
                  <Icon
                    name="open_in_full"
                    size={20}
                    className="text-icon-secondary"
                    variant="rounded"
                  />
                  <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                    Abrir
                  </span>
                </button>
                <button
                  onClick={() => handleMenuAction("rename")}
                  className="self-stretch px-2 py-3 rounded inline-flex items-center gap-2 hover:bg-bg-secondary transition-colors"
                >
                  <Icon
                    name="edit"
                    size={20}
                    className="text-icon-secondary"
                    variant="rounded"
                  />
                  <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                    Cambiar nombre
                  </span>
                </button>
                <div className="h-px bg-stroke-secondary" />
                <button
                  onClick={() => handleMenuAction("download")}
                  className="self-stretch px-2 py-3 rounded inline-flex items-center gap-2 hover:bg-bg-secondary transition-colors"
                >
                  <Icon
                    name="download"
                    size={20}
                    className="text-icon-secondary"
                    variant="rounded"
                  />
                  <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                    Descargar
                  </span>
                </button>
                <button
                  onClick={() => handleMenuAction("info")}
                  className="self-stretch px-2 py-3 rounded inline-flex items-center gap-2 hover:bg-bg-secondary transition-colors"
                >
                  <Icon
                    name="info"
                    size={20}
                    className="text-icon-secondary"
                    variant="rounded"
                  />
                  <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                    Información del material
                  </span>
                </button>
                <div className="h-px bg-stroke-secondary" />
                <button
                  onClick={() => handleMenuAction("delete")}
                  className="self-stretch px-2 py-3 rounded inline-flex items-center gap-2 hover:bg-bg-secondary transition-colors"
                >
                  <Icon
                    name="delete"
                    size={20}
                    className="text-icon-secondary"
                    variant="rounded"
                  />
                  <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                    Eliminar
                  </span>
                </button>
              </div>,
              document.body,
            )}
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload(material);
          }}
          className="p-1 rounded-full flex justify-center items-center hover:bg-bg-primary transition-colors"
          title="Descargar"
        >
          <Icon name="download" size={20} className="text-icon-tertiary" />
        </button>
      )}
    </div>
  );
}

// ============================================
// Single expandable folder row
// ============================================

function ExpandableFolderRow({
  folder,
  isOpen,
  onToggle,
  materials,
  isLoadingMaterials,
  onDownloadMaterial,
  onPreviewMaterial,
  iconConfig,
  onUploadToFolder,
  onMaterialAction,
}: {
  folder: ExpandableFolder;
  isOpen: boolean;
  onToggle: () => void;
  materials: FolderMaterial[];
  isLoadingMaterials: boolean;
  onDownloadMaterial: (material: FolderMaterial) => void;
  onPreviewMaterial?: (materials: FolderMaterial[], index: number) => void;
  iconConfig: FolderIconConfig;
  onUploadToFolder?: (folderId: string) => void;
  onMaterialAction?: (material: FolderMaterial, action: MaterialAction) => void;
}) {
  return (
    <div className="self-stretch bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex flex-col justify-start items-start">
      <div className="self-stretch p-4 inline-flex justify-start items-center gap-4 hover:bg-bg-secondary transition-colors w-full">
        <button
          onClick={onToggle}
          className="flex-1 inline-flex justify-start items-center gap-4 text-left"
        >
          <div
            className={`p-2 rounded-xl flex justify-start items-center ${isOpen ? iconConfig.bgOpen : iconConfig.bgClosed}`}
          >
            <Icon
              name={iconConfig.name}
              size={24}
              className={isOpen ? iconConfig.colorOpen : iconConfig.colorClosed}
              variant={iconConfig.variant}
            />
          </div>
          <div className="flex-1 inline-flex flex-col justify-start items-start gap-0.5">
            <span className="self-stretch text-text-primary text-lg font-semibold leading-5">
              {folder.name}
            </span>
            <div className="self-stretch inline-flex justify-start items-start gap-1">
              <span className="text-text-tertiary text-xs font-medium leading-4">
                {folder.materialCount}
              </span>
              <span className="text-text-tertiary text-xs font-medium leading-4">
                {folder.materialCount === 1 ? "archivo" : "archivos"}
              </span>
            </div>
          </div>
        </button>
        {onUploadToFolder && (
          <button
            onClick={() => onUploadToFolder(folder.id)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-tertiary transition-colors flex-shrink-0"
            title={`Subir material a ${folder.name}`}
          >
            <Icon name="add_circle" size={20} className="text-icon-tertiary" />
          </button>
        )}
        <button onClick={onToggle} className="flex-shrink-0">
          <Icon
            name="expand_more"
            size={28}
            className={`text-icon-tertiary transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <div
        className={`w-full grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div
            className={`self-stretch p-4 border-t border-stroke-primary flex flex-col justify-start items-start gap-2 ${!isOpen ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
          >
            {isLoadingMaterials && (
              <div className="self-stretch flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-accent-solid border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!isLoadingMaterials && materials.length === 0 && (
              <div className="self-stretch py-4 flex justify-center">
                <span className="text-text-tertiary text-sm">
                  No hay archivos en esta carpeta
                </span>
              </div>
            )}

            {!isLoadingMaterials &&
              materials.map((mat, idx) => (
                <MaterialFileItem
                  key={mat.id}
                  material={mat}
                  onDownload={onDownloadMaterial}
                  onPreview={
                    onPreviewMaterial
                      ? () => onPreviewMaterial(materials, idx)
                      : undefined
                  }
                  onAction={onMaterialAction}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main component
// ============================================

export default function ExpandableFolderList({
  title,
  folders,
  loadFolderMaterials,
  onDownloadMaterial,
  onPreviewMaterial,
  iconConfig = defaultIconConfig,
  headerAction,
  onUploadToFolder,
  onMaterialAction,
}: ExpandableFolderListProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [folderMaterials, setFolderMaterials] = useState<
    Record<string, FolderMaterial[]>
  >({});
  const [loadingFolderMaterials, setLoadingFolderMaterials] = useState<
    Record<string, boolean>
  >({});

  const loadMaterials = async (folderId: string) => {
    if (folderMaterials[folderId] || loadingFolderMaterials[folderId]) return;
    setLoadingFolderMaterials((prev) => ({ ...prev, [folderId]: true }));
    try {
      const materials = await loadFolderMaterials(folderId);
      setFolderMaterials((prev) => ({ ...prev, [folderId]: materials }));
    } catch {
      setFolderMaterials((prev) => ({ ...prev, [folderId]: [] }));
    } finally {
      setLoadingFolderMaterials((prev) => ({ ...prev, [folderId]: false }));
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
    loadMaterials(folderId);
  };

  const expandAll = () => {
    const allIds = new Set(folders.map((f) => f.id));
    setExpandedFolders(allIds);
    folders.forEach((f) => loadMaterials(f.id));
  };

  const collapseAll = () => {
    setExpandedFolders(new Set());
  };

  const allExpanded =
    folders.length > 0 && folders.every((f) => expandedFolders.has(f.id));

  return (
    <>
      <div className="self-stretch inline-flex justify-between items-center">
        {title && (
          <span className="flex-1 text-text-primary text-2xl font-semibold leading-7">
            {title}
          </span>
        )}
        <div className="flex items-center gap-4">
          {folders.length > 0 && (
            <button
              onClick={allExpanded ? collapseAll : expandAll}
              className="p-1 rounded-lg flex justify-center items-center gap-1.5 hover:bg-bg-secondary transition-colors"
            >
              <Icon
                name={allExpanded ? "unfold_less" : "unfold_more"}
                size={16}
                className="text-icon-accent-primary"
              />
              <span className="text-text-accent-primary text-sm font-medium leading-4">
                {allExpanded ? "Colapsar Todo" : "Expandir Todo"}
              </span>
            </button>
          )}
          {headerAction}
        </div>
      </div>

      <div className="self-stretch flex flex-col justify-start items-start gap-6">
        {folders.map((folder) => (
          <ExpandableFolderRow
            key={folder.id}
            folder={folder}
            isOpen={expandedFolders.has(folder.id)}
            onToggle={() => toggleFolder(folder.id)}
            materials={folderMaterials[folder.id] || []}
            isLoadingMaterials={loadingFolderMaterials[folder.id] || false}
            onDownloadMaterial={onDownloadMaterial}
            onPreviewMaterial={onPreviewMaterial}
            iconConfig={iconConfig}
            onUploadToFolder={onUploadToFolder}
            onMaterialAction={onMaterialAction}
          />
        ))}
      </div>
    </>
  );
}
