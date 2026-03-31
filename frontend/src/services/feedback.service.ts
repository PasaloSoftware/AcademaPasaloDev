import { apiClient } from '@/lib/apiClient';

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

export const feedbackService = {
  async submitTestimony(dto: CreateTestimonyDto): Promise<void> {
    await apiClient.post('/feedback', dto);
  },

  async getFeaturedTestimonies(courseCycleId: string): Promise<FeaturedTestimony[]> {
    const response = await apiClient.get<FeaturedTestimony[]>(
      `/feedback/public/course-cycle/${courseCycleId}`,
    );
    return response.data ?? [];
  },
};
