import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '@common/guards/roles.guard';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { ROLES_KEY } from '@common/decorators/roles.decorator';

describe('RolesGuard', () => {
  const reflectorMock = {
    getAllAndOverride: jest.fn(),
  };

  let guard: RolesGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(reflectorMock as unknown as Reflector);
  });

  const buildContext = (
    user: unknown,
  ): ExecutionContext & { getHandler: jest.Mock; getClass: jest.Mock } =>
    ({
      getHandler: jest.fn(() => 'handler'),
      getClass: jest.fn(() => 'class'),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext & {
      getHandler: jest.Mock;
      getClass: jest.Mock;
    };

  it('allows access when activeRole is required and still assigned to user', () => {
    reflectorMock.getAllAndOverride.mockReturnValue([ROLE_CODES.ADMIN]);

    const context = buildContext({
      activeRole: ROLE_CODES.ADMIN,
      roles: [{ code: ROLE_CODES.ADMIN }],
    });
    const allowed = guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(reflectorMock.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('rejects access when activeRole is no longer assigned to user', () => {
    reflectorMock.getAllAndOverride.mockReturnValue([ROLE_CODES.PROFESSOR]);

    const allowed = guard.canActivate(
      buildContext({
        activeRole: ROLE_CODES.PROFESSOR,
        roles: [{ code: ROLE_CODES.STUDENT }],
      }),
    );

    expect(allowed).toBe(false);
  });
});
