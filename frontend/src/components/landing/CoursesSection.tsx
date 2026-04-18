"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import {
  coursesService,
  type PublicCourseCatalogItem,
} from "@/services/courses.service";

interface Teacher {
  name: string;
  initials: string;
  avatarColor: string;
  photo?: string;
}

interface Course {
  courseCycleId: string;
  code: string;
  name: string;
  category: string;
  cycle: string;
  headerColor: string;
  teachers: Teacher[];
  freeClassUrl: string | null;
}

const filters = ["Todos", "Ciencias", "Letras", "Facultad"];

const avatarColors = [
  "bg-bg-info-primary-solid",
  "bg-bg-success-solid",
  "bg-bg-accent-primary-solid",
  "bg-bg-warning-solid",
];

function getInitials(firstName: string, lastName1: string | null) {
  const a = firstName?.trim()?.[0] || "X";
  const b = lastName1?.trim()?.[0] || "X";
  return `${a}${b}`.toUpperCase();
}

function mapCatalogCourse(item: PublicCourseCatalogItem): Course {
  return {
    courseCycleId: item.courseCycleId,
    code: item.code,
    name: item.name,
    category: item.categoryName.toUpperCase(),
    cycle: item.cycleLabel.toUpperCase(),
    headerColor: item.headerColor || "#1E40A3",
    freeClassUrl: item.freeClassUrl,
    teachers: item.professors.slice(0, 2).map((professor, index) => ({
      name: `${professor.firstName} ${professor.lastName1 || ""}`.trim(),
      initials: getInitials(professor.firstName, professor.lastName1),
      avatarColor: avatarColors[index % avatarColors.length],
      photo: professor.profilePhotoUrl || undefined,
    })),
  };
}

function TeacherAvatars({ teachers }: { teachers: Teacher[] }) {
  if (teachers.length === 1) {
    const teacher = teachers[0];
    return (
      <div
        className={`w-7 h-7 md:w-8 md:h-8 p-1 ${teacher.avatarColor} rounded-full flex justify-center items-center`}
      >
        <span className="text-center text-text-white text-[8px] md:text-[10px] font-medium leading-[10px] md:leading-3">
          {teacher.initials}
        </span>
      </div>
    );
  }

  return (
    <div className="w-12 h-7 md:w-14 md:h-8 relative">
      <div
        className={`w-7 h-7 md:w-8 md:h-8 absolute left-0 top-0 ${teachers[0].avatarColor} rounded-full outline outline-[1.5px] md:outline-2 outline-stroke-white flex justify-center items-center p-1`}
      >
        <span className="text-center text-text-white text-[8px] md:text-[10px] font-medium leading-[10px] md:leading-3">
          {teachers[0].initials}
        </span>
      </div>
      {teachers[1].photo ? (
        <img
          src={teachers[1].photo}
          alt={teachers[1].name}
          className="w-7 h-7 md:w-8 md:h-8 absolute left-6 md:left-7 top-0 rounded-full outline outline-1 outline-white object-cover"
        />
      ) : (
        <div
          className={`w-7 h-7 md:w-8 md:h-8 absolute left-6 md:left-7 top-0 ${teachers[1].avatarColor} rounded-full outline outline-[1.5px] md:outline-2 outline-stroke-white flex justify-center items-center p-1`}
        >
          <span className="text-center text-text-white text-[8px] md:text-[10px] font-medium leading-[10px] md:leading-3">
            {teachers[1].initials}
          </span>
        </div>
      )}
    </div>
  );
}

