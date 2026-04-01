'use client';

import FloatingInput from '@/components/ui/FloatingInput';
import DatePicker from '@/components/ui/DatePicker';
import TimePicker from '@/components/ui/TimePicker';
import Icon from '@/components/ui/Icon';

// ============================================
// Disabled field (floating label style)
// ============================================

export function DisabledField({ label, value }: { label: string; value: string }) {
  return (
    <div className="self-stretch relative inline-flex flex-col justify-start items-start gap-1">
      <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
        <span className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1">{value}</span>
        <Icon name="expand_more" size={20} className="text-gray-500" />
      </div>
      <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
        <span className="text-text-tertiary text-xs font-normal leading-4">{label}</span>
      </div>
    </div>
  );
}

// ============================================
// Date/Time row
// ============================================

export function DateTimeRow({
  startDate, startTime, endDate, endTime,
  onStartDateChange, onStartTimeChange, onEndDateChange, onEndTimeChange,
}: {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  onStartDateChange: (v: string) => void;
  onStartTimeChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onEndTimeChange: (v: string) => void;
}) {
  return (
    <div className="self-stretch inline-flex justify-center items-center gap-2">
      <div className="flex-1 inline-flex flex-row gap-4 justify-start items-start">
        <DatePicker value={startDate} onChange={(v) => { onStartDateChange(v); if (v > endDate) onEndDateChange(v); }} />
        <TimePicker value={startTime} onChange={onStartTimeChange} />
      </div>
      <Icon name="arrow_forward" size={16} className="text-icon-secondary" />
      <div className="flex-1 inline-flex flex-row gap-4 justify-start items-start">
        <DatePicker value={endDate} onChange={onEndDateChange} min={startDate} />
        <TimePicker value={endTime} onChange={onEndTimeChange} />
      </div>
    </div>
  );
}

// ============================================
// Auto-generated title field
// ============================================

export function AutoTitleField({ title }: { title: string }) {
  return (
    <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
      <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center">
        <span className={`flex-1 text-base font-normal leading-4 line-clamp-1 ${title ? 'text-text-primary' : 'text-text-tertiary'}`}>
          {title || 'Título de la clase (Autogenerado)'}
        </span>
      </div>
      {title && (
        <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
          <span className="text-text-tertiary text-xs font-normal leading-4">Título de la clase (Autogenerado)</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// Professor tags field (disabled)
// ============================================

export function ProfessorField({ names }: { names: string[] }) {
  return (
    <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
      <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
        <div className="flex-1 flex justify-start items-center gap-1">
          {names.length > 0 ? names.map((name, i) => (
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
  );
}

// ============================================
// Complete form fields layout
// ============================================

export interface ClassFormFieldsProps {
  courseName: string;
  evaluationName: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  onStartDateChange: (v: string) => void;
  onStartTimeChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onEndTimeChange: (v: string) => void;
  autoTitle: string;
  topic: string;
  onTopicChange: (v: string) => void;
  meetingUrl: string;
  onMeetingUrlChange: (v: string) => void;
  professorNames: string[];
  /** Extra content after title (e.g. schedule alerts) */
  afterTitle?: React.ReactNode;
  /** Custom evaluation field (e.g. dropdown for calendar mode) */
  evaluationField?: React.ReactNode;
  /** Unique prefix for input IDs */
  idPrefix?: string;
}

export default function ClassFormFields({
  courseName,
  evaluationName,
  startDate, startTime, endDate, endTime,
  onStartDateChange, onStartTimeChange, onEndDateChange, onEndTimeChange,
  autoTitle,
  topic, onTopicChange,
  meetingUrl, onMeetingUrlChange,
  professorNames,
  afterTitle,
  evaluationField,
  idPrefix = 'class',
}: ClassFormFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <DisabledField label="Curso" value={courseName} />

      {evaluationField || <DisabledField label="Evaluación asociada" value={evaluationName} />}

      <DateTimeRow
        startDate={startDate} startTime={startTime} endDate={endDate} endTime={endTime}
        onStartDateChange={onStartDateChange} onStartTimeChange={onStartTimeChange}
        onEndDateChange={onEndDateChange} onEndTimeChange={onEndTimeChange}
      />

      <AutoTitleField title={autoTitle} />

      {afterTitle}

      <FloatingInput id={`${idPrefix}-topic`} label="Tema" value={topic} onChange={onTopicChange} />
      <FloatingInput id={`${idPrefix}-url`} label="Enlace de la sesión" value={meetingUrl} onChange={onMeetingUrlChange} />

      <ProfessorField names={professorNames} />
    </div>
  );
}
