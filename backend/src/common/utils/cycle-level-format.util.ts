export function formatCycleLevelName(levelNumber: number | string): string {
  const normalizedLevel = String(levelNumber ?? '').trim();
  return `${normalizedLevel}° CICLO`;
}

