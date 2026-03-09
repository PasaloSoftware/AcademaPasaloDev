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
}

// ============================================
// Card de evaluación dentro de un ciclo anterior
// Mismo layout vertical que EvaluationCard del ciclo vigente
// ============================================

function PreviousCycleEvaluationCard({
  evaluation,
}: {
  evaluation: PreviousCycleEvaluation;
}) {
  const isBlocked = evaluation.label === "Bloqueado";

  return (
    <div
      className={`self-stretch p-6 ${isBlocked ? "bg-bg-tertiary" : "bg-bg-primary"} rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-start items-end gap-4`}
    >
      {/* Icon + Badge */}
      <div className="self-stretch inline-flex justify-between items-start">
        <div
          className={`p-2 ${isBlocked ? "bg-bg-disabled" : "bg-bg-tertiary"} rounded-full flex justify-start items-center`}
        >
          <Icon
            name={isBlocked ? "lock" : "inventory_2"}
            size={24}
            className={isBlocked ? "text-icon-disabled" : "text-icon-secondary"}
          />
        </div>
        <div className="flex justify-start items-start">
          <div
            className={`px-2.5 py-1.5 ${isBlocked ? "bg-bg-disabled" : "bg-bg-quartiary"} rounded-full flex justify-center items-center gap-1`}
          >
            <span
              className={`text-xs font-medium leading-3 ${isBlocked ? "text-text-disabled" : "text-text-secondary"}`}
            >
              {evaluation.label}
            </span>
          </div>
        </div>
      </div>

      {/* Title + Description */}
      <div className="self-stretch flex flex-col justify-start items-start gap-1">
        <div
          className={`self-stretch text-lg font-semibold leading-5 ${isBlocked ? "text-text-secondary" : "text-text-primary"}`}
        >
          {evaluation.shortName}
        </div>
        <div
          className={`self-stretch text-xs font-normal leading-4 ${isBlocked ? "text-text-tertiary" : "text-text-secondary"}`}
        >
          {evaluation.fullName}
        </div>
      </div>

      {/* Ver Clases Link */}
      <button
        disabled={isBlocked}
        className={`p-1 rounded-lg inline-flex justify-center items-center gap-1.5 ${isBlocked ? "cursor-not-allowed" : "hover:bg-bg-accent-light transition-colors"}`}
      >
        <span
          className={`text-sm font-medium leading-4 ${isBlocked ? "text-text-disabled" : "text-text-accent-primary"}`}
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

// ============================================
// Componente principal
// ============================================

export default function PreviousCycleContent({
  cursoId,
  cycleCode,
}: PreviousCycleContentProps) {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();

  const [courseName, setCourseName] = useState("");
  const [cycleContent, setCycleContent] =
    useState<PreviousCycleContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar nombre del curso desde enrollment
  useEffect(() => {
    async function loadCourseName() {
      try {
        const response = await enrollmentService.getMyCourses();
        const enrollments = Array.isArray(response)
          ? response
          : response.data || [];
        const found = enrollments.find(
          (e: Enrollment) => e.courseCycle.id === cursoId,
        );
        if (found) {
          setCourseName(found.courseCycle.course.name);
        }
      } catch (err) {
        console.error("Error al cargar nombre del curso:", err);
      }
    }

    if (cursoId) loadCourseName();
  }, [cursoId]);

  // Breadcrumb
  useEffect(() => {
    if (!courseName) return;
    setBreadcrumbItems([
      { label: "Cursos" },
      { label: courseName, href: `/plataforma/curso/${cursoId}` },
      { label: "Ciclos Anteriores", href: `/plataforma/curso/${cursoId}` },
      { label: `Ciclo ${cycleCode}` },
    ]);
  }, [setBreadcrumbItems, courseName, cursoId, cycleCode]);

  // Cargar contenido del ciclo anterior
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

    if (cursoId && cycleCode) loadCycleContent();
  }, [cursoId, cycleCode]);

  // ============================================
  // Loading state
  // ============================================

  if (loading) {
    return (
      <div className="w-full inline-flex flex-col justify-start items-start overflow-hidden">
        <div className="self-stretch animate-pulse">
          <div className="h-5 w-48 bg-bg-secondary rounded mb-6" />
          <div className="h-32 bg-bg-secondary rounded-xl mb-6" />
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-44 bg-bg-secondary rounded-xl border border-stroke-primary"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // Error state
  // ============================================

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-stroke-primary p-12 text-center">
        <Icon
          name="error"
          size={64}
          className="text-error-solid mb-4 mx-auto"
        />
        <h1 className="text-2xl font-bold text-primary mb-2">{error}</h1>
        <p className="text-secondary mb-6">
          No se pudo cargar el contenido del ciclo {cycleCode}.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full inline-flex flex-col justify-start items-start overflow-hidden">
      {/* Back Link */}
      <button
        onClick={() => router.push(`/plataforma/curso/${cursoId}`)}
        className="p-1 rounded-lg hover:bg-bg-secondary transition-colors inline-flex justify-center items-center gap-2 mb-6"
      >
        <Icon
          name="arrow_back"
          size={20}
          className="text-icon-accent-primary"
        />
        <span className="text-text-accent-primary text-base font-medium leading-4">
          Volver a los Ciclos Anteriores
        </span>
      </button>

      {/* Gradient Hero Banner */}
      <div className="self-stretch px-10 py-8 relative bg-gradient-to-r from-magenta-violet-800 via-magenta-violet-600 to-muted-indigo-200 rounded-xl inline-flex flex-col justify-center items-start gap-2 overflow-hidden mb-8">
        <div className="self-stretch flex flex-col justify-center items-start gap-2">
          <div className="self-stretch text-text-white text-3xl font-semibold leading-10">
            Ciclo {cycleCode}
          </div>
        </div>
        <div className="self-stretch inline-flex flex-col justify-start items-start">
          <div className="self-stretch text-text-white text-xs font-normal leading-4 max-w-[496px]">
            ¡Estás viendo un ciclo finalizado! Todos los materiales y
            grabaciones están disponibles para que los consultes cuando quieras.
          </div>
        </div>
        {/* Decorative icon */}
        <div className="w-48 h-48 absolute right-[-28] top-4 overflow-hidden">
          <Icon name="inventory_2" size={200} className="text-icon-info-secondary" />
        </div>
      </div>

      {/* Evaluation Cards - Grid 3 cols like ciclo vigente */}
      {cycleContent && cycleContent.evaluations.length > 0 ? (
        <div className="self-stretch inline-flex flex-col justify-start items-start gap-6">
          <div className="self-stretch grid grid-cols-3 gap-8">
            {cycleContent.evaluations.map((evaluation) => (
              <PreviousCycleEvaluationCard
                key={evaluation.id}
                evaluation={evaluation}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="self-stretch p-12 bg-bg-secondary rounded-2xl border border-stroke-primary flex flex-col items-center justify-center gap-4">
          <Icon name="history" size={64} className="text-icon-tertiary" />
          <div className="text-center">
            <p className="text-text-primary font-semibold mb-2">
              Sin evaluaciones en este ciclo
            </p>
            <p className="text-text-secondary text-sm">
              No hay evaluaciones disponibles para este ciclo
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
