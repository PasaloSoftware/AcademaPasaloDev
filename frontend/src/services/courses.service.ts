// ============================================
// COURSES SERVICE - GESTIÓN DE CURSOS
// ============================================

import { apiClient } from "@/lib/apiClient";
import type {
  ApiResponse,
  Course,
  CourseType,
  CycleLevel,
  CourseCycle,
} from "@/types/api";
import type { Enrollment } from "@/types/enrollment";
import type {
  CurrentCycleResponse,
  PreviousCyclesResponse,
  PreviousCycleContentResponse,
  BankStructureResponse,
  IntroVideoLinkResponse,
} from "@/types/curso";

// Admin course-cycle types
export interface AdminCourseCycleProfessor {
  id: string;
  firstName: string;
  lastName1: string;
  lastName2: string;
  profilePhotoUrl: string | null;
}

export interface AdminCourseCycleItem {
  courseCycleId: string;
  course: { id: string; code: string; name: string };
  academicCycle: {
    id: string;
    code: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  };
  professors: AdminCourseCycleProfessor[];
}

export interface AdminCourseCycleListResponse {
  items: AdminCourseCycleItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

function unwrapPayload<T>(response: unknown): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: T }).data;
  }

  return response as T;
}

export const coursesService = {
  /**
   * Crear una nueva materia (ADMIN/SUPER_ADMIN)
   */
  async create(data: {
    code: string;
    name: string;
    courseTypeId: string;
    cycleLevelId: string;
  }): Promise<Course> {
    const response = await apiClient.post<ApiResponse<Course>>(
      "/courses",
      data,
    );
    return response.data.data;
  },

  /**
   * Listar todas las materias (ADMIN/SUPER_ADMIN)
   */
  async findAll(): Promise<Course[]> {
    const response = await apiClient.get<Course[]>("/courses");
    const payload = unwrapPayload<Course[] | undefined>(response);
    return Array.isArray(payload) ? payload : [];
  },

  /**
   * Obtener detalle de una materia (ADMIN/SUPER_ADMIN)
   */
  async findOne(id: string): Promise<Course> {
    const response = await apiClient.get<Course>(`/courses/${id}`);
    return unwrapPayload<Course>(response);
  },

  async updateStatus(id: string, isActive: boolean): Promise<Course> {
    const response = await apiClient.patch<Course>(`/courses/${id}/status`, {
      isActive,
    });
    return unwrapPayload<Course>(response);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/courses/${id}`);
  },

  /**
   * Listar tipos de curso (Ciencias, Letras, Facultad)
   */
  async getCourseTypes(): Promise<CourseType[]> {
    const response = await apiClient.get<CourseType[]>("/courses/types");
    const payload = unwrapPayload<CourseType[] | undefined>(response);
    return Array.isArray(payload) ? payload : [];
  },

  /**
   * Listar niveles académicos (1er Ciclo, 2do Ciclo, etc.)
   */
  async getCourseLevels(): Promise<CycleLevel[]> {
    const response = await apiClient.get<CycleLevel[]>("/courses/levels");
    const payload = unwrapPayload<CycleLevel[] | undefined>(response);
    return Array.isArray(payload) ? payload : [];
  },

  /**
   * Asignar materia a un ciclo académico (ADMIN/SUPER_ADMIN)
   * Esto "apertura" la materia en un ciclo específico
   */
  async assignToCycle(data: {
    courseId: string;
    academicCycleId: string;
  }): Promise<CourseCycle> {
    const response = await apiClient.post<ApiResponse<CourseCycle>>(
      "/courses/assign-cycle",
      data,
    );
    return response.data.data;
  },

  /**
   * Obtener los cursos-ciclo asignados al profesor actual (PROFESSOR)
   * Ahora devuelve la misma estructura que enrollments/my-courses
   */
  async getMyCourseCycles(): Promise<Enrollment[]> {
    const response = await apiClient.get<Enrollment[]>("/courses/my-courses");
    const data = response.data;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Obtener los profesores asignados a un curso-ciclo
   */
  async getProfessorsByCourseCycle(courseCycleId: string): Promise<
    Array<{
      id: string;
      firstName: string;
      lastName1: string;
      profilePhotoUrl: string | null;
    }>
  > {
    const response = await apiClient.get<
      Array<{
        id: string;
        firstName: string;
        lastName1: string;
        profilePhotoUrl: string | null;
      }>
    >(`/courses/cycle/${courseCycleId}/professors`);
    return response.data;
  },

  /**
   * Revocar un profesor de un curso-ciclo (ADMIN/SUPER_ADMIN)
   */
  async revokeProfessorFromCourseCycle(
    courseCycleId: string,
    professorUserId: string,
  ): Promise<void> {
    await apiClient.delete(
      `/courses/cycle/${courseCycleId}/professors/${professorUserId}`,
    );
  },

  /**
   * Asignar un profesor a un curso-ciclo (ADMIN/SUPER_ADMIN)
   */
  async assignProfessorToCourseCycle(
    courseCycleId: string,
    professorUserId: string,
  ): Promise<void> {
    await apiClient.post(`/courses/cycle/${courseCycleId}/professors`, {
      professorUserId,
    });
  },

  /**
   * Obtener evaluaciones del ciclo vigente para un alumno (STUDENT)
   */
  async getCurrentCycleContent(
    courseCycleId: string,
  ): Promise<CurrentCycleResponse> {
    const response = await apiClient.get<CurrentCycleResponse>(
      `/courses/cycle/${courseCycleId}/current`,
    );
    return response.data;
  },

  /**
   * Obtener lista de ciclos anteriores disponibles (STUDENT)
   */
  async getPreviousCycles(
    courseCycleId: string,
  ): Promise<PreviousCyclesResponse> {
    const response = await apiClient.get<PreviousCyclesResponse>(
      `/courses/cycle/${courseCycleId}/previous-cycles`,
    );
    return response.data;
  },

  /**
   * Obtener contenido de un ciclo anterior específico (STUDENT)
   */
  async getPreviousCycleContent(
    courseCycleId: string,
    cycleCode: string,
  ): Promise<PreviousCycleContentResponse> {
    const response = await apiClient.get<PreviousCycleContentResponse>(
      `/courses/cycle/${courseCycleId}/previous-cycles/${cycleCode}/content`,
    );
    return response.data;
  },

  /**
   * Obtener estructura del banco de enunciados (STUDENT)
   */
  async getBankStructure(
    courseCycleId: string,
  ): Promise<BankStructureResponse> {
    const response = await apiClient.get<BankStructureResponse>(
      `/courses/cycle/${courseCycleId}/bank-structure`,
    );
    return response.data;
  },

  /**
   * Obtener contenido de un curso-ciclo (PROFESSOR/ADMIN/SUPER_ADMIN)
   * Ahora devuelve la misma estructura que /current (CurrentCycleResponse)
   */
  async getCourseContent(courseCycleId: string): Promise<CurrentCycleResponse> {
    const response = await apiClient.get<CurrentCycleResponse>(
      `/courses/cycle/${courseCycleId}/content`,
    );
    return response.data;
  },

  /**
   * Obtener link autorizado del video introductorio del curso-ciclo
   */
  /**
   * Listar cursos-ciclo para admin (paginado, con profesores)
   */
  async getAdminCourseCycles(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<AdminCourseCycleListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    const response = await apiClient.get<AdminCourseCycleListResponse>(
      `/courses/course-cycles${qs ? `?${qs}` : ""}`,
    );
    return response.data;
  },

  async getIntroVideoLink(
    courseCycleId: string,
  ): Promise<IntroVideoLinkResponse | null> {
    try {
      const response = await apiClient.get<IntroVideoLinkResponse>(
        `/courses/cycle/${courseCycleId}/intro-video-link`,
      );
      return response.data;
    } catch {
      return null;
    }
  },
};
