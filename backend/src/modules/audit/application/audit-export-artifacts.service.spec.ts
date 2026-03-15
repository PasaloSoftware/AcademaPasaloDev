import { ConfigService } from '@nestjs/config';
import { AuditExportArtifactsService } from './audit-export-artifacts.service';

describe('AuditExportArtifactsService', () => {
  let service: AuditExportArtifactsService;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue('C:\\tmp'),
    } as unknown as ConfigService;

    service = new AuditExportArtifactsService(configService);
  });

  it('should build filenames using America/Lima local time instead of UTC', () => {
    const now = new Date('2026-03-14T15:42:10.000Z');

    expect(service.buildSyncFileName(now)).toBe(
      'reporte-auditoria_2026-03-14_10-42-10.xlsx',
    );
    expect(service.buildAsyncZipName(now)).toBe(
      'reporte-auditoria-masivo_2026-03-14_10-42-10.zip',
    );
  });
});
