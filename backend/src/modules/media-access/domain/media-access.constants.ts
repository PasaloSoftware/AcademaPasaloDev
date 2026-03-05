export const MEDIA_CONTENT_KINDS = {
  VIDEO: 'VIDEO',
  DOCUMENT: 'DOCUMENT',
} as const;

export const MEDIA_ACCESS_MODES = {
  DIRECT_URL: 'DIRECT_URL',
  BACKEND_PROXY: 'BACKEND_PROXY',
} as const;

export type MediaContentKind =
  (typeof MEDIA_CONTENT_KINDS)[keyof typeof MEDIA_CONTENT_KINDS];
export type MediaAccessMode =
  (typeof MEDIA_ACCESS_MODES)[keyof typeof MEDIA_ACCESS_MODES];

