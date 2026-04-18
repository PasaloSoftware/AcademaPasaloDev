// ============================================
// ENROLLMENT SERVICE - Gestión de Matrículas
// ============================================

import { apiClient } from "@/lib/apiClient";
import type { EnrollmentResponse } from "@/types/enrollment";

export interface AdminCourseCycleStudentItem {
  enrollmentId: string;
  userId: string;
  fullName: string;
  email: string;
}

export interface AdminCourseCycleStudentsResponse {
  items: AdminCourseCycleStudentItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CreateEnrollmentInput {
  userId: string;
  courseCycleId: string;
  enrollmentTypeCode: "FULL" | "PARTIAL";
  evaluationIds?: string[];
  historicalCourseCycleIds?: string[];
}

export const enrollmentService = {
  /**
   * Obtener los cursos matriculados del usuario actual
   */
  async getMyCourses(): Promise<EnrollmentResponse> {
    const response = await apiClient.get<EnrollmentResponse>(
      "/enrollments/my-courses",
    );
    // axios ya desenvuelve response.data, que contiene el objeto con statusCode, message, data, timestamp
    return response.data;
  },

  async getAdminStudentsByCourseCycle(params: {
    courseCycleId: string;
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<AdminCourseCycleStudentsResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    if (params.search) query.set("search", params.search);

    const qs = query.toString();
    const response = await apiClient.get<AdminCourseCycleStudentsResponse>(
      `/enrollments/course-cycle/${params.courseCycleId}/students${qs ? `?${qs}` : ""}`,
    );
    return response.data;
  },

  async create(data: CreateEnrollmentInput): Promise<void> {
    await apiClient.post("/enrollments", data);
  },

  async cancel(id: string): Promise<void> {
    await apiClient.delete(`/enrollments/${id}`);
  },
};
