"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import {
  feedbackService,
  type PublicFeedbackItem,
} from "@/services/feedback.service";

function getFullName(item: PublicFeedbackItem["user"]): string {
  return [item.firstName, item.lastName1].filter(Boolean).join(" ").trim();
}

function getInitials(item: PublicFeedbackItem["user"]): string {
  const first = item.firstName?.[0] || "U";
  const last = item.lastName1?.[0] || "S";
  return `${first}${last}`.toUpperCase();
}

function getAvatarTone(index: number): string {
  const tones = [
    "bg-bg-info-primary-solid",
    "bg-bg-accent-primary-solid",
    "bg-bg-warning-solid",
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

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex items-center">
      {Array.from({ length: 5 }, (_, i) => (
        <Icon
          key={i}
          name="star_rate"
          size={20}
          className={i < count ? "text-bg-rating-solid" : "text-gray-400"}
        />
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  const [items, setItems] = useState<PublicFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void feedbackService
      .getPublicFeedback()
      .then((response) => {
        if (!active) return;
        setItems(response);
      })
      .catch((error) => {
        console.error("Error al cargar testimonios publicos:", error);
        if (!active) return;
        setItems([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const testimonials = useMemo(() => items.slice(0, 3), [items]);

  if (!loading && testimonials.length === 0) {
    return null;
  }

  return (
    <section
      id="testimonios"
      className="scroll-mt-20 px-4 py-10 md:px-16 lg:px-28 md:py-20 bg-bg-primary flex flex-col items-center gap-6 md:gap-10"
    >
      <div className="w-full flex flex-col items-center gap-4 px-5">
        <div className="flex flex-col items-center gap-2 md:gap-3">
          <span className="px-3 py-1 md:px-4 md:py-2 bg-bg-accent-light rounded-full text-text-accent-primary text-xs md:text-sm font-medium leading-3 md:leading-4">
            RESULTADOS COMPROBADOS
          </span>
          <h2 className="w-full text-center text-text-primary text-3xl md:text-5xl font-bold leading-8 md:leading-[56px]">
            Historias de Exito
          </h2>
        </div>
        <div className="w-full lg:px-60">
          <p className="text-center text-text-secondary text-xs md:text-xl font-normal leading-4 md:leading-6">
            Nuestros alumnos comparten su experiencia logrando sus metas
            academicas con nuestro metodo especializado.
          </p>
        </div>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {loading
          ? Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-52 md:h-60 p-5 relative bg-bg-primary rounded-lg card-shadow outline outline-1 outline-offset-[-1px] outline-stroke-secondary animate-pulse"
              >
                <div className="h-full rounded-lg bg-bg-secondary" />
              </div>
            ))
          : testimonials.map((item, index) => (
              <div
                key={item.id}
                className="h-52 md:h-60 p-5 relative bg-bg-primary rounded-lg card-shadow outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col gap-2"
              >
                <div className="flex flex-col gap-1 md:gap-2">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 md:w-12 md:h-12 ${getAvatarTone(index)} rounded-full flex justify-center items-center`}
                    >
                      <span className="text-text-white text-sm md:text-base font-medium leading-4 md:leading-5">
                        {getInitials(item.user)}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <span className="text-text-primary text-sm md:text-lg font-semibold leading-4 md:leading-5 line-clamp-1">
                        {getFullName(item.user)}
                      </span>
                      <span className="text-magenta-violet-600 text-xs md:text-sm font-medium leading-4 line-clamp-1">
                        {item.user.careerName || "Sin carrera asignada"}
                      </span>
                    </div>
                  </div>
                  <StarRating count={item.rating} />
                </div>

                <div className="absolute right-5 top-4">
                  <Icon
                    name="format_quote"
                    size={48}
                    variant="outlined"
                    className="text-bg-info-secondary-light-hover"
                  />
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <p className="text-text-secondary text-xs md:text-base font-normal leading-4 line-clamp-5">
                    &ldquo;{item.comment}&rdquo;
                  </p>
                  <div className="flex justify-between items-center gap-2">
                    <span className="px-1.5 py-1 bg-bg-quartiary rounded-full text-text-secondary text-[8px] font-medium leading-[10px]">
                      {item.courseName}
                    </span>
                    <span className="text-text-tertiary text-xs font-normal leading-4 whitespace-nowrap">
                      {formatRelativeDate(item.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}
