// ============================================
// MATERIALS SERVICE - Gestión de Materiales
// ============================================

import { apiClient } from "@/lib/apiClient";
import { getAccessToken } from "@/lib/storage";
import type {
  ClassEventMaterial,
  MaterialFolder,
  FolderContentsResponse,
} from "@/types/material";

export interface AuthorizedLinkResponse {
  contentKind: string;
  accessMode: "DIRECT_URL" | "BACKEND_PROXY";
  evaluationId: string;
  driveFileId: string | null;
  url: string;
  expiresAt: string | null;
  requestedMode: "view" | "download";
  fileName: string;
  mimeType: string;
  storageProvider: "LOCAL" | "GDRIVE" | "S3";
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export const materialsService = {
  /**
   * Obtener materiales de una sesión de clase
   */
  async getClassEventMaterials(
    classEventId: string,
  ): Promise<ClassEventMaterial[]> {
    const response = await apiClient.get<ClassEventMaterial[]>(
      `/materials/class-event/${classEventId}`,
    );
    return response.data;
  },

  /**
   * Obtener link autorizado para ver o descargar un material
   */
  async getAuthorizedLink(
    materialId: string,
    mode: "view" | "download" = "view",
  ): Promise<AuthorizedLinkResponse> {
    const response = await apiClient.get<AuthorizedLinkResponse>(
      `/materials/${materialId}/authorized-link?mode=${mode}`,
    );
    return response.data;
  },

  /**
   * Obtener carpetas raíz de una evaluación
   */
  async getRootFolders(evaluationId: string): Promise<MaterialFolder[]> {
    const response = await apiClient.get<MaterialFolder[]>(
      `/materials/folders/evaluation/${evaluationId}`,
    );
    return response.data;
  },

  /**
   * Obtener contenido de una carpeta (subcarpetas + materiales)
   */
  async getFolderContents(folderId: string): Promise<FolderContentsResponse> {
    const response = await apiClient.get<FolderContentsResponse>(
      `/materials/folders/${folderId}`,
    );
    return response.data;
  },

  /**
   * Descargar un material (respuesta binaria, no JSON)
   * Usa fetch directo con Bearer token para manejar el stream
   */
  async downloadMaterial(
    materialId: string,
    fileName: string,
  ): Promise<void> {
    const token = getAccessToken();
    const response = await fetch(
      `${API_BASE_URL}/materials/${materialId}/download`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Error al descargar el material: ${response.status} ${errorText}`);
    }

    const contentType = response.headers.get("Content-Type") || "application/octet-stream";
    const blob = await response.blob();
    const typedBlob = new Blob([blob], { type: contentType });
    const url = window.URL.createObjectURL(typedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Subir un material (multipart form-data)
   */
  async uploadMaterial(payload: {
    file: File;
    materialFolderId: string;
    displayName: string;
    classEventId?: string;
  }): Promise<ClassEventMaterial> {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('materialFolderId', payload.materialFolderId);
    formData.append('displayName', payload.displayName);
    if (payload.classEventId) {
      formData.append('classEventId', payload.classEventId);
    }
    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}/materials`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Error al subir material: ${response.status} ${errorText}`);
    }
    const json = await response.json();
    return json.data;
  },

  /**
   * Renombrar el nombre visible de un material
   */
  async renameDisplayName(materialId: string, displayName: string): Promise<void> {
    await apiClient.patch(`/materials/${materialId}/display-name`, { displayName });
  },

  /**
   * Solicitar eliminación de un material (soft-delete, requiere aprobación admin)
   */
  async requestDeletion(materialId: string, reason: string): Promise<void> {
    await apiClient.post('/materials/request-deletion', {
      entityType: 'material',
      entityId: materialId,
      reason,
    });
  },
};
