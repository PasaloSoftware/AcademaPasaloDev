"use client";

import { useEffect, useState } from "react";
import TeacherVideoPageContent from "@/components/pages/teacher/VideoPageContent";
import StudentVideoPageContent from "@/components/pages/student/VideoPageContent";
import {
  getPreviewView,
  loadAdminPreviewBaseData,
  type AdminPreviewView,
  withPreviewView,
} from "@/components/pages/admin/coursePreviewHelpers";
import Icon from "@/components/ui/Icon";
import { coursesService } from "@/services/courses.service";

interface AdminPreviewVideoPageContentProps {
  cursoId: string;
  evalId: string;
  eventId: string;
  cycleCode?: string;
  previewView?: string;
}

export default function AdminPreviewVideoPageContent({
  cursoId,
  evalId,
  eventId,
  cycleCode,
  previewView,
}: AdminPreviewVideoPageContentProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<AdminPreviewView>(
    getPreviewView(previewView),
  );
  const [courseName, setCourseName] = useState("");
  const [evalShortName, setEvalShortName] = useState("");

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
        const cycleContent = cycleCode
          ? await coursesService.getPreviousCycleContent(cursoId, cycleCode)
          : null;
        if (cancelled) return;

        const evaluation = cycleCode
          ? cycleContent?.evaluations.find((item) => item.id === evalId) || null
          : base.currentCycle?.evaluations.find((item) => item.id === evalId) ||
            null;

        setCourseName(base.enrollment.courseCycle.course.name);
        setEvalShortName(
          evaluation?.shortName || evaluation?.fullName || "Evaluacion",
        );
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo preparar la vista previa de la clase.",
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

  const evaluationPath = cycleCode
    ? `/plataforma/curso/${cursoId}/ciclo-anterior/${cycleCode}/evaluacion/${evalId}`
    : `/plataforma/curso/${cursoId}/evaluacion/${evalId}`;
  const courseHref = withPreviewView(`/plataforma/curso/${cursoId}`, view);
  const cycleHref = cycleCode
    ? withPreviewView(
        `/plataforma/curso/${cursoId}/ciclo-anterior/${cycleCode}`,
        view,
      )
    : courseHref;
  const previewData = {
    courseName,
    evalShortName,
    evaluationPath: withPreviewView(evaluationPath, view),
    courseHref,
    cycleHref,
    cycleLabel: cycleCode ? `Ciclo ${cycleCode}` : "Ciclo Vigente",
  };

  return view === "advisor" ? (
    <TeacherVideoPageContent
      cursoId={cursoId}
      evalId={evalId}
      eventId={eventId}
      cycleCode={cycleCode}
      previewData={previewData}
    />
  ) : (
    <StudentVideoPageContent
      cursoId={cursoId}
      evalId={evalId}
      eventId={eventId}
      cycleCode={cycleCode}
      previewData={previewData}
    />
  );
}
