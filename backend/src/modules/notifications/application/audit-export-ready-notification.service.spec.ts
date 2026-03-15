import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AuditExportReadyNotificationService } from './audit-export-ready-notification.service';
import { NotificationTypeRepository } from '@modules/notifications/infrastructure/notification-type.repository';
import { UserNotificationRepository } from '@modules/notifications/infrastructure/user-notification.repository';
import { Notification } from '@modules/notifications/domain/notification.entity';
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_TYPE_CODES,
} from '@modules/notifications/domain/notification.constants';

const mockNotificationTypeRepository = {
  findByCode: jest.fn(),
};

const mockUserNotificationRepository = {
  invalidateUnreadCountForUsers: jest.fn(),
};

const mockManager = {
  create: jest.fn(),
  save: jest.fn(),
  insert: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
};

describe('AuditExportReadyNotificationService', () => {
  let service: AuditExportReadyNotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockManager.create.mockReturnValue({});
    mockManager.save.mockResolvedValue({ id: '99' });
    mockManager.insert.mockResolvedValue(undefined);
    mockDataSource.transaction.mockImplementation(
      async (cb: (manager: typeof mockManager) => Promise<unknown>) =>
        cb(mockManager),
    );
    mockNotificationTypeRepository.findByCode.mockResolvedValue({
      id: '10',
      code: NOTIFICATION_TYPE_CODES.AUDIT_EXPORT_READY,
      name: 'Reporte de Auditoria Listo',
    });
    mockUserNotificationRepository.invalidateUnreadCountForUsers.mockResolvedValue(
      undefined,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditExportReadyNotificationService,
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: NotificationTypeRepository,
          useValue: mockNotificationTypeRepository,
        },
        {
          provide: UserNotificationRepository,
          useValue: mockUserNotificationRepository,
        },
      ],
    }).compile();

    service = module.get(AuditExportReadyNotificationService);
  });

  it('crea la notificacion de reporte listo y la distribuye al admin solicitante', async () => {
    await service.createReadyNotification({
      requestedByUserId: '7',
      exportJobId: '9cb8c510-696d-4eff-9226-05de3d1936fa',
      artifactName: 'reporte-auditoria-masivo_2026-03-14_14-37-00.zip',
      artifactExpiresAt: '2026-03-14T20:37:00.000Z',
      estimatedFileCount: 2,
    });

    expect(mockNotificationTypeRepository.findByCode).toHaveBeenCalledWith(
      NOTIFICATION_TYPE_CODES.AUDIT_EXPORT_READY,
    );
    expect(mockManager.create).toHaveBeenCalledWith(
      Notification,
      expect.objectContaining({
        notificationTypeId: '10',
        title: NOTIFICATION_MESSAGES[NOTIFICATION_TYPE_CODES.AUDIT_EXPORT_READY]
          .title,
        message: expect.stringContaining('ya esta listo para descarga'),
        entityType: NOTIFICATION_ENTITY_TYPES.AUDIT_EXPORT,
        entityId: '9cb8c510-696d-4eff-9226-05de3d1936fa',
      }),
    );
    expect(mockManager.insert).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: '7',
        notificationId: '99',
      }),
    );
    expect(
      mockUserNotificationRepository.invalidateUnreadCountForUsers,
    ).toHaveBeenCalledWith(['7']);
  });

  it('lanza error si el notification_type no esta configurado', async () => {
    mockNotificationTypeRepository.findByCode.mockResolvedValue(null);

    await expect(
      service.createReadyNotification({
        requestedByUserId: '7',
        exportJobId: 'job-1',
        artifactName: 'reporte.zip',
        artifactExpiresAt: '2026-03-14T20:37:00.000Z',
        estimatedFileCount: 1,
      }),
    ).rejects.toThrow("notification_type 'AUDIT_EXPORT_READY' no configurado");
  });
});
