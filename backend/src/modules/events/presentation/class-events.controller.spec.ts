import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ClassEventsController } from '@modules/events/presentation/class-events.controller';
import { ClassEventsService } from '@modules/events/application/class-events.service';
import { ClassEventsQueryService } from '@modules/events/application/class-events-query.service';
import { ClassEventRecordingUploadsService } from '@modules/events/application/class-event-recording-uploads.service';
import { ROLE_CODES } from '@common/constants/role-codes.constants';

const mockClassEventsService = {
  getAuthorizedRecordingLink: jest.fn(),
  getEventsByEvaluation: jest.fn(),
  getEventDetail: jest.fn(),
  calculateEventStatus: jest.fn(),
  getEventAccess: jest.fn(),
};

const mockClassEventsQueryService = {
  getMySchedule: jest.fn(),
  getDiscoveryLayers: jest.fn(),
  getGlobalSessions: jest.fn(),
};

const mockRecordingUploadsService = {
  startUpload: jest.fn(),
  getUploadStatus: jest.fn(),
  heartbeatUpload: jest.fn(),
  finalizeUpload: jest.fn(),
};

describe('ClassEventsController RBAC', () => {
  let controller: ClassEventsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassEventsController],
      providers: [
        {
          provide: ClassEventsService,
          useValue: mockClassEventsService,
        },
        {
          provide: ClassEventsQueryService,
          useValue: mockClassEventsQueryService,
        },
        {
          provide: ClassEventRecordingUploadsService,
          useValue: mockRecordingUploadsService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<ClassEventsController>(ClassEventsController);
  });

  it('endpoint "getAuthorizedRecordingLink" should allow STUDENT role', () => {
    const roles = Reflect.getMetadata(
      'roles',
      controller.getAuthorizedRecordingLink,
    );
    expect(roles).toContain(ROLE_CODES.STUDENT);
    expect(roles).toContain(ROLE_CODES.PROFESSOR);
    expect(roles).toContain(ROLE_CODES.ADMIN);
    expect(roles).toContain(ROLE_CODES.SUPER_ADMIN);
  });

  it('endpoint "startRecordingUpload" should allow PROFESSOR/ADMIN/SUPER_ADMIN roles', () => {
    const roles = Reflect.getMetadata('roles', controller.startRecordingUpload);
    expect(roles).toContain(ROLE_CODES.PROFESSOR);
    expect(roles).toContain(ROLE_CODES.ADMIN);
    expect(roles).toContain(ROLE_CODES.SUPER_ADMIN);
  });

  it('endpoint "getRecordingUploadStatus" should allow PROFESSOR/ADMIN/SUPER_ADMIN roles', () => {
    const roles = Reflect.getMetadata(
      'roles',
      controller.getRecordingUploadStatus,
    );
    expect(roles).toContain(ROLE_CODES.PROFESSOR);
    expect(roles).toContain(ROLE_CODES.ADMIN);
    expect(roles).toContain(ROLE_CODES.SUPER_ADMIN);
  });

  it('endpoint "finalizeRecordingUpload" should allow PROFESSOR/ADMIN/SUPER_ADMIN roles', () => {
    const roles = Reflect.getMetadata(
      'roles',
      controller.finalizeRecordingUpload,
    );
    expect(roles).toContain(ROLE_CODES.PROFESSOR);
    expect(roles).toContain(ROLE_CODES.ADMIN);
    expect(roles).toContain(ROLE_CODES.SUPER_ADMIN);
  });

  it('endpoint "heartbeatRecordingUpload" should allow PROFESSOR/ADMIN/SUPER_ADMIN roles', () => {
    const roles = Reflect.getMetadata(
      'roles',
      controller.heartbeatRecordingUpload,
    );
    expect(roles).toContain(ROLE_CODES.PROFESSOR);
    expect(roles).toContain(ROLE_CODES.ADMIN);
    expect(roles).toContain(ROLE_CODES.SUPER_ADMIN);
  });
});
