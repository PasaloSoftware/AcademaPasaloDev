export const USER_CACHE_KEYS = {
  CAREERS_CATALOG: 'cache:users:catalog:careers',
  COURSES_CATALOG: 'cache:users:catalog:courses',
  ADMIN_USERS_TABLE_BASE_PAGE: (page: number) =>
    `cache:users:admin-table:base:page:${page}`,
  ADMIN_USERS_TABLE_BASE_GROUP: 'cache:users:admin-table:base:page:*',
};
