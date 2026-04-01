'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { coursesService } from '@/services/courses.service';
import { classEventService } from '@/services/classEvent.service';
import { materialsService } from '@/services/materials.service';
import type { ClassEvent } from '@/types/classEvent';
import Icon from '@/components/ui/Icon';
import Modal from '@/components/ui/Modal';
import FloatingInput from '@/components/ui/FloatingInput';
import DatePicker from '@/components/ui/DatePicker';
import TimePicker from '@/components/ui/TimePicker';
import { useToast } from '@/components/ui/ToastContainer';
import { EvaluationPageContent, formatDate, formatSingleTime } from '@/components/pages/student/EvaluationShared';
import type { SessionMenuAction } from '@/components/pages/student/EvaluationShared';
import MaterialUploadView from '@/components/shared/MaterialUploadView';
import type { MaterialUploadFolder } from '@/components/shared/MaterialUploadView';
import type { MaterialAction } from '@/components/shared/ExpandableFolderList';
import type { FolderMaterial } from '@/types/material';
import type { Professor } from '@/types/enrollment';

interface EvaluationContentProps {
  cursoId: string;
  evalId: string;
}

// ============================================
// Helpers
// ============================================

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

  // ---- Session menu actions (teacher) ----

  const [editEvent, setEditEvent] = useState<ClassEvent | null>(null);
  const [editTopic, setEditTopic] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteEvent, setDeleteEvent] = useState<ClassEvent | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const handleSessionMenuAction = useCallback(async (eventId: string, action: SessionMenuAction) => {
    // Fetch fresh event data
    let ev: ClassEvent;
    try {
      ev = await classEventService.getEventDetail(eventId);
    } catch {
      showToast({ type: 'error', title: 'Error', description: 'No se pudo cargar la información de la clase.' });
      return;
    }

    if (action === 'edit') {
      setEditEvent(ev);
      setEditTopic(ev.topic);
      setEditUrl(ev.liveMeetingUrl || '');
      const start = new Date(ev.startDatetime);
      const end = new Date(ev.endDatetime);
      setEditStartDate(start.toISOString().split('T')[0]);
      setEditStartTime(start.toTimeString().slice(0, 5));
      setEditEndDate(end.toISOString().split('T')[0]);
      setEditEndTime(end.toTimeString().slice(0, 5));
    }

    if (action === 'duplicate') {
      try {
        const events = await classEventService.getEvaluationEvents(evalId);
        const newNum = events.length + 1;
        await classEventService.createEvent({
          evaluationId: evalId,
          sessionNumber: newNum,
          title: `Clase ${newNum} - ${evalShortName}`,
          topic: ev.topic,
          startDatetime: ev.startDatetime,
          endDatetime: ev.endDatetime,
          liveMeetingUrl: ev.liveMeetingUrl || '',
        });
        setRefreshKey((k) => k + 1);
        showToast({ type: 'success', title: 'Clase duplicada', description: `Clase ${newNum} - ${evalShortName} ha sido creada.` });
      } catch (err) {
        showToast({ type: 'error', title: 'Error', description: err instanceof Error ? err.message : 'No se pudo duplicar la clase.' });
      }
    }

    if (action === 'copy-summary') {
      const start = new Date(ev.startDatetime);
      const end = new Date(ev.endDatetime);
      const dayStr = start.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'America/Lima' });
      const dayCapitalized = dayStr.charAt(0).toUpperCase() + dayStr.slice(1);
      const startTimeStr = formatSingleTime(start, true).toUpperCase();
      const endTimeStr = formatSingleTime(end, true).toUpperCase();
      const profNames = ev.professors.map((p) => `${p.firstName} ${p.lastName1}`).join(', ') || 'Sin asignar';

      const summary = [
        `▶️ CLASE ${ev.sessionNumber} - ${evalShortName}`,
        `Curso: ${courseName}`,
        `📒 Tema: ${ev.topic}`,
        `🎙️ Asesor(a): ${profNames}`,
        `🗓 Fecha: ${dayCapitalized}`,
        `⏰ Hora: ${startTimeStr} - ${endTimeStr}`,
        `🔗 Enlace: ${ev.liveMeetingUrl || 'No disponible'}`,
      ].join('\n');

      try {
        await navigator.clipboard.writeText(summary);
        showToast({ type: 'success', title: 'Copiado', description: 'El resumen ha sido copiado al portapapeles.' });
      } catch {
        showToast({ type: 'error', title: 'Error', description: 'No se pudo copiar al portapapeles.' });
      }
    }

    if (action === 'delete') {
      setDeleteEvent(ev);
    }
  }, [evalId, evalShortName, courseName, showToast]);

  const handleEditSubmit = useCallback(async () => {
    if (!editEvent || !editTopic.trim()) return;
    setEditSubmitting(true);
    try {
      const startDatetime = `${editStartDate}T${editStartTime}:00`;
      const endDatetime = `${editEndDate}T${editEndTime}:00`;
      if (new Date(endDatetime) <= new Date(startDatetime)) {
        showToast({ type: 'error', title: 'Error', description: 'La hora de fin debe ser posterior a la hora de inicio.' });
        setEditSubmitting(false);
        return;
      }
      await classEventService.updateEvent(editEvent.id, {
        topic: editTopic.trim(),
        liveMeetingUrl: editUrl.trim() || undefined,
        startDatetime,
        endDatetime,
      });
      setEditEvent(null);
      setRefreshKey((k) => k + 1);
      showToast({ type: 'success', title: 'Clase actualizada', description: 'Los cambios han sido guardados.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', description: err instanceof Error ? err.message : 'No se pudo actualizar la clase.' });
    } finally {
      setEditSubmitting(false);
    }
  }, [editEvent, editTopic, editUrl, editStartDate, editStartTime, editEndDate, editEndTime, showToast]);

  const handleDeleteSubmit = useCallback(async () => {
    if (!deleteEvent) return;
    setDeleteSubmitting(true);
    try {
      await classEventService.cancelEvent(deleteEvent.id);
      setDeleteEvent(null);
      setRefreshKey((k) => k + 1);
      showToast({ type: 'success', title: 'Clase eliminada', description: 'La clase ha sido cancelada correctamente.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', description: err instanceof Error ? err.message : 'No se pudo eliminar la clase.' });
    } finally {
      setDeleteSubmitting(false);
    }
  }, [deleteEvent, showToast]);

  // ---- Material menu actions (teacher) ----

  const [infoMat, setInfoMat] = useState<FolderMaterial | null>(null);
  const [renameMat, setRenameMat] = useState<FolderMaterial | null>(null);
  const [renameMatValue, setRenameMatValue] = useState('');
  const [renameMatLoading, setRenameMatLoading] = useState(false);
  const [deleteMat, setDeleteMat] = useState<FolderMaterial | null>(null);
  const [deleteMatLoading, setDeleteMatLoading] = useState(false);

  const handleMaterialMenuAction = useCallback((material: FolderMaterial, action: MaterialAction) => {
    if (action === 'open') {
      // Preview handled by ExpandableFolderList onPreviewMaterial
      return;
    }
    if (action === 'rename') {
      setRenameMat(material);
      const dotIdx = material.displayName.lastIndexOf('.');
      setRenameMatValue(dotIdx > 0 ? material.displayName.substring(0, dotIdx) : material.displayName);
    }
    if (action === 'download') {
      materialsService.downloadMaterial(material.id, material.displayName);
    }
    if (action === 'info') {
      setInfoMat(material);
    }
    if (action === 'delete') {
      setDeleteMat(material);
    }
  }, []);

  const handleRenameMatSubmit = useCallback(async () => {
    if (!renameMat || !renameMatValue.trim()) return;
    setRenameMatLoading(true);
    try {
      const ext = renameMat.displayName.lastIndexOf('.') > 0
        ? renameMat.displayName.substring(renameMat.displayName.lastIndexOf('.'))
        : '';
      await materialsService.renameDisplayName(renameMat.id, renameMatValue.trim() + ext);
      setRenameMat(null);
      setRefreshKey((k) => k + 1);
      showToast({ type: 'success', title: 'Nombre actualizado', description: 'El material ha sido renombrado.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', description: err instanceof Error ? err.message : 'No se pudo renombrar.' });
    } finally {
      setRenameMatLoading(false);
    }
  }, [renameMat, renameMatValue, showToast]);

  const handleDeleteMatSubmit = useCallback(async () => {
    if (!deleteMat) return;
    setDeleteMatLoading(true);
    try {
      await materialsService.requestDeletion(deleteMat.id, 'Eliminado por docente');
      setDeleteMat(null);
      setRefreshKey((k) => k + 1);
      showToast({ type: 'success', title: 'Solicitud enviada', description: 'El material se ocultará hasta aprobación.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', description: err instanceof Error ? err.message : 'No se pudo eliminar.' });
    } finally {
      setDeleteMatLoading(false);
    }
  }, [deleteMat, showToast]);

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
    <div className="w-full inline-flex flex-col justify-start items-start">
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
        onSessionMenuAction={handleSessionMenuAction}
        onMaterialMenuAction={handleMaterialMenuAction}
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
              <DatePicker
                value={createStartDate}
                onChange={(v) => {
                  setCreateStartDate(v);
                  if (!createEndDate || v > createEndDate) setCreateEndDate(v);
                }}
              />
              <TimePicker
                value={createStartTime}
                onChange={setCreateStartTime}
              />
            </div>

            {/* Arrow */}
            <Icon name="arrow_forward" size={16} className="text-icon-secondary" />

            {/* End column */}
            <div className="flex-1 inline-flex flex-row justify-start items-start gap-4">
              <DatePicker
                value={createEndDate}
                onChange={setCreateEndDate}
                min={createStartDate}
              />
              <TimePicker
                value={createEndTime}
                onChange={setCreateEndTime}
              />
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

      {/* Edit Class Modal */}
      <Modal
        isOpen={!!editEvent}
        onClose={() => setEditEvent(null)}
        title="Editar Clase"
        size="lg"
        footer={
          <>
            <Modal.Button variant="secondary" onClick={() => setEditEvent(null)}>
              Cancelar
            </Modal.Button>
            <Modal.Button
              disabled={!editTopic.trim()}
              loading={editSubmitting}
              loadingText="Guardando..."
              onClick={handleEditSubmit}
            >
              Guardar
            </Modal.Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Date/Time grid */}
          <div className="self-stretch inline-flex justify-center items-center gap-2">
            <div className="flex-1 inline-flex flex-row gap-4 justify-start items-start">
              <DatePicker value={editStartDate} onChange={(v) => { setEditStartDate(v); if (v > editEndDate) setEditEndDate(v); }} />
              <TimePicker value={editStartTime} onChange={setEditStartTime} />
            </div>
            <Icon name="arrow_forward" size={16} className="text-icon-secondary" />
            <div className="flex-1 inline-flex flex-row gap-4 justify-start items-start">
              <DatePicker value={editEndDate} onChange={setEditEndDate} min={editStartDate} />
              <TimePicker value={editEndTime} onChange={setEditEndTime} />
            </div>
          </div>

          <FloatingInput id="edit-class-topic" label="Tema" value={editTopic} onChange={setEditTopic} />
          <FloatingInput id="edit-class-url" label="Enlace de la sesión" value={editUrl} onChange={setEditUrl} />
        </div>
      </Modal>

      {/* Delete Class Modal */}
      <Modal
        isOpen={!!deleteEvent}
        onClose={() => setDeleteEvent(null)}
        title="¿Eliminar esta clase?"
        size="sm"
        footer={
          <>
            <Modal.Button variant="secondary" onClick={() => setDeleteEvent(null)}>
              Cancelar
            </Modal.Button>
            <Modal.Button
              variant="danger"
              loading={deleteSubmitting}
              loadingText="Eliminando..."
              onClick={handleDeleteSubmit}
            >
              Eliminar
            </Modal.Button>
          </>
        }
      >
        <p className="text-text-tertiary text-base font-normal leading-5">
          ¿Estás seguro de que deseas eliminar <strong>Clase {deleteEvent?.sessionNumber}: {deleteEvent?.topic}</strong>? Esta acción no se puede deshacer.
        </p>
      </Modal>

      {/* Rename Material Modal */}
      <Modal
        isOpen={!!renameMat}
        onClose={() => setRenameMat(null)}
        title="Cambiar nombre"
        footer={
          <>
            <Modal.Button variant="secondary" onClick={() => setRenameMat(null)}>Cancelar</Modal.Button>
            <Modal.Button disabled={!renameMatValue.trim()} loading={renameMatLoading} loadingText="Guardando..." onClick={handleRenameMatSubmit}>Guardar</Modal.Button>
          </>
        }
      >
        <FloatingInput id="rename-material" label="Nombre" value={renameMatValue} onChange={setRenameMatValue} />
      </Modal>

      {/* Delete Material Modal */}
      <Modal
        isOpen={!!deleteMat}
        onClose={() => setDeleteMat(null)}
        title="¿Eliminar este material?"
        size="sm"
        footer={
          <>
            <Modal.Button variant="secondary" onClick={() => setDeleteMat(null)}>Cancelar</Modal.Button>
            <Modal.Button variant="danger" loading={deleteMatLoading} loadingText="Eliminando..." onClick={handleDeleteMatSubmit}>Eliminar</Modal.Button>
          </>
        }
      >
        <p className="text-text-tertiary text-base font-normal leading-5">
          La solicitud de eliminación será enviada a los administradores y el material se ocultará hasta que sea aprobada.
        </p>
      </Modal>

      {/* Material Info Modal */}
      {infoMat && (
        <Modal
          isOpen
          onClose={() => setInfoMat(null)}
          title="Información del material"
          size="sm"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-text-secondary text-xs font-medium leading-4">Nombre</span>
              <span className="text-text-tertiary text-base font-normal leading-4">
                {infoMat.displayName.lastIndexOf('.') > 0
                  ? infoMat.displayName.substring(0, infoMat.displayName.lastIndexOf('.'))
                  : infoMat.displayName}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-text-secondary text-xs font-medium leading-4">Tipo</span>
              <span className="text-text-tertiary text-base font-normal leading-4">
                {(infoMat.displayName.split('.').pop() || 'Desconocido').toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-text-secondary text-xs font-medium leading-4">Subido</span>
              <span className="text-text-tertiary text-base font-normal leading-4">
                {new Date(infoMat.createdAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' })}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
