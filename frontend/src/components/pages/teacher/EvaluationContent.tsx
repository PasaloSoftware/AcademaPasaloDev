'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { coursesService } from '@/services/courses.service';
import { classEventService } from '@/services/classEvent.service';
import { materialsService } from '@/services/materials.service';
import Icon from '@/components/ui/Icon';
import Modal from '@/components/ui/Modal';
import FloatingInput from '@/components/ui/FloatingInput';
import { useToast } from '@/components/ui/ToastContainer';
import { EvaluationPageContent } from '@/components/pages/student/EvaluationShared';
import MaterialUploadView from '@/components/shared/MaterialUploadView';
import type { MaterialUploadFolder } from '@/components/shared/MaterialUploadView';
import type { Professor } from '@/types/enrollment';

interface EvaluationContentProps {
  cursoId: string;
  evalId: string;
}

// ============================================
// Helpers
// ============================================

function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Lima',
  });
}

function formatTimeForDisplay(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const hourNum = h % 12 || 12;
  const ampm = h >= 12 ? 'pm' : 'am';
  return m === 0 ? `${hourNum}:00${ampm}` : `${hourNum}:${m.toString().padStart(2, '0')}${ampm}`;
}

function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function EvaluationContent({
  cursoId,
  evalId,
}: EvaluationContentProps) {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();

  const [courseName, setCourseName] = useState<string>('');
  const [evalShortName, setEvalShortName] = useState<string>('');
  const [evalFullName, setEvalFullName] = useState<string>('');
  const [professors, setProfessors] = useState<Professor[]>([]);

  // Upload view state
  const [showUploadView, setShowUploadView] = useState(false);
  const [returnToMaterialTab, setReturnToMaterialTab] = useState(false);
  const [uploadFolders, setUploadFolders] = useState<MaterialUploadFolder[]>([]);
  const [preselectedFolderId, setPreselectedFolderId] = useState<string | undefined>();

  // Create class modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nextSessionNumber, setNextSessionNumber] = useState(1);
  const [createStartDate, setCreateStartDate] = useState(getTodayDateStr());
  const [createStartTime, setCreateStartTime] = useState('18:00');
  const [createEndDate, setCreateEndDate] = useState(getTodayDateStr());
  const [createEndTime, setCreateEndTime] = useState('19:00');
  const [createTopic, setCreateTopic] = useState('');
  const [createMeetingUrl, setCreateMeetingUrl] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadCourseData() {
      try {
        const enrollments = await coursesService.getMyCourseCycles();
        const found = enrollments.find((e) => e.courseCycle.id === cursoId);
        if (found) {
          setCourseName(found.courseCycle.course.name);
          setProfessors(found.courseCycle.professors || []);
        }
      } catch (err) {
        console.error('Error al cargar nombre del curso:', err);
      }
    }

    async function loadEvalNames() {
      try {
        const data = await coursesService.getCourseContent(cursoId);
        const eval_ = data.evaluations.find((e) => e.id === evalId);
        if (eval_) {
          setEvalShortName(eval_.shortName);
          setEvalFullName(eval_.fullName);
        }
      } catch (err) {
        console.error('Error al cargar datos de evaluación:', err);
      }
    }

    loadCourseData();
    loadEvalNames();
  }, [cursoId, evalId]);

  useEffect(() => {
    if (!courseName) return;
    setBreadcrumbItems([
      { label: 'Cursos' },
      { label: courseName, href: `/plataforma/curso/${cursoId}` },
      { label: 'Ciclo Vigente', href: `/plataforma/curso/${cursoId}` },
      { label: evalShortName },
    ]);
  }, [setBreadcrumbItems, courseName, evalShortName, cursoId]);

  const handleEvalNameDetected = useCallback((name: string) => {
    if (!evalShortName) setEvalShortName(name);
  }, [evalShortName]);

  const getClassPageUrl = useCallback(
    (eventId: string) =>
      `/plataforma/curso/${cursoId}/evaluacion/${evalId}/clase/${eventId}`,
    [cursoId, evalId],
  );

  const openUploadView = useCallback(async (folderId?: string) => {
    try {
      const rootFolders = await materialsService.getRootFolders(evalId);
      const matAdicional = rootFolders.find((f) => f.name.toLowerCase().includes('adicional'));
      if (matAdicional) {
        const contents = await materialsService.getFolderContents(matAdicional.id);
        setUploadFolders(contents.folders.map((f) => ({ id: f.id, name: f.name })));
      } else {
        setUploadFolders(rootFolders.map((f) => ({ id: f.id, name: f.name })));
      }
    } catch {
      setUploadFolders([]);
    }
    setPreselectedFolderId(folderId);
    setReturnToMaterialTab(true);
    setShowUploadView(true);
  }, [evalId]);

  // ---- Create Class ----

  const openCreateModal = useCallback(async () => {
    try {
      const events = await classEventService.getEvaluationEvents(evalId);
      setNextSessionNumber(events.length + 1);
    } catch {
      setNextSessionNumber(1);
    }
    setCreateStartDate(getTodayDateStr());
    setCreateStartTime('18:00');
    setCreateEndDate(getTodayDateStr());
    setCreateEndTime('19:00');
    setCreateTopic('');
    setCreateMeetingUrl('');
    setShowCreateModal(true);
  }, [evalId]);

  const autoTitle = `Clase ${nextSessionNumber} - ${evalShortName}`;

  const canSubmitCreate =
    createTopic.trim().length > 0 &&
    createMeetingUrl.trim().length > 0 &&
    createStartDate && createStartTime &&
    createEndDate && createEndTime;

  const handleCreateSubmit = useCallback(async () => {
    if (!canSubmitCreate) return;

    const startDatetime = `${createStartDate}T${createStartTime}:00`;
    const endDatetime = `${createEndDate}T${createEndTime}:00`;

    if (new Date(endDatetime) <= new Date(startDatetime)) {
      showToast({ type: 'error', title: 'Error', description: 'La hora de fin debe ser posterior a la hora de inicio.' });
      return;
    }

    setCreateSubmitting(true);
    try {
      await classEventService.createEvent({
        evaluationId: evalId,
        sessionNumber: nextSessionNumber,
        title: autoTitle,
        topic: createTopic.trim(),
        startDatetime,
        endDatetime,
        liveMeetingUrl: createMeetingUrl.trim(),
      });
      setShowCreateModal(false);
      setRefreshKey((k) => k + 1);
      showToast({ type: 'success', title: 'Clase creada', description: `${autoTitle} ha sido programada correctamente.` });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error al crear clase',
        description: err instanceof Error ? err.message : 'No se pudo crear la clase.',
      });
    } finally {
      setCreateSubmitting(false);
    }
  }, [canSubmitCreate, createStartDate, createStartTime, createEndDate, createEndTime, evalId, nextSessionNumber, autoTitle, createTopic, createMeetingUrl, showToast]);

  // ---- Upload View ----
  if (showUploadView) {
    return (
      <MaterialUploadView
        folders={uploadFolders}
        defaultFolderId={preselectedFolderId}
        backLabel={`Volver a ${evalShortName}`}
        successDescription={`El material ha sido subido en ${evalShortName}.`}
        onClose={() => setShowUploadView(false)}
        onSuccess={() => router.refresh()}
      />
    );
  }

  // ---- Normal View ----
  return (
    <div className="w-full inline-flex flex-col justify-start items-start overflow-hidden">
      {/* Back Link */}
      <Link
        href={`/plataforma/curso/${cursoId}`}
        className="p-1 rounded-lg hover:bg-bg-secondary transition-colors inline-flex justify-center items-center gap-2 mb-6"
      >
        <Icon name="arrow_back" size={20} className="text-icon-accent-primary" />
        <span className="text-text-accent-primary text-base font-medium leading-4">
          Volver al Ciclo Vigente
        </span>
      </Link>

      {/* Banner */}
      <div
        className="self-stretch px-10 py-8 relative rounded-xl inline-flex flex-col justify-center items-start gap-2 overflow-hidden mb-8"
        style={{
          background:
            'linear-gradient(to right, var(--muted-indigo-800), var(--muted-indigo-700), var(--muted-indigo-200))',
        }}
      >
        <div className="w-40 h-40 absolute right-[-36px] top-[-12px] overflow-hidden">
          <Icon name="school" size={160} className="text-muted-indigo-700" />
        </div>
        <div className="self-stretch flex flex-col justify-center items-start gap-0.5">
          <span className="self-stretch text-text-white text-3xl font-semibold leading-10">
            {evalShortName}
          </span>
          {evalFullName && (
            <span className="self-stretch text-text-white text-sm font-normal leading-4">
              {evalFullName.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Tabs + Content (shared) */}
      <EvaluationPageContent
        key={refreshKey}
        evalId={evalId}
        getClassPageUrl={getClassPageUrl}
        onEvalNameDetected={handleEvalNameDetected}
        canUploadMaterials
        onUploadMaterial={openUploadView}
        canCreateClass
        onCreateClass={openCreateModal}
        defaultTab={returnToMaterialTab ? 'material' : 'sesiones'}
      />

      {/* Create Class Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nueva Clase"
        size="lg"
        footer={
          <>
            <Modal.Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Modal.Button>
            <Modal.Button
              disabled={!canSubmitCreate}
              loading={createSubmitting}
              loadingText="Creando..."
              onClick={handleCreateSubmit}
            >
              Guardar
            </Modal.Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Curso (disabled) */}
          <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
            <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
              <span className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1">
                {courseName}
              </span>
              <Icon name="expand_more" size={20} className="text-icon-disabled" />
            </div>
            <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
              <span className="text-text-tertiary text-xs font-normal leading-4">Curso</span>
            </div>
          </div>

          {/* Evaluación asociada (disabled) */}
          <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
            <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
              <span className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1">
                {evalFullName || evalShortName}
              </span>
              <Icon name="expand_more" size={20} className="text-icon-disabled" />
            </div>
            <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
              <span className="text-text-tertiary text-xs font-normal leading-4">Evaluación asociada</span>
            </div>
          </div>

          {/* Date/Time grid */}
          <div className="self-stretch inline-flex justify-center items-center gap-2">
            {/* Start column */}
            <div className="flex-1 inline-flex flex-row justify-start items-start gap-4">
              <div className="self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center cursor-pointer relative">
                <span className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1">
                  {createStartDate ? formatDateForDisplay(createStartDate) : 'Fecha'}
                </span>
                <input
                  type="date"
                  value={createStartDate}
                  onChange={(e) => {
                    setCreateStartDate(e.target.value);
                    if (!createEndDate || e.target.value > createEndDate) setCreateEndDate(e.target.value);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <div className="self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center cursor-pointer relative">
                <span className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1">
                  {createStartTime ? formatTimeForDisplay(createStartTime) : 'Hora'}
                </span>
                <input
                  type="time"
                  value={createStartTime}
                  onChange={(e) => setCreateStartTime(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Arrow */}
            <Icon name="arrow_forward" size={16} className="text-icon-secondary" />

            {/* End column */}
            <div className="flex-1 inline-flex flex-row justify-start items-start gap-4">
              <div className="self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center cursor-pointer relative">
                <span className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1">
                  {createEndDate ? formatDateForDisplay(createEndDate) : 'Fecha'}
                </span>
                <input
                  type="date"
                  value={createEndDate}
                  min={createStartDate}
                  onChange={(e) => setCreateEndDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <div className="self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center cursor-pointer relative">
                <span className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1">
                  {createEndTime ? formatTimeForDisplay(createEndTime) : 'Hora'}
                </span>
                <input
                  type="time"
                  value={createEndTime}
                  onChange={(e) => setCreateEndTime(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Título (disabled, auto-generated) */}
          <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
            <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center">
              <span className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1">
                {autoTitle}
              </span>
            </div>
            <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
              <span className="text-text-tertiary text-xs font-normal leading-4">Título de la clase (Autogenerado)</span>
            </div>
          </div>

          {/* Tema */}
          <FloatingInput
            id="create-class-topic"
            label="Tema"
            value={createTopic}
            onChange={setCreateTopic}
          />

          {/* Enlace de la sesión */}
          <FloatingInput
            id="create-class-url"
            label="Enlace de la sesión"
            value={createMeetingUrl}
            onChange={setCreateMeetingUrl}
          />

          {/* Asesor asignado (disabled) */}
          <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
            <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
              <div className="flex-1 flex justify-start items-center gap-1">
                {professors.length > 0 ? (
                  professors.map((prof) => (
                    <div
                      key={prof.id}
                      className="px-2.5 py-1.5 bg-bg-quartiary rounded-full flex justify-center items-center gap-1"
                    >
                      <Icon name="person" size={14} className="text-icon-disabled" variant="rounded" />
                      <span className="text-text-secondary text-xs font-medium leading-3">
                        {prof.firstName} {prof.lastName1}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-text-tertiary text-base font-normal leading-4">Sin asignar</span>
                )}
              </div>
              <Icon name="expand_more" size={16} className="text-icon-disabled" />
            </div>
            <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
              <span className="text-text-tertiary text-xs font-normal leading-4">Asesor asignado</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
