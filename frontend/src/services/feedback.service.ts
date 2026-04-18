import { apiClient } from "@/lib/apiClient";

export interface CreateTestimonyDto {
  courseCycleId: string;
  rating: number;
  comment: string;
}

export interface FeaturedTestimonyUser {
  firstName: string;
  lastName1: string;
  profilePhotoUrl: string | null;
}

export interface CourseTestimony {
  rating: number;
  comment: string;
  photoUrl: string | null;
  user: FeaturedTestimonyUser;
}

export interface FeaturedTestimony {
  id: string;
  displayOrder: number;
  courseTestimony: CourseTestimony;
}

export interface PublicFeedbackItem {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName1: string | null;
    profilePhotoUrl: string | null;
    careerName: string | null;
  };
  courseName: string;
}

export interface AdminFeedbackItem {
  id: string;
  rating: number;
  comment: string;
  isActive: boolean;
  createdAt: string;
  courseCycleId: string;
  courseId: string;
  courseName: string;
  user: {
    id: string;
    firstName: string;
    lastName1: string | null;
    lastName2: string | null;
    profilePhotoUrl: string | null;
    careerName: string | null;
  };
}

export interface AdminFeedbackStats {
  total: number;
  average: number;
  distribution: Record<string, number>;
}

export interface AdminFeedbackListResponse {
  items: AdminFeedbackItem[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  stats: AdminFeedbackStats;
}

export interface AdminFeedbackQueryParams {
  page?: number;
  courseCycleId?: string;
  courseId?: string;
  careerId?: number;
  rating?: 1 | 2 | 3 | 4 | 5;
  isActive?: boolean;
  search?: string;
}

export const feedbackService = {
  async submitTestimony(dto: CreateTestimonyDto): Promise<void> {
    await apiClient.post("/feedback", dto);
  },

  async getFeaturedTestimonies(
    courseCycleId: string,
  ): Promise<FeaturedTestimony[]> {
    const response = await apiClient.get<FeaturedTestimony[]>(
      `/feedback/public/course-cycle/${courseCycleId}`,
    );
    return response.data ?? [];
  },

  async getPublicFeedback(): Promise<PublicFeedbackItem[]> {
    const response =
      await apiClient.get<PublicFeedbackItem[]>("/feedback/public");
    return response.data ?? [];
  },

  async getAdminFeedback(
    params?: AdminFeedbackQueryParams,
  ): Promise<AdminFeedbackListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.courseCycleId) query.set("courseCycleId", params.courseCycleId);
    if (params?.courseId) query.set("courseId", params.courseId);
    if (params?.careerId) query.set("careerId", String(params.careerId));
    if (params?.rating) query.set("rating", String(params.rating));
    if (typeof params?.isActive === "boolean") {
      query.set("isActive", String(params.isActive));
    }
    if (params?.search) query.set("search", params.search);

    const qs = query.toString();
    const response = await apiClient.get<AdminFeedbackListResponse>(
      `/feedback/admin${qs ? `?${qs}` : ""}`,
    );
    return response.data;
  },

  async featureTestimony(id: string, isActive: boolean): Promise<void> {
    await apiClient.post(`/feedback/admin/${id}/feature`, { isActive });
  },
};
