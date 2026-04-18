"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/components/ui/ToastContainer";
import Icon from "@/components/ui/Icon";
import FloatingSelect from "@/components/ui/FloatingSelect";
import AdvancedFiltersSidebar from "@/components/pages/admin/AdvancedFiltersSidebar";
import {
  feedbackService,
  type AdminFeedbackItem,
  type AdminFeedbackListResponse,
} from "@/services/feedback.service";
import { usersService } from "@/services/users.service";

const PAGE_SIZE = 6;
const MAX_FEATURED = 3;
const DISTRIBUTION_COLORS = {
  5: "bg-bg-accent-primary-solid",
  4: "bg-bg-info-primary-solid",
  3: "bg-info-secondary-solid",
  2: "bg-bg-warning-solid",
  1: "bg-bg-error-solid",
} as const;

type VisibilityFilter = "all" | "featured" | "not_featured";

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i += 1
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  const rounded = Math.round(value);
  return `${rounded}%`;
}

function formatAverage(value: number): string {
  return value.toFixed(1);
}

function getFullName(item: AdminFeedbackItem["user"]): string {
  return [item.firstName, item.lastName1, item.lastName2]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getInitials(item: AdminFeedbackItem["user"]): string {
  const first = item.firstName?.[0] || "U";
  const last = item.lastName1?.[0] || item.lastName2?.[0] || "S";
  return `${first}${last}`.toUpperCase();
}

function getAvatarTone(index: number): string {
  const tones = [
    "bg-bg-info-primary-solid",
    "bg-bg-accent-primary-solid",
    "bg-bg-warning-solid",
    "bg-bg-info-secondary-solid",
  ];
  return tones[index % tones.length];
}

function formatRelativeDate(iso: string): string {
  const now = Date.now();
  const target = new Date(iso).getTime();
  const diff = Math.max(0, now - target);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months >= 1) return `Hace ${months} mes${months === 1 ? "" : "es"}`;
  if (weeks >= 1) return `Hace ${weeks} semana${weeks === 1 ? "" : "s"}`;
  if (days >= 1) return `Hace ${days} dia${days === 1 ? "" : "s"}`;
  return "Hoy";
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center">
      {Array.from({ length: 5 }, (_, idx) => {
        const filled = idx < rating;
        return (
          <Icon
            key={idx}
            name="star_rate"
            size={20}
            className={
              filled ? "text-[var(--bg-rating-solid)]" : "text-gray-400"
            }
          />
        );
      })}
    </div>
  );
}

function RatingFilterStars({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="inline-flex justify-start items-center">
      {Array.from({ length: 5 }, (_, idx) => {
        const ratingValue = idx + 1;
        const filled = ratingValue <= (value ?? 0);
        return (
          <button
            key={ratingValue}
            type="button"
            onClick={() => onChange(value === ratingValue ? null : ratingValue)}
            className="inline-flex flex-col justify-start items-start"
          >
            <Icon
              name="star_rate"
              size={36}
              className={
                filled ? "text-[var(--bg-rating-solid)]" : "text-gray-400"
              }
            />
          </button>
        );
      })}
    </div>
  );
}

