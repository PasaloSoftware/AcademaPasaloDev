import {
  BadGatewayException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as GoogleAuthLibrary from 'google-auth-library';
import { ClassEventRecordingDriveService } from '@modules/events/application/class-event-recording-drive.service';

jest.mock('google-auth-library', () => ({
  __esModule: true,
  __mockGetClient: jest.fn(),
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getClient: jest.requireMock('google-auth-library').__mockGetClient,
  })),
}));

describe('ClassEventRecordingDriveService', () => {
  const googleAuthMocks = GoogleAuthLibrary as unknown as {
    __mockGetClient: jest.Mock;
    GoogleAuth: jest.Mock;
  };

  const createConfigService = (
    values: Record<string, string | null | undefined>,
  ) =>
    ({
      get: (key: string, fallback?: string | null) =>
        values[key] !== undefined ? values[key] : fallback,
    }) as ConfigService;

  afterEach(() => {
    jest.clearAllMocks();
    googleAuthMocks.__mockGetClient.mockReset();
  });

  it('crea sesion resumable con metadata correcta y carpeta esperada', async () => {
    const configService = createConfigService({
      GOOGLE_APPLICATION_CREDENTIALS: 'C:\\drive-service-account.json',
    });
    const service = new ClassEventRecordingDriveService(configService);
    const mockClient = {
      request: jest.fn().mockResolvedValue({
        data: { id: 'drive-file-1', name: 'clase-1.mp4', parents: ['videos-1'] },
        headers: { location: 'https://upload-session.example/resumable-1' },
      }),
    };
    googleAuthMocks.__mockGetClient.mockResolvedValue(mockClient);

    const result = await service.createResumableUploadSession({
      classEventId: 'event-1',
      evaluationId: 'eval-1',
      driveVideosFolderId: 'videos-1',
      fileName: 'clase-1.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    });

    expect(result.resumableSessionUrl).toBe(
      'https://upload-session.example/resumable-1',
    );
    expect(mockClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: expect.stringContaining('uploadType=resumable'),
        data: {
          name: 'clase-1.mp4',
          parents: ['videos-1'],
        },
        headers: expect.objectContaining({
          'X-Upload-Content-Type': 'video/mp4',
          'X-Upload-Content-Length': '1024',
        }),
      }),
    );
  });

  it('maneja credenciales faltantes', async () => {
    const configService = createConfigService({
      GOOGLE_APPLICATION_CREDENTIALS: '',
    });
    const service = new ClassEventRecordingDriveService(configService);

    await expect(
      service.createResumableUploadSession({
        classEventId: 'event-1',
        evaluationId: 'eval-1',
        driveVideosFolderId: 'videos-1',
        fileName: 'clase-1.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1024,
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('maneja error de folder invalido o permisos de Drive', async () => {
    const configService = createConfigService({
      GOOGLE_APPLICATION_CREDENTIALS: 'C:\\drive-service-account.json',
    });
    const service = new ClassEventRecordingDriveService(configService);
    const mockClient = {
      request: jest.fn().mockRejectedValue({
        response: { status: 404, data: { error: { message: 'File not found' } } },
        message: 'Request failed with status code 404',
      }),
    };
    googleAuthMocks.__mockGetClient.mockResolvedValue(mockClient);

    await expect(
      service.createResumableUploadSession({
        classEventId: 'event-1',
        evaluationId: 'eval-1',
        driveVideosFolderId: 'videos-invalido',
        fileName: 'clase-1.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1024,
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('falla si Drive no devuelve location de sesion resumable', async () => {
    const configService = createConfigService({
      GOOGLE_APPLICATION_CREDENTIALS: 'C:\\drive-service-account.json',
    });
    const service = new ClassEventRecordingDriveService(configService);
    const mockClient = {
      request: jest.fn().mockResolvedValue({
        data: { id: 'drive-file-1' },
        headers: {},
      }),
    };
    googleAuthMocks.__mockGetClient.mockResolvedValue(mockClient);

    await expect(
      service.createResumableUploadSession({
        classEventId: 'event-1',
        evaluationId: 'eval-1',
        driveVideosFolderId: 'videos-1',
        fileName: 'clase-1.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1024,
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
