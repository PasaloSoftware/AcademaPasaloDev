// ============================================
// CYCLES SERVICE - GESTIÓN DE CICLOS ACADÉMICOS
// ============================================

import { apiClient } from "@/lib/apiClient";
import type { ApiResponse, AcademicCycle } from "@/types/api";

export interface CycleHistoryItem {
  id: string;
  code: string;
  startDate: string;
  endDate: string;
}

export interface CycleHistoryResponse {
  items: CycleHistoryItem[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export const cyclesService = {
  /**
   * Listar todos los ciclos académicos (ADMIN/SUPER_ADMIN)
   */
  async findAll(): Promise<AcademicCycle[]> {
    const response =
      await apiClient.get<ApiResponse<AcademicCycle[]>>("/cycles");
    return response.data.data;
  },

  /**
   * Obtener el ciclo académico activo (Todos los usuarios autenticados)
   */
  async getActiveCycle(): Promise<AcademicCycle> {
    const response =
      await apiClient.get<ApiResponse<AcademicCycle>>("/cycles/active");
    return response.data.data;
  },

  /**
   * Obtener detalle de un ciclo académico (ADMIN/SUPER_ADMIN)
   */
  async findOne(id: string): Promise<AcademicCycle> {
    const response = await apiClient.get<ApiResponse<AcademicCycle>>(
      `/cycles/${id}`,
    );
    return response.data.data;
  },

  /**
   * Obtener historial paginado de ciclos académicos (ADMIN/SUPER_ADMIN)
   */
  async getHistory(page = 1): Promise<CycleHistoryResponse> {
    const response = await apiClient.get<CycleHistoryResponse>(
      `/cycles/history?page=${page}`,
    );
    return response.data;
  },
};