function FeedbackCard({
  item,
  index,
  featuredCount,
  onToggleFeatured,
  saving,
  menuOpen,
  onToggleMenu,
  onViewStudent,
  onViewCourse,
}: {
  item: AdminFeedbackItem;
  index: number;
  featuredCount: number;
  onToggleFeatured: (item: AdminFeedbackItem) => void;
  saving: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onViewStudent: () => void;
  onViewCourse: () => void;
}) {
  const fullName = getFullName(item.user);
  const initials = getInitials(item.user);
  const canFeature = item.isActive || featuredCount < MAX_FEATURED;

  return (
    <div
      className={`self-stretch min-h-72 p-5 relative bg-bg-primary rounded-lg flex flex-col gap-4 ${
        item.isActive
          ? "outline outline-2 outline-offset-[-2px] outline-stroke-accent-secondary"
          : "outline outline-1 outline-offset-[-1px] outline-stroke-secondary"
      }`}
    >
      {item.isActive && (
        <div className="px-4 py-1 absolute right-0 top-0 bg-deep-blue-700 rounded-tr-lg rounded-bl-xl flex flex-col justify-start items-start z-10">
          <div className="justify-center text-text-white text-[10px] font-semibold leading-3">
            DESTACADO
          </div>
        </div>
      )}

      <div className="w-12 h-12 absolute right-5 top-5 overflow-hidden pointer-events-none">
        <Icon
          name="format_quote"
          size={48}
          className="text-bg-info-secondary-light-hover"
          variant="outlined"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 p-3 ${getAvatarTone(index)} rounded-full flex justify-center items-center gap-2 text-text-white text-base font-medium leading-5 shrink-0`}
          >
            {initials}
          </div>
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="text-text-primary text-lg font-semibold leading-5 line-clamp-1">
              {fullName}
            </div>
            <div className="text-text-accent-primary text-sm font-medium leading-4 line-clamp-1">
              {item.user.careerName || "Sin carrera asignada"}
            </div>
          </div>
        </div>
        <StarRow rating={item.rating} />
      </div>

      <div className="flex-1 flex flex-col justify-between gap-4">
        <div className="text-text-secondary text-base font-normal leading-4">
          "{item.comment}"
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="px-1.5 py-1 bg-bg-quartiary rounded-full flex justify-center items-center gap-1">
            <span className="text-text-secondary text-[8px] font-medium leading-[10px]">
              {item.courseName}
            </span>
          </div>
          <div className="text-text-tertiary text-xs font-normal leading-4">
            {formatRelativeDate(item.createdAt)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onToggleFeatured(item)}
          disabled={saving || (!item.isActive && !canFeature)}
          className={`px-3.5 py-2 rounded-full outline outline-1 outline-offset-[-1px] flex justify-center items-center gap-1 transition-colors ${
            item.isActive
              ? "bg-bg-accent-primary-solid outline-bg-accent-primary-solid text-text-white"
              : "bg-bg-primary outline-stroke-accent-primary text-text-accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
          }`}
        >
          <Icon
            name="star_rate"
            size={16}
            className={
              item.isActive ? "text-text-white" : "text-icon-accent-primary"
            }
          />
          <span className="text-sm font-medium leading-4">
            {item.isActive ? "Quitar destacado" : "Destacar"}
          </span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={onToggleMenu}
            className="p-1 rounded-full flex justify-center items-center gap-1 hover:bg-bg-secondary transition-colors"
            aria-label="Mas opciones"
          >
            <Icon name="more_vert" size={20} className="text-icon-tertiary" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 bottom-10 z-30 w-48 p-1 bg-bg-primary rounded-lg shadow-[2px_4px_4px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-start items-start">
              <button
                type="button"
                onClick={onViewStudent}
                className="self-stretch px-2 py-3 bg-bg-primary rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors"
              >
                <Icon
                  name="visibility"
                  size={20}
                  className="text-icon-secondary"
                  variant="rounded"
                />
                <span className="flex-1 justify-start text-text-secondary text-sm font-normal leading-4 text-left">
                  Ver Alumno
                </span>
              </button>
              <button
                type="button"
                onClick={onViewCourse}
                className="self-stretch px-2 py-3 bg-bg-primary rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors"
              >
                <Icon
                  name="library_books"
                  size={20}
                  className="text-icon-secondary"
                  variant="rounded"
                />
                <span className="flex-1 justify-start text-text-secondary text-sm font-normal leading-4 text-left">
                  Ver Curso
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ValoracionesContent() {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();

  const [data, setData] = useState<AdminFeedbackListResponse | null>(null);
  const [courseOptions, setCourseOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [careerOptions, setCareerOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [featuredCount, setFeaturedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");
  const [courseFilter, setCourseFilter] = useState<string | null>(null);
  const [careerFilter, setCareerFilter] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarVisibilityFilter, setSidebarVisibilityFilter] =
    useState<VisibilityFilter>("all");
  const [sidebarCourseFilter, setSidebarCourseFilter] = useState<string | null>(
    null,
  );
  const [sidebarCareerFilter, setSidebarCareerFilter] = useState<string | null>(
    null,
  );
  const [sidebarRatingFilter, setSidebarRatingFilter] = useState<number | null>(
    null,
  );
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [menuFeedbackId, setMenuFeedbackId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setBreadcrumbItems([
      { icon: "star_rate", label: "Gestion de valoraciones" },
    ]);
  }, [setBreadcrumbItems]);

  useEffect(() => {
    if (!menuFeedbackId) return;
    const handler = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuFeedbackId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuFeedbackId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void Promise.all([
      usersService.getCourseCatalog(),
      usersService.getCareers(),
    ])
      .then(([courses, careers]) => {
        setCourseOptions(
          courses.map((course) => ({
            value: course.courseId,
            label: course.courseName,
          })),
        );
        setCareerOptions(
          careers.map((career) => ({
            value: String(career.id),
            label: career.name,
          })),
        );
      })
      .catch((err) => {
        console.error("Error al cargar catalogos de filtros:", err);
      });
  }, []);

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const isActive =
        visibilityFilter === "featured"
          ? true
          : visibilityFilter === "not_featured"
            ? false
            : undefined;

      const [mainResponse, featuredResponse] = await Promise.all([
        feedbackService.getAdminFeedback({
          page: currentPage,
          search: debouncedSearch || undefined,
          isActive,
          courseId: courseFilter || undefined,
          careerId: careerFilter ? Number(careerFilter) : undefined,
          rating: (ratingFilter as 1 | 2 | 3 | 4 | 5 | null) || undefined,
        }),
        feedbackService.getAdminFeedback({ page: 1, isActive: true }),
      ]);

      setData(mainResponse);
      setFeaturedCount(featuredResponse.stats.total);
    } catch (err) {
      console.error("Error al cargar valoraciones:", err);
      showToast({
        type: "error",
        title: "No se pudieron cargar las valoraciones",
        description:
          err instanceof Error ? err.message : "Ocurrio un error inesperado.",
      });
    } finally {
      setLoading(false);
    }
  }, [
    careerFilter,
    courseFilter,
    currentPage,
    debouncedSearch,
    ratingFilter,
    showToast,
    visibilityFilter,
  ]);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  const handleToggleFeatured = useCallback(
    async (item: AdminFeedbackItem) => {
      try {
        setTogglingId(item.id);
        await feedbackService.featureTestimony(item.id, !item.isActive);
        showToast({
          type: "success",
          title: item.isActive ? "Valoracion oculta" : "Valoracion destacada",
          description: item.isActive
            ? "La valoracion dejo de mostrarse en la pagina publica."
            : "La valoracion ahora aparece en la pagina publica.",
        });
        await loadFeedback();
      } catch (err) {
        console.error("Error al actualizar valoracion destacada:", err);
        showToast({
          type: "error",
          title: "No se pudo actualizar la valoracion",
          description:
            err instanceof Error ? err.message : "Ocurrio un error inesperado.",
        });
      } finally {
        setTogglingId(null);
      }
    },
    [loadFeedback, showToast],
  );

  const stats = data?.stats;
  const distributionRows = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        percentage: stats?.distribution?.[String(rating)] ?? 0,
      })),
    [stats],
  );

  const pagination = useMemo(() => {
    if (!data || data.totalPages <= 1) return [] as (number | "...")[];
    return getPageNumbers(data.currentPage, data.totalPages);
  }, [data]);

  const openSidebar = () => {
    setSidebarVisibilityFilter(visibilityFilter);
    setSidebarCourseFilter(courseFilter);
    setSidebarCareerFilter(careerFilter);
    setSidebarRatingFilter(ratingFilter);
    setSidebarOpen(true);
  };

  const clearSidebarFilters = () => {
    setSidebarVisibilityFilter("all");
    setSidebarCourseFilter(null);
    setSidebarCareerFilter(null);
    setSidebarRatingFilter(null);
  };

  const applySidebarFilters = () => {
    setVisibilityFilter(sidebarVisibilityFilter);
    setCourseFilter(sidebarCourseFilter);
    setCareerFilter(sidebarCareerFilter);
    setRatingFilter(sidebarRatingFilter);
    setCurrentPage(1);
    setSidebarOpen(false);
  };

  return (
    <div className="w-full max-w-[1200px] flex flex-col justify-start items-start gap-6 overflow-hidden">
      <div className="self-stretch inline-flex justify-start items-center">
        <div className="justify-start text-text-primary text-3xl font-semibold leading-10">
          Gestion de Valoraciones
        </div>
      </div>

      <div className="self-stretch flex flex-col xl:flex-row justify-start items-start gap-6">
        <div className="w-full xl:w-[540px] flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-gray-100 flex flex-col gap-4">
              <div className="text-gray-600 text-sm font-medium leading-4 uppercase">
                Rating promedio
              </div>
              <div className="inline-flex justify-start items-end gap-1">
                <div className="text-text-primary text-3xl font-extrabold leading-9">
                  {formatAverage(stats?.average ?? 0)}
                </div>
                <div className="text-gray-600 text-base font-normal leading-5">
                  / 5.0
                </div>
              </div>
              <StarRow rating={Math.round(stats?.average ?? 0)} />
            </div>

            <div className="flex-1 p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-gray-100 flex flex-col gap-4">
              <div className="text-gray-600 text-sm font-medium leading-4 uppercase">
                Total valoraciones
              </div>
              <div className="text-text-primary text-3xl font-extrabold leading-9">
                {stats?.total ?? 0}
              </div>
            </div>
          </div>

          <div className="self-stretch p-6 bg-bg-info-primary-light rounded-xl outline outline-1 outline-offset-[-1px] outline-gray-100 flex flex-col gap-4">
            <div className="self-stretch inline-flex justify-start items-center gap-4">
              <Icon
                name="stars"
                size={36}
                className="text-icon-info-primary shrink-0"
              />
              <div className="flex-1 flex flex-col justify-center items-start gap-0.5">
                <div className="text-text-info-primary text-lg font-medium leading-5">
                  {featuredCount} de {MAX_FEATURED} destacados
                </div>
                <div className="text-text-tertiary text-xs font-light leading-3">
                  Los comentarios destacados se mostraran en la pagina de la
                  academia.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-gray-100 flex flex-col gap-6">
          <div className="text-gray-600 text-sm font-medium leading-4 uppercase">
            Distribucion de estrellas
          </div>
          <div className="flex flex-col gap-5">
            {distributionRows.map(({ rating, percentage }) => (
              <div key={rating} className="flex items-center gap-4">
                <div className="w-20 text-gray-700 text-xs font-medium leading-3">
                  {rating} estrella{rating === 1 ? "" : "s"}
                </div>
                <div className="flex-1 h-2 relative bg-bg-quartiary rounded-full overflow-hidden">
                  <div
                    className={`h-2 absolute left-0 top-0 rounded-full ${DISTRIBUTION_COLORS[rating as keyof typeof DISTRIBUTION_COLORS]}`}
                    style={{
                      width: `${Math.max(percentage, percentage > 0 ? 2 : 0)}%`,
                    }}
                  />
                </div>
                <div className="w-10 text-text-tertiary text-xs font-normal leading-4 text-right">
                  {formatPercentage(percentage)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="self-stretch flex flex-col gap-4">
        <div className="self-stretch p-3 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col gap-4">
          <div className="self-stretch flex flex-col lg:flex-row justify-start items-stretch lg:items-center gap-4">
            <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
              <div className="self-stretch h-10 px-2.5 py-3 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
                <Icon name="search" size={16} className="text-icon-tertiary" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por alumno o comentario"
                  className="flex-1 bg-transparent outline-none text-text-primary text-sm font-normal leading-4 placeholder:text-text-tertiary"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={openSidebar}
              className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
            >
              <Icon
                name="filter_alt"
                size={16}
                className="text-icon-accent-primary"
              />
              <div className="text-text-accent-primary text-sm font-medium leading-4">
                Filtros
              </div>
            </button>
          </div>

          <div className="self-stretch inline-flex justify-start items-center gap-2 flex-wrap content-center">
            {[
              { key: "all", label: "Todos" },
              {
                key: "featured",
                label: `Destacados (${featuredCount}/${MAX_FEATURED})`,
              },
              { key: "not_featured", label: "No destacados" },
            ].map((option) => {
              const active = visibilityFilter === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setVisibilityFilter(option.key as typeof visibilityFilter);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-full flex justify-center items-center gap-1 ${
                    active
                      ? "bg-bg-accent-primary-solid text-text-white"
                      : "bg-bg-primary outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary text-text-accent-primary"
                  }`}
                >
                  <div className="text-sm font-medium leading-4">
                    {option.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="self-stretch p-10 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-bg-accent-light border-t-bg-accent-primary-solid rounded-full animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="self-stretch p-10 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col items-center justify-center gap-3">
            <Icon name="star_rate" size={40} className="text-text-tertiary" />
            <div className="text-text-secondary text-sm font-normal leading-4 text-center">
              No se encontraron valoraciones para los filtros actuales.
            </div>
          </div>
        ) : (
          <div className="self-stretch grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.items.map((item, index) => {
              const isMenuOpen = menuFeedbackId === item.id;
              return (
                <div
                  key={item.id}
                  ref={isMenuOpen ? menuRef : undefined}
                  className="relative"
                >
                  <FeedbackCard
                    item={item}
                    index={index}
                    featuredCount={featuredCount}
                    onToggleFeatured={handleToggleFeatured}
                    saving={togglingId === item.id}
                    menuOpen={isMenuOpen}
                    onToggleMenu={() =>
                      setMenuFeedbackId((current) =>
                        current === item.id ? null : item.id,
                      )
                    }
                    onViewStudent={() => {
                      setMenuFeedbackId(null);
                      router.push(
                        `/plataforma/admin/usuarios/${encodeURIComponent(item.user.id)}`,
                      );
                    }}
                    onViewCourse={() => {
                      setMenuFeedbackId(null);
                      router.push(
                        `/plataforma/curso/${encodeURIComponent(item.courseCycleId)}`,
                      );
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {data && data.totalItems > 0 && (
          <div className="self-stretch px-4 py-3 bg-bg-primary flex flex-col gap-2.5">
            <div className="self-stretch inline-flex justify-between items-center gap-4 flex-wrap">
              <div className="flex justify-center items-center gap-1 flex-wrap text-text-tertiary text-sm leading-4">
                <span>Mostrando</span>
                <span className="font-medium">
                  {(data.currentPage - 1) * PAGE_SIZE + 1}
                </span>
                <span className="font-medium">-</span>
                <span className="font-medium">
                  {Math.min(data.currentPage * PAGE_SIZE, data.totalItems)}
                </span>
                <span>de</span>
                <span className="font-medium">{data.totalItems}</span>
              </div>

              <div className="flex justify-start items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={data.currentPage <= 1}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  className="p-2 rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex justify-center items-center gap-1 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon
                    name="chevron_left"
                    size={16}
                    className="text-icon-tertiary"
                  />
                </button>

                <div className="flex justify-start items-center gap-2 flex-wrap">
                  {pagination.map((page, index) =>
                    page === "..." ? (
                      <div
                        key={`ellipsis-${index}`}
                        className="min-w-8 px-1 py-2 rounded-lg inline-flex flex-col justify-center items-center"
                      >
                        <div className="text-text-tertiary text-sm font-normal leading-4">
                          ...
                        </div>
                      </div>
                    ) : (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-8 px-1 py-2 rounded-lg inline-flex flex-col justify-center items-center ${
                          data.currentPage === page
                            ? "bg-bg-accent-primary-solid text-text-white"
                            : "text-text-tertiary"
                        }`}
                      >
                        <div className="text-sm leading-4 font-medium">
                          {page}
                        </div>
                      </button>
                    ),
                  )}
                </div>

                <button
                  type="button"
                  disabled={data.currentPage >= data.totalPages}
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(data.totalPages, prev + 1),
                    )
                  }
                  className="p-2 rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex justify-center items-center gap-1 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon
                    name="chevron_right"
                    size={16}
                    className="text-icon-tertiary"
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AdvancedFiltersSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onClear={clearSidebarFilters}
        onApply={applySidebarFilters}
      >
        <div className="self-stretch flex flex-col justify-center items-start gap-4">
          <div className="self-stretch justify-start text-text-quartiary text-base font-semibold leading-5">
            Destacado
          </div>
          <div className="self-stretch inline-flex justify-start items-center gap-2 flex-wrap content-center">
            {[
              { key: "all", label: "Todos" },
              {
                key: "featured",
                label: `Destacados (${featuredCount}/${MAX_FEATURED})`,
              },
              { key: "not_featured", label: "No destacados" },
            ].map((option) => {
              const active = sidebarVisibilityFilter === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() =>
                    setSidebarVisibilityFilter(option.key as VisibilityFilter)
                  }
                  className={`px-4 py-2 rounded-full flex justify-center items-center gap-1 ${
                    active
                      ? "bg-bg-accent-primary-solid text-text-white"
                      : "bg-bg-primary outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary text-text-accent-primary"
                  }`}
                >
                  <div className="text-sm font-medium leading-4">
                    {option.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="self-stretch flex flex-col justify-center items-start gap-4">
          <div className="self-stretch justify-start text-text-quartiary text-base font-semibold leading-5">
            Cursos
          </div>
          <FloatingSelect
            label="Cursos"
            value={sidebarCourseFilter}
            options={courseOptions}
            onChange={setSidebarCourseFilter}
            allLabel="Todos"
            className="w-full"
            variant="filled"
            size="large"
          />
        </div>

        <div className="self-stretch flex flex-col justify-center items-start gap-4">
          <div className="self-stretch justify-start text-text-quartiary text-base font-semibold leading-5">
            Carrera
          </div>
          <FloatingSelect
            label="Carrera"
            value={sidebarCareerFilter}
            options={careerOptions}
            onChange={setSidebarCareerFilter}
            allLabel="Todas"
            className="w-full"
            variant="filled"
            size="large"
          />
        </div>

        <div className="self-stretch flex flex-col justify-center items-start gap-4">
          <div className="self-stretch justify-start text-text-quartiary text-base font-semibold leading-5">
            Calificacion
          </div>
          <RatingFilterStars
            value={sidebarRatingFilter}
            onChange={setSidebarRatingFilter}
          />
        </div>
      </AdvancedFiltersSidebar>
    </div>
  );
}