function CourseCardSkeleton() {
  return (
    <div className="w-64 md:w-72 flex-shrink-0">
      <div className="bg-bg-primary rounded-2xl outline outline-1 outline-offset-[-1px] outline-stroke-primary flex flex-col animate-pulse">
        <div className="h-12 md:h-16 rounded-t-2xl bg-bg-quartiary" />
        <div className="h-48 md:h-56 p-4 flex flex-col justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="h-6 w-20 rounded-full bg-bg-quartiary" />
              <div className="h-6 w-20 rounded-full bg-bg-quartiary" />
            </div>
            <div className="h-6 w-full rounded bg-bg-quartiary" />
            <div className="h-6 w-3/4 rounded bg-bg-quartiary" />
          </div>
          <div className="flex flex-col gap-5">
            <div className="h-10 w-full rounded bg-bg-quartiary" />
            <div className="h-12 w-full rounded-lg bg-bg-quartiary" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CoursesSection() {
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCourses = async () => {
      setLoading(true);
      try {
        const items = await coursesService.getPublicLandingCatalog();
        if (!isMounted) return;
        setCourses(items.map(mapCatalogCourse));
      } catch (error) {
        console.error("Error loading landing courses:", error);
        if (isMounted) {
          setCourses([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCourses =
    activeFilter === "Todos"
      ? courses
      : courses.filter(
          (course) =>
            course.category.toLowerCase() === activeFilter.toLowerCase(),
        );

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const cardWidth = 288 + 24;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -cardWidth * 2 : cardWidth * 2,
      behavior: "smooth",
    });
  };

  return (
    <section
      id="cursos"
      className="scroll-mt-20 px-4 py-10 md:px-16 lg:px-28 md:py-20 relative bg-gradient-to-b from-deep-blue-50 via-white to-muted-indigo-50 flex flex-col items-center gap-6 md:gap-10"
    >
      <div className="w-full flex flex-col items-center gap-4 md:gap-5 px-5">
        <h2 className="w-full text-center text-3xl md:text-5xl font-bold leading-8 md:leading-[56px]">
          <span className="text-text-primary">Nuestros </span>
          <span className="text-text-accent-primary">Cursos</span>
        </h2>

        <div className="flex flex-wrap justify-center gap-2 md:gap-2.5">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium leading-4 transition-colors ${
                activeFilter === filter
                  ? "bg-bg-accent-primary-solid text-text-white"
                  : "bg-bg-primary outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary text-text-accent-primary hover:bg-bg-accent-light"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full flex items-center gap-4">
        <button
          onClick={() => scroll("left")}
          aria-label="Anterior"
          className="absolute left-[90px] hidden lg:flex flex-shrink-0 p-3 bg-bg-primary rounded-full card-shadow outline outline-1 outline-offset-[-1px] outline-stroke-primary justify-center items-center hover:bg-bg-secondary transition-colors cursor-pointer"
        >
          <Icon name="chevron_left" size={20} className="text-icon-primary" />
        </button>

        <div className="flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scroll-smooth courses-carousel"
          >
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <CourseCardSkeleton key={index} />
              ))
            ) : filteredCourses.length > 0 ? (
              filteredCourses.map((course) => (
                <div
                  key={course.courseCycleId}
                  className="w-64 md:w-72 flex-shrink-0"
                >
                  <div className="bg-bg-primary rounded-2xl outline outline-1 outline-offset-[-1px] outline-stroke-primary flex flex-col">
                    <div
                      className="h-12 md:h-16 rounded-t-2xl"
                      style={{ backgroundColor: course.headerColor }}
                    />

                    <div className="h-48 md:h-56 p-4 flex flex-col justify-between">
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <span className="px-2 py-1 md:px-2.5 md:py-1.5 bg-bg-success-light rounded-full text-text-success-primary text-[10px] md:text-xs font-medium leading-3">
                            {course.category}
                          </span>
                          <span className="px-2 py-1 md:px-2.5 md:py-1.5 bg-bg-quartiary rounded-full text-text-secondary text-[10px] md:text-xs font-medium leading-3">
                            {course.cycle}
                          </span>
                        </div>

                        <h3 className="text-text-primary text-base md:text-xl font-semibold leading-5 md:leading-6 line-clamp-2">
                          {course.name}
                        </h3>
                      </div>

                      <div className="flex flex-col gap-5">
                        <div className="flex items-center gap-1 md:gap-2">
                          {course.teachers.length > 0 ? (
                            <>
                              <TeacherAvatars teachers={course.teachers} />
                              <div className="flex-1 flex flex-col gap-0.5">
                                <span className="text-text-tertiary text-[8px] md:text-[10px] font-medium leading-[10px] md:leading-3">
                                  ASESOR
                                </span>
                                <span className="text-text-secondary text-xs md:text-base font-normal leading-4 line-clamp-1">
                                  {course.teachers.length > 1
                                    ? course.teachers
                                        .map((teacher) => teacher.name)
                                        .join(" & ")
                                    : course.teachers[0].name}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="flex-1 flex flex-col gap-0.5">
                              <span className="text-text-tertiary text-[8px] md:text-[10px] font-medium leading-[10px] md:leading-3">
                                ASESOR
                              </span>
                              <span className="text-text-secondary text-xs md:text-base font-normal leading-4 line-clamp-1">
                                Próximamente
                              </span>
                            </div>
                          )}
                        </div>

                        {course.freeClassUrl ? (
                          <a
                            href={course.freeClassUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full px-4 py-3 bg-bg-accent-light rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-secondary flex justify-center items-center gap-1.5 hover:bg-deep-blue-100 transition-colors"
                          >
                            <Icon
                              name="play_arrow"
                              size={16}
                              className="text-icon-accent-primary"
                            />
                            <span className="text-text-accent-primary text-sm font-medium leading-4">
                              Ver Clase Gratis
                            </span>
                          </a>
                        ) : (
                          <div className="w-full px-4 py-3 bg-bg-tertiary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex justify-center items-center gap-1.5">
                            <Icon
                              name="schedule"
                              size={16}
                              className="text-icon-tertiary"
                            />
                            <span className="text-text-tertiary text-sm font-medium leading-4">
                              Clase gratis próximamente
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full py-12 text-center text-text-tertiary text-base font-medium">
                No hay cursos disponibles por el momento.
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => scroll("right")}
          aria-label="Siguiente"
          className="absolute right-[90px] hidden lg:flex flex-shrink-0 p-3 bg-bg-primary rounded-full card-shadow outline outline-1 outline-offset-[-1px] outline-stroke-primary justify-center items-center hover:bg-bg-secondary transition-colors cursor-pointer"
        >
          <Icon name="chevron_right" size={20} className="text-icon-primary" />
        </button>
      </div>
    </section>
  );
}
