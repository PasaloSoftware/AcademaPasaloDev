import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from '@modules/feedback/application/feedback.service';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { ROLE_CODES } from '@common/constants/role-codes.constants';

const mockFeedbackService = {
  createTestimony: jest.fn(),
  featureTestimony: jest.fn(),
  getPublicTestimonies: jest.fn(),
  getAdminTestimonies: jest.fn(),
};

describe('FeedbackController RBAC Security', () => {
  let controller: FeedbackController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [
        { provide: FeedbackService, useValue: mockFeedbackService },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FeedbackController>(FeedbackController);
  });

  it('endpoint "create" should be restricted to STUDENT only', () => {
    const roles = Reflect.getMetadata('roles', controller.create);
    expect(roles).toBeDefined();
    expect(roles).toContain(ROLE_CODES.STUDENT);
    expect(roles).not.toContain(ROLE_CODES.ADMIN);
    expect(roles).not.toContain(ROLE_CODES.PROFESSOR);
  });

  it('endpoint "feature" should be restricted to ADMIN, SUPER_ADMIN', () => {
    const roles = Reflect.getMetadata('roles', controller.feature);
    expect(roles).toBeDefined();
    expect(roles).toContain(ROLE_CODES.ADMIN);
    expect(roles).toContain(ROLE_CODES.SUPER_ADMIN);
    expect(roles).not.toContain(ROLE_CODES.STUDENT);
  });

  it('endpoint "getAdmin" should be restricted to ADMIN, SUPER_ADMIN', () => {
    const roles = Reflect.getMetadata('roles', controller.getAdmin);
    expect(roles).toContain(ROLE_CODES.ADMIN);
    expect(roles).toContain(ROLE_CODES.SUPER_ADMIN);
    expect(roles).not.toContain(ROLE_CODES.STUDENT);
  });

  it('endpoint "getPublic" should NOT have Role restrictions (Public Access)', () => {
    const roles = Reflect.getMetadata('roles', controller.getPublic);
    expect(roles).toBeUndefined();
  });
});
