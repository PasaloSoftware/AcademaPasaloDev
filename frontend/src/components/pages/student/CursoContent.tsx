"use client";

import { useEffect, useState } from "react";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { coursesService } from "@/services/courses.service";
import { enrollmentService } from "@/services/enrollment.service";
import { Enrollment } from "@/types/enrollment";
import {
  CurrentCycleResponse,
  PreviousCyclesResponse,
  BankStructureResponse,
} from "@/types/curso";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import {
  EvaluationCard,
  PreviousCycleCard,
  BancoCategoryCard,
  sortEvaluations,
} from "@/components/shared/evaluationHelpers";

interface CursoContentProps {
  cursoId: string;
}

type TabOption = "vigente" | "anteriores" | "banco";

// ============================================
// Componente principal
// ============================================

export default function CursoContent({ cursoId }: CursoContentProps) {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();

  // Datos del enrollment (para header: nombre, profesor, tipo, nivel)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);

  // Tab activo
  const [activeTab, setActiveTab] = useState<TabOption>("vigente");

  // Datos del ciclo vigente
  const [currentCycle, setCurrentCycle] = useState<CurrentCycleResponse | null>(
    null,
  );
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [errorCurrent, setErrorCurrent] = useState<string | null>(null);

  // Datos de ciclos anteriores
  const [previousCycles, setPreviousCycles] =
    useState<PreviousCyclesResponse | null>(null);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  // Datos del banco de enunciados
  const [bankStructure, setBankStructure] =
    useState<BankStructureResponse | null>(null);
  const [loadingBank, setLoadingBank] = useState(false);
  // Loading general (enrollment)
  const [loadingEnrollment, setLoadingEnrollment] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obtener datos del enrollment para el header
  useEffect(() => {
    async function loadEnrollment() {
      setLoadingEnrollment(true);
      setError(null);
      try {
        const response = await enrollmentService.getMyCourses();
        const enrollments = Array.isArray(response)
          ? response
          : response.data || [];
        const found = enrollments.find(
          (e: Enrollment) => e.courseCycle.id === cursoId,
        );
        if (found) {
          setEnrollment(found);
          setBreadcrumbItems([
            { label: "Cursos" },
            { label: found.courseCycle.course.name },
          ]);
        } else {
          setError("No se encontró la matrícula para este curso");
        }
      } catch (err) {
        console.error("Error al cargar matrícula:", err);
        setError("Error al cargar los datos del curso");
      } finally {
        setLoadingEnrollment(false);
      }
    }

    if (cursoId) loadEnrollment();
  }, [cursoId, setBreadcrumbItems]);

  // Obtener evaluaciones del ciclo vigente
  useEffect(() => {
    async function loadCurrentCycle() {
      setLoadingCurrent(true);
      setErrorCurrent(null);
      try {
        const data = await coursesService.getCurrentCycleContent(cursoId);
        setCurrentCycle(data);
      } catch (err) {
        console.error("Error al cargar ciclo vigente:", err);
        setErrorCurrent("Error al cargar las evaluaciones del ciclo vigente");
      } finally {
        setLoadingCurrent(false);
      }
    }

    if (cursoId) loadCurrentCycle();
  }, [cursoId]);

  // Cargar lista de ciclos anteriores cuando canViewPreviousCycles = true
  useEffect(() => {
    async function loadPreviousCycles() {
      if (!currentCycle?.canViewPreviousCycles) return;
      setLoadingPrevious(true);
      try {
        const data = await coursesService.getPreviousCycles(cursoId);
        setPreviousCycles(data);
      } catch (err) {
        console.error("Error al cargar ciclos anteriores:", err);
      } finally {
        setLoadingPrevious(false);
      }
    }

    loadPreviousCycles();
  }, [cursoId, currentCycle?.canViewPreviousCycles]);

  // Cargar estructura del banco de enunciados
  useEffect(() => {
    async function loadBankStructure() {
      setLoadingBank(true);
      try {
        const data = await coursesService.getBankStructure(cursoId);
        setBankStructure(data);
      } catch (err) {
        console.error("Error al cargar banco de enunciados:", err);
      } finally {
        setLoadingBank(false);
      }
    }

    if (cursoId) loadBankStructure();
  }, [cursoId]);

  // Helpers
  const getInitials = (firstName: string, lastName1: string) => {
    return `${firstName[0] || ""}${lastName1[0] || ""}`.toUpperCase();
  };

  const getProfessorName = () => {
    if (!enrollment) return "";
    const profs = enrollment.courseCycle.professors;
    if (profs.length === 0) return "Sin asignar";
    return `${profs[0].firstName} ${profs[0].lastName1}`;
  };

  const getProfessorInitials = () => {
    if (!enrollment) return "";
    const profs = enrollment.courseCycle.professors;
    if (profs.length === 0) return "XX";
    return getInitials(profs[0].firstName, profs[0].lastName1);
  };

  // ============================================
  // Loading state
  // ============================================

  if (loadingEnrollment || loadingCurrent) {
    return (
      <div className="w-full inline-flex flex-col justify-start items-start overflow-hidden">
        <div className="self-stretch animate-pulse">
          <div className="flex gap-8">
            <div className="flex-1 space-y-5">
              <div className="flex gap-2">
                <div className="h-7 w-24 bg-bg-secondary rounded-full" />
                <div className="h-7 w-20 bg-bg-secondary rounded-full" />
              </div>
              <div className="h-12 bg-bg-secondary rounded w-3/4" />
              <div className="h-6 bg-bg-secondary rounded w-1/3" />
            </div>
            <div className="flex-1 h-44 bg-bg-secondary rounded-lg" />
          </div>
          <div className="mt-8 h-12 w-[575px] bg-bg-secondary rounded-xl" />
          <div className="mt-8 space-y-0">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 bg-bg-secondary rounded-2xl border border-stroke-primary"
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

  if (error || errorCurrent || !enrollment) {
    return (
      <div className="bg-white rounded-2xl border border-stroke-primary p-12 text-center">
        <Icon
          name="error"
          size={64}
          className="text-error-solid mb-4 mx-auto"
        />
        <h1 className="text-2xl font-bold text-primary mb-2">
          {error || errorCurrent || "Curso no encontrado"}
        </h1>
        <p className="text-secondary mb-6">
          El curso solicitado no está disponible.
        </p>
      </div>
    );
  }

  // Datos derivados del enrollment
  const courseName = enrollment.courseCycle.course.name;
  const courseTypeName =
    enrollment.courseCycle.course.courseType?.name || "CIENCIAS";
  const cycleLevelName = enrollment.courseCycle.course.cycleLevel?.name || "";

  // Tab config
  const tabs: { key: TabOption; label: string; disabled?: boolean }[] = [
    { key: "vigente", label: "Ciclo Vigente" },
    { key: "anteriores", label: "Ciclos Pasados" },
    { key: "banco", label: "Banco de Enunciados" },
  ];

  return (
    <div className="w-full inline-flex flex-col justify-start items-start overflow-hidden">
      {/* ========================================
          HEADER SECTION
          ======================================== */}
      <div className="self-stretch inline-flex justify-start items-start gap-8 overflow-hidden mb-8">
        {/* Left: Course Info */}
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-5">
          {/* Tags */}
          <div className="inline-flex justify-start items-center gap-2">
            <div className="px-2.5 py-1.5 bg-bg-success-light rounded-full flex justify-center items-center gap-1">
              <span className="text-text-success-primary text-xs font-medium leading-3">
                {courseTypeName.toUpperCase()}
              </span>
            </div>
            <div className="px-2.5 py-1.5 bg-bg-quartiary rounded-full flex justify-center items-center gap-1">
              <span className="text-text-secondary text-xs font-medium leading-3">
                {cycleLevelName.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="self-stretch inline-flex justify-start items-center gap-2">
            <div className="flex-1 text-text-primary text-4xl font-bold leading-[48px]">
              {courseName}
            </div>
          </div>

          {/* Teacher */}
          <div className="self-stretch flex flex-col justify-start items-start gap-4">
            <div className="self-stretch inline-flex justify-start items-center gap-2">
              <div className="w-6 h-6 p-1 bg-bg-success-solid rounded-full flex justify-center items-center gap-2">
                <span className="text-center text-text-white text-[10px] font-medium leading-3">
                  {getProfessorInitials()}
                </span>
              </div>
              <div className="flex-1 inline-flex flex-col justify-start items-start gap-0.5">
                <span className="text-text-secondary text-[10px] font-medium leading-3">
                  ASESOR
                </span>
                <span className="self-stretch text-text-secondary text-base font-normal leading-4 line-clamp-1">
                  {getProfessorName()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Video Placeholder */}
        <div className="flex-1 h-[217px] py-14 px-5 bg-bg-tertiary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex flex-col justify-center items-center gap-3 overflow-hidden">
          <div className="p-2 bg-bg-accent-primary-solid rounded-full inline-flex justify-start items-center gap-2">
            <Icon name="play_arrow" size={24} className="text-icon-white" />
          </div>
          <div className="self-stretch flex flex-col justify-center items-center gap-1">
            <div className="self-stretch inline-flex justify-center items-center gap-1">
              <span className="text-center text-text-secondary text-xs font-medium leading-4">
                Video:
              </span>
              <span className="text-center text-text-secondary text-xs font-medium leading-4">
                Curso
              </span>
              <span className="text-center text-text-secondary text-xs font-medium leading-4">
                - Clase introductoria
              </span>
            </div>
            <div className="self-stretch inline-flex justify-center items-center gap-1">
              <span className="text-center text-text-tertiary text-xs font-normal leading-4">
                Profesor(a):
              </span>
              <span className="text-center text-text-tertiary text-xs font-normal leading-4 line-clamp-1">
                {getProfessorName()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          TABS + CONTENT SECTION
          ======================================== */}
      <div className="self-stretch inline-flex flex-col justify-start items-start gap-8">
        {/* Horizontal Pill Tabs */}
        <div className="w-[567px] p-1 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-start gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && setActiveTab(tab.key)}
              className={`flex-1 px-2 py-2.5 rounded-lg flex justify-start items-center gap-2 transition-colors ${
                tab.disabled
                  ? "bg-bg-primary cursor-not-allowed opacity-50"
                  : activeTab === tab.key
                    ? "bg-bg-accent-primary-solid"
                    : "bg-bg-primary hover:bg-bg-secondary"
              }`}
            >
              <div className="flex-1 flex justify-start items-center gap-2">
                <span
                  className={`flex-1 text-center text-[15px] leading-4 whitespace-nowrap ${
                    tab.disabled
                      ? "text-text-disabled"
                      : activeTab === tab.key
                        ? "text-text-white"
                        : "text-text-secondary"
                  }`}
                >
                  {tab.label}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* ========================================
            TAB CONTENT: Ciclo Vigente
            ======================================== */}
        {activeTab === "vigente" && (
          <div className="self-stretch flex flex-col justify-start items-start gap-6 overflow-hidden">
            {/* Section Title */}
            <div className="self-stretch h-7 inline-flex justify-start items-center gap-4">
              <span className="text-text-primary text-2xl font-semibold leading-7">
                Ciclo Vigente {currentCycle?.cycleCode || ""}
              </span>
            </div>

            {/* Evaluation Cards (4-column grid with gap) */}
            {currentCycle && currentCycle.evaluations.length > 0 ? (
              <div className="self-stretch grid grid-cols-3 gap-8">
                {sortEvaluations(currentCycle.evaluations).map((evaluation) => (
                  <EvaluationCard
                    key={evaluation.id}
                    evaluation={evaluation}
                    onSelect={(eval_) =>
                      router.push(
                        `/plataforma/curso/${cursoId}/evaluacion/${eval_.id}`,
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="self-stretch p-12 bg-bg-secondary rounded-2xl border border-stroke-primary flex flex-col items-center justify-center gap-4">
                <Icon
                  name="event_available"
                  size={64}
                  className="text-icon-tertiary"
                />
                <div className="text-center">
                  <p className="text-text-primary font-semibold mb-2">
                    No hay evaluaciones disponibles
                  </p>
                  <p className="text-text-secondary text-sm">
                    Las evaluaciones aparecerán aquí cuando sean creadas
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================
            TAB CONTENT: Ciclos Pasados
            ======================================== */}
        {activeTab === "anteriores" && (
          <div className="self-stretch flex flex-col justify-start items-start gap-6 overflow-hidden">
            {/* Section Title */}
            <div className="self-stretch h-7 inline-flex justify-start items-center gap-4">
              <span className="text-text-primary text-2xl font-semibold leading-7">
                Ciclos Pasados
              </span>
            </div>

            {loadingPrevious ? (
              <div className="self-stretch flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-accent-solid border-t-transparent rounded-full animate-spin" />
              </div>
            ) : previousCycles && previousCycles.cycles.length > 0 ? (
              <div className="self-stretch grid grid-cols-3 gap-8">
                {previousCycles.cycles.map((cycle) => (
                  <PreviousCycleCard
                    key={cycle.cycleCode}
                    cycleCode={cycle.cycleCode}
                    onViewCycle={(code) =>
                      router.push(
                        `/plataforma/curso/${cursoId}/ciclo-anterior/${code}`,
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="self-stretch p-12 bg-white rounded-2xl border border-stroke-primary flex flex-col items-center justify-center gap-4">
                <Icon
                  name="history"
                  size={64}
                  className="text-icon-tertiary"
                />
                <div className="text-center">
                  <p className="text-text-primary font-semibold mb-2">
                    No hay ciclos pasados disponibles
                  </p>
                  <p className="text-text-secondary text-sm">
                    Los ciclos pasados aparecerán aquí cuando estén
                    disponibles
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================
            TAB CONTENT: Banco de Enunciados
            ======================================== */}
        {activeTab === "banco" && (
          <div className="self-stretch flex flex-col justify-start items-start gap-6 overflow-hidden">
            {/* Section Title */}
            <div className="self-stretch h-7 inline-flex justify-start items-center gap-4">
              <span className="text-text-primary text-2xl font-semibold leading-7">
                Banco de Enunciados
              </span>
            </div>

            {loadingBank ? (
              <div className="self-stretch flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-accent-solid border-t-transparent rounded-full animate-spin" />
              </div>
            ) : bankStructure && bankStructure.items.length > 0 ? (
              <div className="self-stretch grid grid-cols-3 gap-8">
                {bankStructure.items.map((item) => (
                  <BancoCategoryCard
                    key={item.evaluationTypeCode}
                    typeCode={item.evaluationTypeCode}
                    typeName={item.evaluationTypeName}
                    onSelect={() =>
                      router.push(
                        `/plataforma/curso/${cursoId}/banco/${item.evaluationTypeCode}`,
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="self-stretch p-12 bg-bg-secondary rounded-2xl border border-stroke-primary flex flex-col items-center justify-center gap-4">
                <Icon
                  name="folder_open"
                  size={64}
                  className="text-icon-tertiary"
                />
                <div className="text-center">
                  <p className="text-text-primary font-semibold mb-2">
                    No hay banco de enunciados disponible
                  </p>
                  <p className="text-text-secondary text-sm">
                    El banco de enunciados aparecerá aquí cuando sea configurado
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
