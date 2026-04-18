"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { coursesService } from "@/services/courses.service";
import { enrollmentService } from "@/services/enrollment.service";
import type { Enrollment } from "@/types/enrollment";
import type {
  PreviousCycleContentResponse,
  PreviousCycleEvaluation,
} from "@/types/curso";
import Icon from "@/components/ui/Icon";

interface PreviousCycleContentProps {
  cursoId: string;
  cycleCode: string;
  previewData?: {
    courseName: string;
    backHref?: string;
    buildEvaluationUrl?: (evaluationId: string) => string;
    manageBreadcrumb?: boolean;
  };
}

function PreviousCycleEvaluationCard({
  evaluation,
  onSelect,
}: {
  evaluation: PreviousCycleEvaluation;
  onSelect?: (evaluation: PreviousCycleEvaluation) => void;
}) {
  const isBlocked = evaluation.label === "Bloqueado";

  return (
    <div
      className={`self-stretch h-full rounded-xl p-4 sm:p-6 outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-start items-end gap-3 sm:gap-4 ${
        isBlocked ? "bg-bg-tertiary" : "bg-bg-primary"
      }`}
    >
      <div className="self-stretch inline-flex justify-between items-start">
        <div
          className={`rounded-full p-2 ${isBlocked ? "bg-bg-disabled" : "bg-bg-tertiary"} flex justify-start items-center`}
        >
          <Icon
            name={isBlocked ? "lock" : "inventory_2"}
            size={20}
            className={isBlocked ? "text-icon-disabled" : "text-icon-secondary"}
          />
        </div>
        <div className="flex justify-start items-start">
          <div
            className={`rounded-full px-2 py-1 sm:px-2.5 sm:py-1.5 ${isBlocked ? "bg-bg-disabled" : "bg-bg-quartiary"} flex justify-center items-center gap-1`}
          >
            <span
              className={`text-[10px] sm:text-xs font-medium leading-3 ${
                isBlocked ? "text-text-disabled" : "text-text-secondary"
              }`}
            >
              {evaluation.label}
            </span>
          </div>
        </div>
      </div>

      <div className="self-stretch flex flex-col justify-start items-start gap-1">
        <div
          className={`self-stretch text-sm sm:text-lg font-semibold leading-4 sm:leading-5 ${
            isBlocked ? "text-text-secondary" : "text-text-primary"
          }`}
        >
          {evaluation.shortName}
        </div>
        <div
          className={`self-stretch text-[10px] sm:text-xs font-normal leading-3 sm:leading-4 ${
            isBlocked ? "text-text-tertiary" : "text-text-secondary"
          }`}
        >
          {evaluation.fullName}
        </div>
      </div>

      <button
        disabled={isBlocked}
        onClick={() => !isBlocked && onSelect?.(evaluation)}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg p-1 ${
          isBlocked
            ? "cursor-not-allowed"
            : "transition-colors hover:bg-bg-accent-light"
        }`}
      >
        <span
          className={`text-sm font-medium leading-4 ${
            isBlocked ? "text-text-disabled" : "text-text-accent-primary"
          }`}
        >
          Ver Clases
        </span>
        <Icon
          name="arrow_forward"
          size={16}
          className={
            isBlocked ? "text-icon-disabled" : "text-icon-accent-primary"
          }
        />
      </button>
    </div>
  );
}

export default function PreviousCycleContent({
  cursoId,
  cycleCode,
  previewData,
}: PreviousCycleContentProps) {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();

  const [courseName, setCourseName] = useState("");
  const [cycleContent, setCycleContent] =
    useState<PreviousCycleContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (previewData) {
      setCourseName(previewData.courseName);
      return;
    }

    async function loadCourseName() {
      try {
        const response = await enrollmentService.getMyCourses();
        const enrollments = Array.isArray(response)
          ? response
          : response.data || [];
        const found = enrollments.find(
          (enrollment: Enrollment) => enrollment.courseCycle.id === cursoId,
        );
        if (found) {
          setCourseName(found.courseCycle.course.name);
        }
      } catch (err) {
        console.error("Error al cargar nombre del curso:", err);
      }
    }

    if (cursoId) {
      void loadCourseName();
    }
  }, [cursoId, previewData]);

  useEffect(() => {
    if (!courseName) return;
    if (previewData?.manageBreadcrumb === false) return;

    const courseHref = previewData?.backHref || `/plataforma/curso/${cursoId}`;
    setBreadcrumbItems([
      { label: "Cursos" },
      { label: courseName, href: courseHref },
      { label: "Ciclos Anteriores", href: courseHref },
      { label: `Ciclo ${cycleCode}` },
    ]);
  }, [setBreadcrumbItems, courseName, cursoId, cycleCode, previewData]);

  useEffect(() => {
    async function loadCycleContent() {
      setLoading(true);
      setError(null);
      try {
        const data = await coursesService.getPreviousCycleContent(
          cursoId,
          cycleCode,
        );
        setCycleContent(data);
      } catch (err) {
        console.error(`Error al cargar contenido del ciclo ${cycleCode}:`, err);
        setError("Error al cargar el contenido del ciclo");
      } finally {
        setLoading(false);
      }
    }

    if (cursoId && cycleCode) {
      void loadCycleContent();
    }
  }, [cursoId, cycleCode]);

  if (loading) {
    return (
      <div className="w-full inline-flex flex-col justify-start items-start overflow-hidden">
        <div className="self-stretch animate-pulse">
          <div className="mb-6 h-5 w-48 rounded bg-bg-secondary" />
          <div className="mb-6 h-32 rounded-xl bg-bg-secondary" />
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-44 rounded-xl border border-stroke-primary bg-bg-secondary"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-stroke-primary bg-white p-12 text-center">
        <Icon
          name="error"
          size={64}
          className="mx-auto mb-4 text-error-solid"
        />
        <h1 className="mb-2 text-2xl font-bold text-primary">{error}</h1>
        <p className="mb-6 text-secondary">
          No se pudo cargar el contenido del ciclo {cycleCode}.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full inline-flex flex-col justify-start items-start overflow-hidden">
      <button
        onClick={() =>
          router.push(previewData?.backHref || `/plataforma/curso/${cursoId}`)
        }
        className="mb-6 inline-flex items-center justify-center gap-2 rounded-lg p-1 transition-colors hover:bg-bg-secondary"
      >
        <Icon
          name="arrow_back"
          size={20}
          className="text-icon-accent-primary"
        />
        <span className="text-sm sm:text-base font-medium leading-4 text-text-accent-primary">
          Volver a los Ciclos Anteriores
        </span>
      </button>

      <div className="relative mb-8 inline-flex self-stretch flex-col items-start justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-magenta-violet-800 via-magenta-violet-600 to-muted-indigo-200 px-4 py-6 sm:px-10 sm:py-8">
        <div className="self-stretch flex flex-col items-start justify-center gap-2">
          <div className="self-stretch text-2xl font-semibold leading-7 text-text-white sm:text-3xl sm:leading-10">
            Ciclo {cycleCode}
          </div>
        </div>
        <div className="inline-flex self-stretch flex-col items-start justify-start">
          <div className="max-w-[496px] self-stretch pr-16 text-xs font-normal leading-4 text-text-white sm:pr-0">
            Estas viendo un ciclo finalizado. Todos los materiales y grabaciones
            estan disponibles para que los consultes cuando quieras.
          </div>
        </div>
        <div className="absolute right-[-12px] top-8 h-24 w-24 overflow-hidden opacity-70 sm:right-[-28px] sm:top-4 sm:h-48 sm:w-48 sm:opacity-100">
          <Icon
            name="inventory_2"
            size={200}
            className="h-full w-full text-icon-info-secondary"
          />
        </div>
      </div>

      {cycleContent && cycleContent.evaluations.length > 0 ? (
        <div className="inline-flex self-stretch flex-col items-start justify-start gap-6">
          <div className="grid self-stretch grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-8">
            {cycleContent.evaluations.map((evaluation) => (
              <PreviousCycleEvaluationCard
                key={evaluation.id}
                evaluation={evaluation}
                onSelect={(selectedEvaluation) =>
                  router.push(
                    previewData?.buildEvaluationUrl?.(selectedEvaluation.id) ||
                      `/plataforma/curso/${cursoId}/ciclo-anterior/${cycleCode}/evaluacion/${selectedEvaluation.id}`,
                  )
                }
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex self-stretch flex-col items-center justify-center gap-4 rounded-2xl border border-stroke-primary bg-bg-secondary p-12">
          <Icon name="history" size={64} className="text-icon-tertiary" />
          <div className="text-center">
            <p className="mb-2 font-semibold text-text-primary">
              Sin evaluaciones en este ciclo
            </p>
            <p className="text-sm text-text-secondary">
              No hay evaluaciones disponibles para este ciclo
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
