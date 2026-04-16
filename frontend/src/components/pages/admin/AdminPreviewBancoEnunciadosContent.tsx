"use client";

import { useEffect, useState } from "react";
import TeacherBancoEnunciadosContent from "@/components/pages/teacher/BancoEnunciadosContent";
import StudentBancoEnunciadosContent from "@/components/pages/student/BancoEnunciadosContent";
import {
  getPreviewView,
  loadAdminPreviewBaseData,
  type AdminPreviewView,
  withPreviewView,
} from "@/components/pages/admin/coursePreviewHelpers";
import Icon from "@/components/ui/Icon";

interface AdminPreviewBancoEnunciadosContentProps {
  cursoId: string;
  typeCode: string;
  previewView?: string;
}

export default function AdminPreviewBancoEnunciadosContent({
  cursoId,
  typeCode,
  previewView,
}: AdminPreviewBancoEnunciadosContentProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<AdminPreviewView>(
    getPreviewView(previewView),
  );
  const [courseName, setCourseName] = useState("");

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
        setCourseName(base.enrollment.courseCycle.course.name);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo preparar la vista previa del banco.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [cursoId]);

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

  const previewData = {
    courseName,
    backHref: withPreviewView(`/plataforma/curso/${cursoId}`, view),
    manageBreadcrumb: false,
  };

  return view === "advisor" ? (
    <TeacherBancoEnunciadosContent
      cursoId={cursoId}
      typeCode={typeCode}
      previewData={previewData}
    />
  ) : (
    <StudentBancoEnunciadosContent
      cursoId={cursoId}
      typeCode={typeCode}
      previewData={previewData}
    />
  );
}
