"use client";

import { useEffect, useState } from "react";
import TeacherEvaluationContent from "@/components/pages/teacher/EvaluationContent";
import StudentEvaluationContent from "@/components/pages/student/EvaluationContent";
import {
  getPreviewView,
  loadAdminPreviewBaseData,
  type AdminPreviewView,
  withPreviewView,
} from "@/components/pages/admin/coursePreviewHelpers";
import Icon from "@/components/ui/Icon";

interface AdminPreviewEvaluationContentProps {
  cursoId: string;
  evalId: string;
  previewView?: string;
}

export default function AdminPreviewEvaluationContent({
  cursoId,
  evalId,
  previewView,
}: AdminPreviewEvaluationContentProps) {
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
        const base = await loadAdminPreviewBaseData(cursoId);
        if (cancelled) return;

        const evaluation = base.currentCycle?.evaluations.find(
          (item) => item.id === evalId,
        );
        setCourseName(base.enrollment.courseCycle.course.name);
        setEvalShortName(evaluation?.shortName || "");
        setEvalFullName(evaluation?.fullName || "");
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo preparar la vista previa de la evaluación.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [cursoId, evalId]);

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

  const backHref = withPreviewView(`/plataforma/curso/${cursoId}`, view);
  const getClassPageUrl = (eventId: string) =>
    withPreviewView(
      `/plataforma/curso/${cursoId}/evaluacion/${evalId}/clase/${eventId}`,
      view,
    );

  const previewData = {
    courseName,
    evalShortName,
    evalFullName,
    backHref,
    backLabel: "Volver al Ciclo Vigente",
    getClassPageUrl,
    manageBreadcrumb: false,
  };

  return view === "advisor" ? (
    <TeacherEvaluationContent
      cursoId={cursoId}
      evalId={evalId}
      previewData={previewData}
    />
  ) : (
    <StudentEvaluationContent
      cursoId={cursoId}
      evalId={evalId}
      previewData={previewData}
    />
  );
}
