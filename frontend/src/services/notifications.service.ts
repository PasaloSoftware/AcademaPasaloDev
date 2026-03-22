import { apiClient } from '@/lib/apiClient';
import type { NotificationItem, UnreadCountResponse } from '@/types/notification';

interface GetNotificationsParams {
  onlyUnread?: boolean;
  limit?: number;
  offset?: number;
}

function buildQueryString(params?: GetNotificationsParams): string {
  if (!params) return '';
  const query = new URLSearchParams();
  if (params.onlyUnread !== undefined) query.append('onlyUnread', String(params.onlyUnread));
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  if (params.offset !== undefined) query.append('offset', String(params.offset));
  const str = query.toString();
  return str ? `?${str}` : '';
}

export const notificationsService = {
  async getNotifications(params?: GetNotificationsParams): Promise<NotificationItem[]> {
    const endpoint = `/notifications${buildQueryString(params)}`;
    const response = await apiClient.get<NotificationItem[]>(endpoint);
    return response.data ?? [];
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data?.count ?? 0;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await apiClient.patch(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },
};
