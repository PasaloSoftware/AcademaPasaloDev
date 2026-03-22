import { formatCycleLevelName } from '@common/utils/cycle-level-format.util';

describe('formatCycleLevelName', () => {
  it('should format numeric level as ordinal uppercase cycle label', () => {
    expect(formatCycleLevelName(1)).toBe('1° CICLO');
  });

  it('should trim string level values', () => {
    expect(formatCycleLevelName(' 2 ')).toBe('2° CICLO');
  });
});

