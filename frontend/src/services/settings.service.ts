import { apiClient } from "@/lib/apiClient";

export interface CurrentSystemCycle {
  id: string;
  code: string;
  startDate: string;
  endDate: string;
  progressPercent: number;
}

export interface SystemSettingsBundle {
  currentCycle: CurrentSystemCycle | null;
  geoGpsThresholds: {
    timeWindowMinutes: number;
    distanceKm: number;
  };
  logRetention: {
    days: number;
  };
}

export interface UpdateSystemSettingsPayload {
  geoGpsThresholds?: {
    timeWindowMinutes?: number;
    distanceKm?: number;
  };
  logRetention?: {
    days?: number;
  };
}

export const settingsService = {
  async getAdminSettings(): Promise<SystemSettingsBundle> {
    const response =
      await apiClient.get<SystemSettingsBundle>("/settings/admin");
    return response.data;
  },

  async updateAdminSettings(
    payload: UpdateSystemSettingsPayload,
  ): Promise<SystemSettingsBundle> {
    const response = await apiClient.put<SystemSettingsBundle>(
      "/settings/admin",
      payload,
    );
    return response.data;
  },
};
