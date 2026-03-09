import Icon from "../ui/Icon";

export interface TeacherInfo {
  initials: string;
  name: string;
  avatarColor?: string;
  photoUrl?: string;
}

export interface CourseCardProps {
  headerColor: string;
  category: string;
  cycle: string;
  title: string;
  teachers: TeacherInfo[];
  onViewCourse?: () => void;
  variant?: 'grid' | 'list';
}

// ============================================
// Avatares de profesores (compartido por ambas vistas)
// ============================================

function TeacherAvatars({ teachers }: { teachers: TeacherInfo[] }) {
  if (teachers.length === 0) return null;

  if (teachers.length === 1) {
    const t = teachers[0];
    return t.photoUrl ? (
      <img
        className="w-8 h-8 rounded-full object-cover"
        src={t.photoUrl}
        alt={t.name}
      />
    ) : (
      <div
        className="w-8 h-8 p-1 rounded-full inline-flex justify-center items-center"
        style={{ backgroundColor: t.avatarColor || '#198754' }}
      >
        <span className="text-center text-text-white text-[10px] font-medium leading-3">
          {t.initials}
        </span>
      </div>
    );
  }

  // 2+ profesores: avatares superpuestos
  return (
    <div className="w-14 h-8 relative">
      {/* Segundo avatar (derecha, atrás) */}
      {teachers[1].photoUrl ? (
        <img
          className="w-8 h-8 absolute left-7 top-0 rounded-full object-cover"
          src={teachers[1].photoUrl}
          alt={teachers[1].name}
        />
      ) : (
        <div
          className="w-8 h-8 p-1 absolute left-7 top-0 rounded-full inline-flex justify-center items-center"
          style={{ backgroundColor: teachers[1].avatarColor || '#3b82f6' }}
        >
          <span className="text-center text-text-white text-[10px] font-medium leading-3">
            {teachers[1].initials}
          </span>
        </div>
      )}
      {/* Primer avatar (izquierda, adelante con borde blanco) */}
      {teachers[0].photoUrl ? (
        <img
          className="w-8 h-8 absolute left-0 top-0 rounded-full object-cover outline outline-2 outline-stroke-white"
          src={teachers[0].photoUrl}
          alt={teachers[0].name}
        />
      ) : (
        <div
          className="w-8 h-8 p-1 absolute left-0 top-0 rounded-full outline outline-2 outline-stroke-white inline-flex justify-center items-center"
          style={{ backgroundColor: teachers[0].avatarColor || '#198754' }}
        >
          <span className="text-center text-text-white text-[10px] font-medium leading-3">
            {teachers[0].initials}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================
// Componente principal
// ============================================

export default function CourseCard({
  headerColor,
  category,
  cycle,
  title,
  teachers,
  onViewCourse,
  variant = 'grid',
}: CourseCardProps) {
  const teacherNames = teachers.length > 0
    ? `Docente: ${teachers.map((t) => t.name).join(' & ')}`
    : 'Sin asignar';

  // ========== Vista Lista ==========
  if (variant === 'list') {
    return (
      <div className="self-stretch bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center">
        {/* Banda lateral */}
        <div
          className="w-10 self-stretch rounded-tl-xl rounded-bl-xl"
          style={{ backgroundColor: headerColor }}
        />

        {/* Contenido */}
        <div className="flex-1 p-4 flex justify-start items-center gap-5">
          {/* Info + Docente */}
          <div className="flex-1 inline-flex flex-col justify-start items-end gap-2">
            {/* Tags + Título */}
            <div className="self-stretch flex flex-col justify-start items-start gap-2">
              <div className="self-stretch inline-flex justify-start items-center gap-1.5">
                <span className="px-2 py-1 bg-bg-success-light rounded-full text-text-success-primary text-[10px] font-medium leading-3">
                  {category}
                </span>
                <span className="px-2 py-1 bg-bg-quartiary rounded-full text-text-secondary text-[10px] font-medium leading-3 uppercase">
                  {cycle}
                </span>
              </div>
              <h3 className="self-stretch text-text-primary text-lg font-semibold leading-5 line-clamp-1">
                {title}
              </h3>
            </div>

            {/* Docente */}
            <div className="self-stretch inline-flex justify-start items-center gap-2">
              <TeacherAvatars teachers={teachers} />
              <div className="flex-1 self-stretch inline-flex flex-col justify-center items-start gap-0.5">
                <span className="text-text-quartiary text-[10px] font-medium leading-3">
                  ASESOR
                </span>
                <span className="self-stretch text-text-secondary text-base font-normal leading-4 line-clamp-2">
                  {teacherNames}
                </span>
              </div>
            </div>
          </div>

          {/* Botón Ver Curso */}
          <button
            onClick={onViewCourse}
            className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg flex justify-center items-center gap-1.5 hover:bg-bg-accent-solid-hover transition-colors"
          >
            <span className="text-text-white text-sm font-medium leading-4">Ver Curso</span>
            <Icon name="arrow_forward" size={16} className="text-icon-white" />
          </button>
        </div>
      </div>
    );
  }

  // ========== Vista Galería ==========
  return (
    <div className="self-stretch bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-primary flex flex-col justify-center items-start">
      {/* Banda superior */}
      <div
        className="self-stretch h-16 rounded-tl-xl rounded-tr-xl"
        style={{ backgroundColor: headerColor }}
      />

      {/* Contenido */}
      <div className="self-stretch h-56 p-4 flex flex-col justify-between items-end">
        {/* Tags + Título */}
        <div className="self-stretch flex flex-col justify-start items-start gap-2.5">
          <div className="self-stretch inline-flex justify-start items-center gap-2">
            <span className="px-2.5 py-1.5 bg-bg-success-light rounded-full text-text-success-primary text-xs font-medium leading-3">
              {category}
            </span>
            <span className="px-2.5 py-1.5 bg-bg-quartiary rounded-full text-text-secondary text-xs font-medium leading-3 uppercase">
              {cycle}
            </span>
          </div>
          <h3 className="self-stretch text-text-primary text-xl font-semibold leading-6 line-clamp-2">
            {title}
          </h3>
        </div>

        {/* Docente + Botón */}
        <div className="self-stretch flex flex-col justify-end items-end gap-5">
          {/* Docente */}
          <div className="self-stretch inline-flex justify-start items-center gap-2">
            <TeacherAvatars teachers={teachers} />
            <div className="flex-1 self-stretch inline-flex flex-col justify-center items-start gap-0.5">
              <span className="text-text-quartiary text-[10px] font-medium leading-3">
                ASESOR
              </span>
              <span className="self-stretch text-text-secondary text-base font-normal leading-4 line-clamp-2">
                {teacherNames}
              </span>
            </div>
          </div>

          {/* Botón Ver Curso */}
          <button
            onClick={onViewCourse}
            className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg inline-flex justify-center items-center gap-1.5 hover:bg-bg-accent-solid-hover transition-colors"
          >
            <span className="text-text-white text-sm font-medium leading-4">Ver Curso</span>
            <Icon name="arrow_forward" size={16} className="text-icon-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
