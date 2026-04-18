"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { notificationsService } from "@/services/notifications.service";
import { classEventService } from "@/services/classEvent.service";
import { auditService } from "@/services/audit.service";
import type { NotificationItem } from "@/types/notification";
import Icon from "@/components/ui/Icon";

type TabOption = "todas" | "no_leidas";

const PAGE_SIZE = 20;

// ============================================
// Notification icon config by type
// ============================================

interface NotificationTypeStyle {
  icon: string;
  bgClass: string;
  iconClass: string;
}

const notificationTypeStyles: Record<string, NotificationTypeStyle> = {
  NEW_MATERIAL: {
    icon: "folder",
    bgClass: "bg-bg-info-secondary-light",
    iconClass: "text-icon-info-secondary",
  },
  MATERIAL_UPDATED: {
    icon: "update",
    bgClass: "bg-warning-light",
    iconClass: "text-icon-warning-primary",
  },
  CLASS_SCHEDULED: {
    icon: "event",
    bgClass: "bg-bg-success-light",
    iconClass: "text-icon-success-primary",
  },
  CLASS_UPDATED: {
    icon: "update",
    bgClass: "bg-warning-light",
    iconClass: "text-icon-warning-primary",
  },
  CLASS_CANCELLED: {
    icon: "event_busy",
    bgClass: "bg-red-50",
    iconClass: "text-icon-error-primary",
  },
  CLASS_REMINDER: {
    icon: "event",
    bgClass: "bg-bg-accent-light",
    iconClass: "text-icon-accent-primary",
  },
  CLASS_RECORDING_AVAILABLE: {
    icon: "videocam",
    bgClass: "bg-bg-info-primary-light",
    iconClass: "text-icon-info-primary",
  },
  DELETION_REQUEST_APPROVED: {
    icon: "check_circle",
    bgClass: "bg-bg-success-light",
    iconClass: "text-icon-success-primary",
  },
  DELETION_REQUEST_REJECTED: {
    icon: "cancel",
    bgClass: "bg-red-50",
    iconClass: "text-error-solid",
  },
  AUDIT_EXPORT_READY: {
    icon: "download",
    bgClass: "bg-bg-info-secondary-light",
    iconClass: "text-icon-info-secondary",
  },
};

function getTypeStyle(type: string): NotificationTypeStyle {
  return (
    notificationTypeStyles[type] || {
      icon: "notifications",
      bgClass: "bg-bg-tertiary",
      iconClass: "text-icon-tertiary",
    }
  );
}

// ============================================
// CTA button label by notification type
// ============================================

function getCtaLabel(
  type: string,
  variant: NotificationsVariant,
): string | null {
  switch (type) {
    case "NEW_MATERIAL":
    case "MATERIAL_UPDATED":
      return "Ver Material";
    case "CLASS_SCHEDULED":
    case "CLASS_UPDATED":
    case "CLASS_CANCELLED":
      return "Ver en Calendario";
    case "CLASS_REMINDER":
      return variant === "teacher" ? "Iniciar Clase" : "Unirse a la Clase";
    case "CLASS_RECORDING_AVAILABLE":
      return "Ver Grabación";
    case "AUDIT_EXPORT_READY":
      return "Descargar Reporte";
    default:
      return null;
  }
}

// ============================================
// Time formatting
// ============================================

