// ============================================
// USERS SERVICE - GESTIÓN DE USUARIOS
// ============================================

import { apiClient } from '@/lib/apiClient';
import type { ApiResponse, User } from '@/types/api';

// Admin user list types (GET /users)
export interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
  careerId: number | null;
  careerName: string | null;
  isActive: boolean;
}

export interface AdminUserListResponse {
  items: AdminUserItem[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export type AdminUserSortField = 'fullName' | 'email' | 'careerName';
export type AdminUserSortOrder = 'ASC' | 'DESC';

export interface AdminUserListParams {
  page?: number;
  search?: string;
  roles?: string;
  careerIds?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  sortBy?: AdminUserSortField;
  sortOrder?: AdminUserSortOrder;
}

// Admin user detail types (GET /users/:id/admin-detail)
export interface AdminUserDetailCourse {
  relationId: string;
  courseId: string;
  courseCycleId: string;
  courseCode: string;
  courseName: string;
  academicCycleCode: string;
}

export interface AdminUserDetail {
  personalInfo: {
    id: string;
    firstName: string;
    lastName1: string;
    lastName2: string | null;
    email: string;
    phone: string | null;
    careerId: number | null;
    careerName: string | null;
    roles: string[];
    isActive: boolean;
    profilePhotoUrl: string | null;
  };
  enrolledCourses: AdminUserDetailCourse[];
  teachingCourses: AdminUserDetailCourse[];
}

export const usersService = {
  /**
   * Crear un usuario manualmente (ADMIN/SUPER_ADMIN)
   */
  async create(data: {
    email: string;
    firstName: string;
    lastName1?: string;
    lastName2?: string;
    phone?: string;
    career?: string;
    profilePhotoUrl?: string;
    roleIds?: string[];
  }): Promise<User> {
    const response = await apiClient.post<ApiResponse<User>>('/users', data);
    return response.data.data;
  },

  /**
   * Listar todos los usuarios (ADMIN/SUPER_ADMIN) - sin paginación
   */
  async findAll(): Promise<User[]> {
    const response = await apiClient.get<ApiResponse<User[]>>('/users');
    return response.data.data;
  },

  /**
   * Listar usuarios para el panel admin (paginado, con filtros)
   */
  async getAdminUsers(params?: AdminUserListParams): Promise<AdminUserListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.search) query.set('search', params.search);
    if (params?.roles) query.set('roles', params.roles);
    if (params?.careerIds) query.set('careerIds', params.careerIds);
    if (params?.status) query.set('status', params.status);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    const qs = query.toString();
    const response = await apiClient.get<AdminUserListResponse>(`/users${qs ? `?${qs}` : ''}`);
    return response.data;
  },

  /**
   * Obtener catálogo de carreras (para filtros admin)
   */
  async getCareers(): Promise<Array<{ id: number; name: string }>> {
    const response = await apiClient.get<Array<{ id: number; name: string }>>('/users/catalog/careers');
    return response.data;
  },

  /**
   * Obtener catálogo de cursos (para buscador admin)
   */
  async getCourseCatalog(): Promise<Array<{ courseId: string; courseCode: string; courseName: string }>> {
    const response = await apiClient.get<Array<{ courseId: string; courseCode: string; courseName: string }>>('/users/catalog/courses');
    return response.data;
  },

  /**
   * Obtener opciones de ciclo para un curso (para matrícula admin)
   */
  async getCourseCycleOptions(courseId: string): Promise<{
    courseId: string;
    courseCode: string;
    courseName: string;
    currentCycle: { courseCycleId: string; academicCycleCode: string } | null;
    historicalCycles: Array<{ courseCycleId: string; academicCycleCode: string }>;
  }> {
    const response = await apiClient.get<{ courseId: string; courseCode: string; courseName: string; currentCycle: { courseCycleId: string; academicCycleCode: string } | null; historicalCycles: Array<{ courseCycleId: string; academicCycleCode: string }>; }>(`/enrollments/options/course/${courseId}/cycles`);
    return response.data;
  },

  /**
   * Obtener detalle admin de un usuario
   */
  async getAdminDetail(userId: string): Promise<AdminUserDetail> {
    const response = await apiClient.get<AdminUserDetail>(`/users/${userId}/admin-detail`);
    return response.data;
  },

  /**
   * Edición integral admin de un usuario (PATCH /users/:id/admin-edit)
   */
  async adminEdit(userId: string, data: {
    personalInfo: {
      firstName: string;
      lastName1: string;
      lastName2?: string;
      email: string;
      phone?: string;
      careerId?: number;
    };
    roleCodesFinal: string[];
    studentStateFinal: {
      enrollments: Array<{
        courseCycleId: string;
        enrollmentTypeCode: 'FULL' | 'PARTIAL';
        evaluationIds?: string[];
        historicalCourseCycleIds?: string[];
      }>;
    };
    professorStateFinal: {
      courseCycleIds: string[];
    };
  }): Promise<unknown> {
    const response = await apiClient.patch(`/users/${userId}/admin-edit`, data);
    return response.data;
  },

  /**
   * Registro administrativo integral (POST /users/admin-onboarding)
   */
  async adminOnboarding(data: {
    email: string;
    firstName: string;
    lastName1: string;
    lastName2?: string;
    phone?: string;
    careerId?: number;
    roleCodes: string[];
    studentEnrollment?: {
      courseCycleId: string;
      enrollmentTypeCode: 'FULL' | 'PARTIAL';
      evaluationIds?: string[];
      historicalCourseCycleIds?: string[];
    };
    professorAssignments?: {
      courseCycleIds: string[];
    };
  }): Promise<unknown> {
    const response = await apiClient.post('/users/admin-onboarding', data);
    return response.data;
  },

  /**
   * Obtener perfil de usuario
   * - Propietario puede ver su propio perfil
   * - ADMIN/SUPER_ADMIN pueden ver cualquier perfil
   */
  async findOne(id: string): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return response.data.data;
  },

  /**
   * Actualizar datos de usuario
   * - Propietario puede actualizar su propio perfil
   * - ADMIN/SUPER_ADMIN pueden actualizar cualquier perfil
   */
  async update(
    id: string,
    data: {
      firstName?: string;
      lastName1?: string;
      lastName2?: string;
      phone?: string;
      career?: string;
      profilePhotoUrl?: string;
    }
  ): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(`/users/${id}`, data);
    return response.data.data;
  },

  /**
   * Eliminar un usuario (ADMIN/SUPER_ADMIN)
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },

  /**
   * Asignar un rol específico a un usuario (SUPER_ADMIN)
   * Operación atómica
   */
  async assignRole(userId: string, roleCode: string): Promise<void> {
    await apiClient.post(`/users/${userId}/roles/${roleCode}`);
  },

  /**
   * Remover un rol específico de un usuario (SUPER_ADMIN)
   * Operación atómica
   */
  async removeRole(userId: string, roleCode: string): Promise<void> {
    await apiClient.delete(`/users/${userId}/roles/${roleCode}`);
  },

  /**
   * Obtener el perfil del usuario actual (desde el token)
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/users/me');
    return response.data.data;
  },

  /**
   * Banear/desactivar un usuario (ADMIN/SUPER_ADMIN)
   * Marca al usuario como inactivo y revoca todas sus sesiones
   * Endpoint: PATCH /users/:id/ban
   */
  async ban(userId: string): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(`/users/${userId}/ban`);
    return response.data.data;
  },
};
