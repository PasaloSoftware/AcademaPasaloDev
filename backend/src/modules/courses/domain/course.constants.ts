export const COURSE_CACHE_KEYS = {
  COURSE_CONTENT_USER: (courseCycleId: string, userId: string) =>
    `cache:content:cycle:${courseCycleId}:user:${userId}`,
  COURSE_CONTENT_FULL_ACCESS: (courseCycleId: string) =>
    `cache:content:cycle:${courseCycleId}:full-access`,
  CONTENT_BY_CYCLE_INDEX: (courseCycleId: string) =>
    `cache:index:content:cycle:${courseCycleId}`,
  CONTENT_BY_CYCLE_GROUP: (courseCycleId: string) =>
    `cache:content:cycle:${courseCycleId}:*`,
  BANK_STRUCTURE: (courseCycleId: string) =>
    `cache:bank-structure:cycle:${courseCycleId}`,
  COURSE_CYCLE_EXISTS: (courseCycleId: string) =>
    `cache:course-cycle:exists:${courseCycleId}`,
  PROFESSOR_ASSIGNMENT_COURSE_CYCLE: (courseCycleId: string, userId: string) =>
    `cache:prof-assignment:course-cycle:${courseCycleId}:user:${userId}`,
  PROFESSOR_ASSIGNMENT: (evaluationId: string, userId: string) =>
    `cache:prof-assignment:eval:${evaluationId}:user:${userId}`,
  PROFESSORS_LIST: (courseCycleId: string) =>
    `cache:prof-list:cycle:${courseCycleId}`,
  ADMIN_COURSE_CYCLES_LIST: (page: number, pageSize: number, search: string) =>
    `cache:admin:course-cycles:list:page:${page}:page-size:${pageSize}:search:${encodeURIComponent(search)}`,
  GLOBAL_CONTENT_GROUP: 'cache:content:cycle:*',
  GLOBAL_COURSE_CYCLE_EXISTS_GROUP: 'cache:course-cycle:exists:*',
  GLOBAL_ADMIN_COURSE_CYCLES_LIST_GROUP: 'cache:admin:course-cycles:list:*',
} as const;