function formatNotificationTime(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  const timeStr = date.toLocaleTimeString("es-PE", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // < 1 hora: "Hace X min"
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;

  // Hoy (>= 1 hora): "7:10pm"
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return timeStr;

  // Ayer: "Ayer, 7:10pm"
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Ayer, ${timeStr}`;

  // Más antiguo: "Martes, 7:10pm"
  const dayName = date.toLocaleDateString("es-PE", { weekday: "long" });
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  return `${capitalizedDay}, ${timeStr}`;
}

// ============================================
// Date group label
// ============================================

function getDateGroupLabel(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return "Hoy";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Ayer";

  return date.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function groupNotificationsByDate(
  notifications: NotificationItem[],
): { label: string; isToday: boolean; items: NotificationItem[] }[] {
  const groups: Record<string, NotificationItem[]> = {};
  const order: string[] = [];

  for (const n of notifications) {
    const label = getDateGroupLabel(n.createdAt);
    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(n);
  }

  return order.map((label) => ({
    label,
    isToday: label === "Hoy",
    items: groups[label],
  }));
}

// ============================================
// Notification Card
// ============================================

function NotificationCard({
  notification,
  onMarkAsRead,
  onAction,
  variant,
}: {
  notification: NotificationItem;
  onMarkAsRead: (id: string) => void;
  onAction: (notification: NotificationItem) => void;
  variant: NotificationsVariant;
}) {
  const style = getTypeStyle(notification.type);
  const ctaLabel = getCtaLabel(notification.type, variant);

  return (
    <div
      className={`self-stretch p-4 ${notification.isRead ? "bg-bg-tertiary" : "bg-bg-primary"} rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex justify-start items-start gap-4`}
    >
      {/* Icon */}
      <div
        className={`p-3 ${style.bgClass} rounded-full flex justify-center items-center`}
      >
        <Icon name={style.icon} size={20} className={style.iconClass} />
      </div>

      {/* Content */}
      <div className="flex-1 inline-flex flex-col justify-start items-start gap-3">
        {/* Title + Time */}
        <div className="self-stretch flex flex-col justify-start items-start gap-1">
          <div className="self-stretch inline-flex justify-start items-center gap-4">
            <span className="flex-1 text-text-primary text-base font-semibold leading-5">
              {notification.title}
            </span>
            <div className="flex justify-end items-center gap-2">
              <span className="text-gray-600 text-xs font-normal leading-4">
                {formatNotificationTime(notification.createdAt)}
              </span>
              {!notification.isRead && (
                <div className="w-2 h-2 bg-icon-accent-primary rounded" />
              )}
            </div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-start overflow-hidden">
            <span className="self-stretch text-text-tertiary text-sm font-normal leading-4 line-clamp-1">
              {notification.message}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="self-stretch inline-flex justify-end items-center gap-4">
          {!notification.isRead && (
            <button
              onClick={() => onMarkAsRead(notification.notificationId)}
              className="p-1 rounded-lg flex justify-center items-center gap-1.5"
            >
              <span className="text-text-accent-primary text-sm font-medium leading-4">
                Marcar como leída
              </span>
            </button>
          )}
          {ctaLabel && (
            <button
              onClick={() => onAction(notification)}
              className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg flex justify-center items-center gap-1.5"
            >
              <span className="text-text-white text-sm font-medium leading-4">
                {ctaLabel}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export type NotificationsVariant = "student" | "teacher" | "admin";

interface NotificationsContentSharedProps {
  variant: NotificationsVariant;
}

export default function NotificationsContentShared({
  variant,
}: NotificationsContentSharedProps) {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<TabOption>("todas");

  useEffect(() => {
    setBreadcrumbItems([{ label: "Notificaciones" }]);
  }, [setBreadcrumbItems]);

  const fetchNotifications = useCallback(
    async (offset: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await notificationsService.getNotifications({
          onlyUnread: activeTab === "no_leidas",
          limit: PAGE_SIZE,
          offset,
        });

        if (append) {
          setNotifications((prev) => [...prev, ...data]);
        } else {
          setNotifications(data);
        }

        setHasMore(data.length === PAGE_SIZE);
      } catch (err) {
        console.error("Error al cargar notificaciones:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTab],
  );

  useEffect(() => {
    fetchNotifications(0, false);
  }, [fetchNotifications]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    fetchNotifications(notifications.length, true);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationsService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === notificationId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n,
        ),
      );
    } catch (err) {
      console.error("Error al marcar como leída:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        })),
      );
    } catch (err) {
      console.error("Error al marcar todas como leídas:", err);
    }
  };

  const handleNotificationAction = async (notification: NotificationItem) => {
    const { type, target } = notification;

    switch (type) {
      case "NEW_MATERIAL":
      case "MATERIAL_UPDATED": {
        if (
          target?.courseCycleId &&
          target?.evaluationId &&
          target?.classEventId
        ) {
          router.push(
            `/plataforma/curso/${target.courseCycleId}/evaluacion/${target.evaluationId}/clase/${target.classEventId}`,
          );
        } else if (target?.courseCycleId && target?.evaluationId) {
          router.push(
            `/plataforma/curso/${target.courseCycleId}/evaluacion/${target.evaluationId}`,
          );
        }
        break;
      }
      case "CLASS_SCHEDULED":
      case "CLASS_UPDATED":
      case "CLASS_CANCELLED": {
        if (target?.classEventId) {
          router.push(`/plataforma/calendario?eventId=${target.classEventId}`);
        }
        break;
      }
      case "CLASS_REMINDER": {
        if (target?.classEventId) {
          try {
            const event = await classEventService.getEventDetail(
              target.classEventId,
            );
            if (event.liveMeetingUrl) {
              window.open(
                event.liveMeetingUrl,
                "_blank",
                "noopener,noreferrer",
              );
            }
          } catch (err) {
            console.error("Error al obtener link de la clase:", err);
          }
        }
        break;
      }
      case "CLASS_RECORDING_AVAILABLE": {
        if (
          target?.courseCycleId &&
          target?.evaluationId &&
          target?.classEventId
        ) {
          router.push(
            `/plataforma/curso/${target.courseCycleId}/evaluacion/${target.evaluationId}/clase/${target.classEventId}`,
          );
        }
        break;
      }
      case "AUDIT_EXPORT_READY": {
        if (target?.auditExportJobId) {
          try {
            const blob = await auditService.downloadExportJob(
              target.auditExportJobId,
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `reporte-auditoria.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          } catch (err) {
            console.error("Error al descargar reporte:", err);
          }
        }
        break;
      }
    }
  };

  const handleTabChange = (tab: TabOption) => {
    setActiveTab(tab);
    setHasMore(true);
  };

  const groups = groupNotificationsByDate(notifications);

  const tabs: { key: TabOption; label: string }[] = [
    { key: "todas", label: "Todas" },
    { key: "no_leidas", label: "No Leídas" },
  ];

  return (
    <div className="w-full inline-flex flex-col justify-start items-start gap-8 overflow-hidden">
      {/* Header */}
      <div className="self-stretch inline-flex justify-between items-start">
        <div className="flex justify-start items-center gap-2">
          <h1 className="text-text-primary text-3xl font-semibold leading-10">
            Notificaciones
          </h1>
        </div>
        <button
          onClick={handleMarkAllAsRead}
          className="px-6 py-3 bg-bg-accent-light rounded-lg flex justify-center items-center gap-1.5"
        >
          <span className="text-text-accent-primary text-sm font-medium leading-4">
            Marcar todo como leído
          </span>
        </button>
      </div>

      {/* Tabs + Content */}
      <div className="self-stretch flex flex-col justify-start items-start gap-6">
        {/* Tabs */}
        <div className="p-1 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex justify-center items-center">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-6 py-3 rounded-lg flex justify-center items-center gap-2 ${
                activeTab === tab.key
                  ? "bg-bg-accent-primary-solid"
                  : "bg-bg-primary"
              }`}
            >
              <span
                className={`text-center text-base leading-4 ${
                  activeTab === tab.key
                    ? "text-text-white font-medium"
                    : "text-text-secondary font-normal"
                }`}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="self-stretch flex flex-col justify-start items-center gap-8">
          {loading ? (
            <div className="self-stretch flex flex-col gap-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="self-stretch h-28 bg-bg-secondary rounded-xl"
                />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="self-stretch p-12 bg-white rounded-2xl border border-stroke-primary flex flex-col items-center justify-center gap-4">
              <Icon
                name="notifications_off"
                size={64}
                className="text-icon-tertiary"
              />
              <div className="text-center">
                <p className="text-text-primary font-semibold mb-2">
                  No hay notificaciones
                </p>
                <p className="text-text-secondary text-sm">
                  {activeTab === "no_leidas"
                    ? "No tienes notificaciones sin leer"
                    : "Las notificaciones aparecerán aquí"}
                </p>
              </div>
            </div>
          ) : (
            <>
              {groups.map((group) => (
                <div
                  key={group.label}
                  className="self-stretch flex flex-col justify-start items-start gap-4"
                >
                  {/* Date Label */}
                  <div className="self-stretch px-2 flex flex-col justify-start items-start">
                    <span
                      className={`self-stretch text-base font-semibold leading-5 ${
                        group.isToday
                          ? "text-text-accent-primary"
                          : "text-text-tertiary"
                      }`}
                    >
                      {group.label}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="self-stretch flex flex-col justify-start items-start gap-3">
                    {group.items.map((notification) => (
                      <NotificationCard
                        key={notification.notificationId}
                        notification={notification}
                        onMarkAsRead={handleMarkAsRead}
                        onAction={handleNotificationAction}
                        variant={variant}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Load More / No More */}
              {hasMore ? (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="p-1 rounded-lg inline-flex justify-center items-center gap-1.5"
                >
                  <span className="text-text-accent-primary text-sm font-medium leading-4">
                    {loadingMore
                      ? "Cargando..."
                      : "Cargar notificaciones anteriores"}
                  </span>
                </button>
              ) : (
                <span className="text-gray-600 text-sm font-normal leading-4">
                  No hay más notificaciones
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
