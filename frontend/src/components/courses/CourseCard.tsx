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
  variant?: "grid" | "list";
}

function TeacherAvatars({ teachers }: { teachers: TeacherInfo[] }) {
  if (teachers.length === 0) return null;

  if (teachers.length === 1) {
    const teacher = teachers[0];

    return teacher.photoUrl ? (
      <img
        className="h-7 w-7 rounded-full object-cover sm:h-8 sm:w-8"
        src={teacher.photoUrl}
        alt={teacher.name}
      />
    ) : (
      <div
        className="inline-flex h-7 w-7 items-center justify-center rounded-full p-1 sm:h-8 sm:w-8"
        style={{ backgroundColor: teacher.avatarColor || "#198754" }}
      >
        <span className="text-center text-[8px] font-medium leading-[10px] text-text-white sm:text-[10px] sm:leading-3">
          {teacher.initials}
        </span>
      </div>
    );
  }

  return (
    <div className="relative h-7 w-12 sm:h-8 sm:w-14">
      {teachers[1].photoUrl ? (
        <img
          className="absolute left-5 top-0 h-7 w-7 rounded-full object-cover sm:left-7 sm:h-8 sm:w-8"
          src={teachers[1].photoUrl}
          alt={teachers[1].name}
        />
      ) : (
        <div
          className="absolute left-5 top-0 inline-flex h-7 w-7 items-center justify-center rounded-full p-1 sm:left-7 sm:h-8 sm:w-8"
          style={{ backgroundColor: teachers[1].avatarColor || "#3b82f6" }}
        >
          <span className="text-center text-[8px] font-medium leading-[10px] text-text-white sm:text-[10px] sm:leading-3">
            {teachers[1].initials}
          </span>
        </div>
      )}

      {teachers[0].photoUrl ? (
        <img
          className="absolute left-0 top-0 h-7 w-7 rounded-full object-cover outline outline-2 outline-stroke-white sm:h-8 sm:w-8"
          src={teachers[0].photoUrl}
          alt={teachers[0].name}
        />
      ) : (
        <div
          className="absolute left-0 top-0 inline-flex h-7 w-7 items-center justify-center rounded-full p-1 outline outline-2 outline-stroke-white sm:h-8 sm:w-8"
          style={{ backgroundColor: teachers[0].avatarColor || "#198754" }}
        >
          <span className="text-center text-[8px] font-medium leading-[10px] text-text-white sm:text-[10px] sm:leading-3">
            {teachers[0].initials}
          </span>
        </div>
      )}
    </div>
  );
}

export default function CourseCard({
  headerColor,
  category,
  cycle,
  title,
  teachers,
  onViewCourse,
  variant = "grid",
}: CourseCardProps) {
  const teacherNames =
    teachers.length > 0
      ? `Docente: ${teachers.map((teacher) => teacher.name).join(" & ")}`
      : "Sin asignar";

  if (variant === "list") {
    return (
      <div className="inline-flex self-stretch items-center justify-start rounded-xl bg-bg-primary outline outline-1 outline-offset-[-1px] outline-stroke-primary">
        <div
          className="w-6 self-stretch rounded-bl-xl rounded-tl-xl sm:w-10"
          style={{ backgroundColor: headerColor }}
        />

        <div className="flex flex-1 items-center justify-start gap-3 p-4 sm:gap-5">
          <div className="inline-flex flex-1 flex-col justify-start gap-2">
            <div className="flex self-stretch flex-col items-start justify-start gap-2">
              <div className="inline-flex self-stretch flex-wrap items-center justify-start gap-1">
                <span className="rounded-full bg-bg-success-light px-1.5 py-1 text-[8px] font-medium leading-[10px] text-text-success-primary sm:px-2 sm:text-[10px] sm:leading-3">
                  {category}
                </span>
                <span className="rounded-full bg-bg-quartiary px-1.5 py-1 text-[8px] font-medium uppercase leading-[10px] text-text-secondary sm:px-2 sm:text-[10px] sm:leading-3">
                  {cycle}
                </span>
              </div>
              <h3 className="self-stretch text-sm font-semibold leading-4 text-text-primary line-clamp-1 sm:text-lg sm:leading-5">
                {title}
              </h3>
            </div>

            <div className="inline-flex self-stretch items-center justify-start gap-1 sm:gap-2">
              <TeacherAvatars teachers={teachers} />
              <div className="inline-flex flex-1 flex-col items-start justify-center gap-0.5 self-stretch">
                <span className="text-[8px] font-medium leading-[10px] text-gray-600 sm:text-[10px] sm:leading-3">
                  ASESOR
                </span>
                <span className="self-stretch text-xs font-normal leading-4 text-text-secondary line-clamp-2 sm:text-base">
                  {teacherNames}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onViewCourse}
            className="flex items-center justify-center gap-1 rounded-lg bg-bg-accent-primary-solid p-2.5 transition-colors hover:bg-bg-accent-solid-hover sm:px-6 sm:py-3 sm:gap-1.5"
            aria-label={`Ver curso ${title}`}
          >
            <span className="hidden text-sm font-medium leading-4 text-text-white sm:inline">
              Ver Curso
            </span>
            <Icon name="arrow_forward" size={16} className="text-icon-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex self-stretch flex-col items-start justify-center rounded-xl bg-bg-primary outline outline-1 outline-offset-[-1px] outline-stroke-primary">
      <div
        className="h-12 self-stretch rounded-tl-xl rounded-tr-xl sm:h-16"
        style={{ backgroundColor: headerColor }}
      />

      <div className="flex min-h-[12rem] self-stretch flex-col justify-between p-4 sm:min-h-[14rem]">
        <div className="flex self-stretch flex-col items-start justify-start gap-2.5">
          <div className="inline-flex self-stretch flex-wrap items-center justify-start gap-1.5">
            <span className="rounded-full bg-bg-success-light px-2 py-1 text-[10px] font-medium leading-3 text-text-success-primary sm:px-2.5 sm:py-1.5 sm:text-xs">
              {category}
            </span>
            <span className="rounded-full bg-bg-quartiary px-2 py-1 text-[10px] font-medium uppercase leading-3 text-text-secondary sm:px-2.5 sm:py-1.5 sm:text-xs">
              {cycle}
            </span>
          </div>
          <h3 className="self-stretch text-base font-semibold leading-5 text-text-primary line-clamp-2 sm:text-xl sm:leading-6">
            {title}
          </h3>
        </div>

        <div className="flex self-stretch flex-col items-end justify-end gap-5">
          <div className="inline-flex self-stretch items-center justify-start gap-1 sm:gap-2">
            <TeacherAvatars teachers={teachers} />
            <div className="inline-flex flex-1 flex-col items-start justify-center gap-0.5 self-stretch">
              <span className="text-[8px] font-medium leading-[10px] text-gray-600 sm:text-[10px] sm:leading-3">
                ASESOR
              </span>
              <span className="self-stretch text-xs font-normal leading-4 text-text-secondary line-clamp-2 sm:text-base">
                {teacherNames}
              </span>
            </div>
          </div>

          <button
            onClick={onViewCourse}
            className="inline-flex items-center justify-center gap-1.5 self-stretch rounded-lg bg-bg-accent-primary-solid px-4 py-3 transition-colors hover:bg-bg-accent-solid-hover sm:self-auto sm:px-6"
          >
            <span className="text-text-white text-sm font-medium leading-4">
              Ver Curso
            </span>
            <Icon name="arrow_forward" size={16} className="text-icon-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
