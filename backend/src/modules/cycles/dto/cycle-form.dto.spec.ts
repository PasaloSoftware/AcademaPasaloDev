import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CycleFormDto } from './cycle-form.dto';

const makeDto = (overrides: Partial<Record<string, unknown>> = {}): CycleFormDto =>
  plainToInstance(CycleFormDto, {
    code: 'CYCLE_2025-1',
    startDate: '2025-01-06',
    endDate: '2025-06-30',
    ...overrides,
  });

const errorsFor = async (field: string, overrides: Partial<Record<string, unknown>>) => {
  const errors = await validate(makeDto(overrides));
  return errors.filter((e) => e.property === field);
};

describe('CycleFormDto', () => {
  // ─────────────────────────────────────────────
  // code — formato URL-safe
  // ─────────────────────────────────────────────
  describe('code', () => {
    it('acepta letras mayúsculas, números y guiones bajos', async () => {
      expect(await errorsFor('code', { code: 'CYCLE_2025_1' })).toHaveLength(0);
    });

    it('acepta letras minúsculas', async () => {
      expect(await errorsFor('code', { code: 'ciclo-2025' })).toHaveLength(0);
    });

    it('acepta guiones medios', async () => {
      expect(await errorsFor('code', { code: '2025-1' })).toHaveLength(0);
    });

    it('acepta combinación de letras, números, guión y guión bajo', async () => {
      expect(await errorsFor('code', { code: 'CYCLE_2025-1' })).toHaveLength(0);
    });

    it('rechaza código con espacio', async () => {
      expect(await errorsFor('code', { code: 'Verano 2025' })).toHaveLength(1);
    });

    it('rechaza código con barra diagonal', async () => {
      expect(await errorsFor('code', { code: '2025/1' })).toHaveLength(1);
    });

    it('rechaza código con punto', async () => {
      expect(await errorsFor('code', { code: '2025.1' })).toHaveLength(1);
    });

    it('rechaza código con paréntesis', async () => {
      expect(await errorsFor('code', { code: '2025(I)' })).toHaveLength(1);
    });

    it('rechaza código con tildes', async () => {
      expect(await errorsFor('code', { code: 'Período-2025' })).toHaveLength(1);
    });

    it('rechaza código vacío', async () => {
      expect(await errorsFor('code', { code: '' })).toHaveLength(1);
    });

    it('rechaza código que supera 50 caracteres', async () => {
      expect(
        await errorsFor('code', { code: 'A'.repeat(51) }),
      ).toHaveLength(1);
    });

    it('acepta código de exactamente 50 caracteres URL-safe', async () => {
      expect(
        await errorsFor('code', { code: 'A'.repeat(50) }),
      ).toHaveLength(0);
    });

    it('el mensaje de error menciona los caracteres permitidos', async () => {
      const errors = await errorsFor('code', { code: 'ciclo 2025' });
      const constraints = Object.values(errors[0]?.constraints ?? {});
      expect(constraints.some((msg) => msg.includes('guiones'))).toBe(true);
    });
  });

  // ─────────────────────────────────────────────
  // startDate / endDate
  // ─────────────────────────────────────────────
  describe('startDate', () => {
    it('acepta formato ISO date válido', async () => {
      expect(await errorsFor('startDate', { startDate: '2025-01-06' })).toHaveLength(0);
    });

    it('rechaza fecha con formato inválido', async () => {
      expect(await errorsFor('startDate', { startDate: '06-01-2025' })).toHaveLength(1);
    });

    it('rechaza startDate vacío', async () => {
      expect(await errorsFor('startDate', { startDate: '' })).toHaveLength(1);
    });
  });

  describe('endDate', () => {
    it('acepta formato ISO date válido', async () => {
      expect(await errorsFor('endDate', { endDate: '2025-06-30' })).toHaveLength(0);
    });

    it('rechaza fecha con formato inválido', async () => {
      expect(await errorsFor('endDate', { endDate: '30/06/2025' })).toHaveLength(1);
    });

    it('rechaza endDate vacío', async () => {
      expect(await errorsFor('endDate', { endDate: '' })).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────
  // DTO completo válido
  // ─────────────────────────────────────────────
  it('DTO completo válido no genera errores', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });
});
