'use client';

import { useState } from 'react';
import { classEventService } from '@/services/classEvent.service';
import type { ClassEvent } from '@/types/classEvent';
import Modal from '@/components/ui/Modal';
import FloatingInput from '@/components/ui/FloatingInput';
import DatePicker from '@/components/ui/DatePicker';
import TimePicker from '@/components/ui/TimePicker';
import Icon from '@/components/ui/Icon';
import { useToast } from '@/components/ui/ToastContainer';

interface EditClassModalProps {
  isOpen: boolean;
  event: ClassEvent;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditClassModal({ isOpen, event, onClose, onSaved }: EditClassModalProps) {
  const { showToast } = useToast();
  const start = new Date(event.startDatetime);
  const end = new Date(event.endDatetime);

  const [topic, setTopic] = useState(event.topic);
  const [startDate, setStartDate] = useState(start.toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(start.toTimeString().slice(0, 5));
  const [endDate, setEndDate] = useState(end.toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState(end.toTimeString().slice(0, 5));
  const [meetingUrl, setMeetingUrl] = useState(event.liveMeetingUrl || '');
  const [saving, setSaving] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const hasChanges =
    topic !== event.topic ||
    startDate !== start.toISOString().split('T')[0] ||
    startTime !== start.toTimeString().slice(0, 5) ||
    endDate !== end.toISOString().split('T')[0] ||
    endTime !== end.toTimeString().slice(0, 5) ||
    meetingUrl !== (event.liveMeetingUrl || '');

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscard(true);
    } else {
      onClose();
    }
  };

  const autoTitle = `Clase ${event.sessionNumber} - ${event.evaluationName}`;
  const profNames = event.professors.map((p) => `${p.firstName} ${p.lastName1}`);

  const handleSaveClick = () => {
    if (!hasChanges) { onClose(); return; }
    setShowSaveConfirm(true);
  };

  const handleConfirmSave = async () => {
    if (!topic.trim()) return;
    const startDt = `${startDate}T${startTime}:00`;
    const endDt = `${endDate}T${endTime}:00`;
    if (new Date(endDt) <= new Date(startDt)) {
      showToast({ type: 'error', title: 'Error', description: 'La hora de fin debe ser posterior a la de inicio.' });
      setShowSaveConfirm(false);
      return;
    }
    setSaving(true);
    try {
      await classEventService.updateEvent(event.id, {
        topic: topic.trim(),
        startDatetime: startDt,
        endDatetime: endDt,
        liveMeetingUrl: meetingUrl.trim() || undefined,
      });
      setShowSaveConfirm(false);
      onSaved();
      onClose();
      showToast({ type: 'success', title: 'Evento guardado con éxito', description: 'La clase ha sido guardada correctamente.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', description: err instanceof Error ? err.message : 'No se pudo actualizar.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Clase"
      size="lg"
      footer={
        <>
          <Modal.Button variant="secondary" onClick={handleClose}>Cancelar</Modal.Button>
          <Modal.Button disabled={!topic.trim()} onClick={handleSaveClick}>
            Guardar
          </Modal.Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Curso (disabled) */}
        <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
          <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
            <span className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1">{event.courseName}</span>
            <Icon name="expand_more" size={20} className="text-gray-500" />
          </div>
          <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
            <span className="text-text-tertiary text-xs font-normal leading-4">Curso</span>
          </div>
        </div>

        {/* Evaluación asociada (disabled) */}
        <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
          <div className="self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
            <span className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1">{event.evaluationName}</span>
            <Icon name="expand_more" size={20} className="text-icon-tertiary" />
          </div>
          <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
            <span className="text-text-tertiary text-xs font-normal leading-4">Evaluación asociada</span>
          </div>
        </div>

        {/* Date/Time grid */}
        <div className="self-stretch inline-flex justify-center items-center gap-2">
          <div className="flex-1 inline-flex flex-row gap-4 justify-start items-start">
            <DatePicker value={startDate} onChange={(v) => { setStartDate(v); if (v > endDate) setEndDate(v); }} />
            <TimePicker value={startTime} onChange={setStartTime} />
          </div>
          <Icon name="arrow_forward" size={16} className="text-icon-secondary" />
          <div className="flex-1 inline-flex flex-row gap-4 justify-start items-start">
            <DatePicker value={endDate} onChange={setEndDate} min={startDate} />
            <TimePicker value={endTime} onChange={setEndTime} />
          </div>
        </div>

        {/* Título (disabled, auto-generated) */}
        <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
          <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center">
            <span className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1">{autoTitle}</span>
          </div>
          <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
            <span className="text-text-tertiary text-xs font-normal leading-4">Título de la clase (Autogenerado)</span>
          </div>
        </div>

        {/* Tema */}
        <FloatingInput id="edit-class-topic" label="Tema" value={topic} onChange={setTopic} />

        {/* Enlace */}
        <FloatingInput id="edit-class-url" label="Enlace de la sesión" value={meetingUrl} onChange={setMeetingUrl} />

        {/* Asesor asignado (disabled) */}
        <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
          <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
            <div className="flex-1 flex justify-start items-center gap-1">
              {profNames.length > 0 ? profNames.map((name, i) => (
                <div key={i} className="px-2.5 py-1.5 bg-bg-quartiary rounded-full flex justify-center items-center gap-1">
                  <Icon name="person" size={14} className="text-gray-500" variant="rounded" />
                  <span className="text-text-secondary text-xs font-medium leading-3">{name}</span>
                </div>
              )) : (
                <span className="text-text-tertiary text-base font-normal leading-4">Sin asignar</span>
              )}
            </div>
            <Icon name="person_add_alt" size={16} className="text-gray-500" />
          </div>
          <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
            <span className="text-text-tertiary text-xs font-normal leading-4">Asesor asignado</span>
          </div>
        </div>
      </div>
    </Modal>

      {/* Discard changes confirmation */}
      <Modal
        isOpen={showDiscard}
        onClose={() => setShowDiscard(false)}
        title="¿Descartar los cambios no guardados?"
        size="sm"
        zIndex={60}
        footer={
          <>
            <Modal.Button variant="secondary" onClick={() => setShowDiscard(false)}>Cancelar</Modal.Button>
            <Modal.Button variant="danger" onClick={() => { setShowDiscard(false); onClose(); }}>Descartar</Modal.Button>
          </>
        }
      >
        <p className="text-text-tertiary text-base font-normal leading-4">
          Si cancelas, perderás todos los cambios no guardados en esta clase. ¿Seguro que deseas descartar los cambios?
        </p>
      </Modal>

      {/* Save confirmation */}
      <Modal
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        title="¿Guardar cambios en la clase?"
        size="sm"
        zIndex={60}
        footer={
          <>
            <Modal.Button variant="secondary" onClick={() => { setShowSaveConfirm(false); onClose(); }}>Descartar</Modal.Button>
            <Modal.Button loading={saving} loadingText="Guardando..." onClick={handleConfirmSave}>Guardar</Modal.Button>
          </>
        }
      >
        <p className="text-text-tertiary text-base font-normal leading-4">
          Has modificado algunos datos de la clase. ¿Deseas guardar los cambios realizados?
        </p>
      </Modal>
    </>
  );
}
