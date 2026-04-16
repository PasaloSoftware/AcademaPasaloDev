"use client";

import { useEffect, useState } from "react";
import TeacherPreviousCycleEvaluationContent from "@/components/pages/teacher/PreviousCycleEvaluationContent";
import StudentPreviousCycleEvaluationContent from "@/components/pages/student/PreviousCycleEvaluationContent";
import {
  getPreviewView,
  loadAdminPreviewBaseData,
  type AdminPreviewView,
  withPreviewView,
} from "@/components/pages/admin/coursePreviewHelpers";
import Icon from "@/components/ui/Icon";
import { coursesService } from "@/services/courses.service";

interface AdminPreviewPreviousCycleEvaluationContentProps {
  cursoId: string;
  cycleCode: string;
  evalId: string;
  previewView?: string;
}

export default function AdminPreviewPreviousCycleEvaluationContent({
  cursoId,
  cycleCode,
  evalId,
  previewView,
}: AdminPreviewPreviousCycleEvaluationContentProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<AdminPreviewView>(
    getPreviewView(previewView),
  );
  const [courseName, setCourseName] = useState("");
  const [evalShortName, setEvalShortName] = useState("");
  const [evalFullName, setEvalFullName] = useState("");

  useEffect(() => {
    setView(getPreviewView(previewView));
  }, [previewView]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [base, previousCycle] = await Promise.all([
          loadAdminPreviewBaseData(cursoId),
          coursesService.getPreviousCycleContent(cursoId, cycleCode),
        ]);
        if (cancelled) return;

        const evaluation =
          previousCycle.evaluations.find((item) => item.id === evalId) || null;

        setCourseName(base.enrollment.courseCycle.course.name);
        setEvalShortName(evaluation?.shortName || "");
        setEvalFullName(evaluation?.fullName || "");
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo preparar la vista previa de la evaluacion.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [cursoId, cycleCode, evalId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="w-10 h-10 border-4 border-accent-solid border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-stroke-primary p-12 text-center">
        <Icon
          name="error"
          size={64}
          className="text-error-solid mb-4 mx-auto"
        />
        <h2 className="text-2xl font-bold text-primary mb-2">{error}</h2>
      </div>
    );
  }

  const previousCycleHref = withPreviewView(
    `/plataforma/curso/${cursoId}/ciclo-anterior/${cycleCode}`,
    view,
  );
  const previewData = {
    courseName,
    evalShortName,
    evalFullName,
    backHref: previousCycleHref,
    backLabel: `Volver al ciclo ${cycleCode}`,
    getClassPageUrl: (eventId: string) =>
      withPreviewView(
        `/plataforma/curso/${cursoId}/ciclo-anterior/${cycleCode}/evaluacion/${evalId}/clase/${eventId}`,
        view,
      ),
    manageBreadcrumb: false,
  };

  return view === "advisor" ? (
    <TeacherPreviousCycleEvaluationContent
      cursoId={cursoId}
      cycleCode={cycleCode}
      evalId={evalId}
      previewData={previewData}
    />
  ) : (
    <StudentPreviousCycleEvaluationContent
      cursoId={cursoId}
      cycleCode={cycleCode}
      evalId={evalId}
      previewData={previewData}
    />
  );
}
