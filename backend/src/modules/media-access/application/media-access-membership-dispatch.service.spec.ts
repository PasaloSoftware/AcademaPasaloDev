import { BadRequestException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MediaAccessMembershipDispatchService } from '@modules/media-access/application/media-access-membership-dispatch.service';
import {
  MEDIA_ACCESS_JOB_NAMES,
  MEDIA_ACCESS_MEMBERSHIP_ACTIONS,
  MEDIA_ACCESS_SYNC_SOURCES,
} from '@modules/media-access/domain/media-access.constants';

describe('MediaAccessMembershipDispatchService', () => {
  let service: MediaAccessMembershipDispatchService;
  let queue: jest.Mocked<Partial<Queue>>;

  beforeEach(() => {
    queue = {
      addBulk: jest.fn().mockResolvedValue([]),
      add: jest.fn().mockResolvedValue({ id: 'job-recover' }),
    };
    service = new MediaAccessMembershipDispatchService(
      queue as unknown as Queue,
    );
  });

  it('deduplica jobs y normaliza payload para grants por evaluación', async () => {
    await service.enqueueGrantForUserEvaluations(
      ' 100 ',
      ['200', '200', ' 300 ', ''],
      ' ENROLLMENT_CREATED ',
    );

    expect(queue.addBulk).toHaveBeenCalledTimes(1);
    const jobs = (queue.addBulk as jest.Mock).mock.calls[0][0] as Array<{
      name: string;
      data: {
        action: string;
        userId: string;
        evaluationId: string;
        source: string;
        requestedAt: string;
      };
      opts?: { jobId?: string };
    }>;
    expect(jobs).toHaveLength(2);
    expect(jobs[0].name).toBe(MEDIA_ACCESS_JOB_NAMES.SYNC_MEMBERSHIP);
    expect(jobs[0].data.action).toBe(MEDIA_ACCESS_MEMBERSHIP_ACTIONS.GRANT);
    expect(jobs[0].data.userId).toBe('100');
    expect(jobs[0].data.evaluationId).toBe('200');
    expect(jobs[0].data.source).toBe('ENROLLMENT_CREATED');
    expect(jobs[0].data.requestedAt).toBeDefined();
    expect(jobs[0].opts?.jobId).toBe(
      'media-access__membership__GRANT__100__200',
    );
    expect(jobs[0].opts?.removeOnComplete).toBe(true);
  });

  it('encola revokes por usuario/evaluaciones', async () => {
    await service.enqueueRevokeForUserEvaluations(
      '100',
      ['200'],
      'ENROLLMENT_CANCELLED',
    );

    const jobs = (queue.addBulk as jest.Mock).mock.calls[0][0] as Array<{
      data: { action: string; source: string };
    }>;
    expect(jobs[0].data.action).toBe(MEDIA_ACCESS_MEMBERSHIP_ACTIONS.REVOKE);
    expect(jobs[0].data.source).toBe('ENROLLMENT_CANCELLED');
  });

  it('propaga error si queue falla', async () => {
    (queue.addBulk as jest.Mock).mockRejectedValue(new Error('Redis down'));

    await expect(
      service.enqueueGrantForEvaluationUsers(
        '200',
        ['100', '100'],
        'EVALUATION_CREATED',
      ),
    ).rejects.toThrow('Redis down');
  });

  it('encola recover scope con payload normalizado', async () => {
    const result = await service.enqueueRecoverEvaluationScope({
      evaluationId: ' 200 ',
      requestedByUserId: ' 10 ',
      reconcileMembers: true,
      pruneExtraMembers: false,
      source: ' ADMIN_MANUAL_RECOVERY ',
    });

    expect(result.jobId).toBe(
      'media-access__recover-scope__200__reconcile__keep-extra',
    );
    expect(queue.add).toHaveBeenCalledTimes(1);
    const [name, data, opts] = (queue.add as jest.Mock).mock.calls[0];
    expect(name).toBe(MEDIA_ACCESS_JOB_NAMES.RECOVER_EVALUATION_SCOPE);
    expect(data).toMatchObject({
      evaluationId: '200',
      requestedByUserId: '10',
      reconcileMembers: true,
      pruneExtraMembers: false,
      source: 'ADMIN_MANUAL_RECOVERY',
    });
    expect(opts).toMatchObject({
      jobId: 'media-access__recover-scope__200__reconcile__keep-extra',
      removeOnComplete: true,
    });
  });

  it('lanza BadRequestException si falta input obligatorio en recover scope', async () => {
    await expect(
      service.enqueueRecoverEvaluationScope({
        evaluationId: '200',
        requestedByUserId: '',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lanza BadRequestException si pruneExtraMembers requiere reconciliacion', async () => {
    await expect(
      service.enqueueRecoverEvaluationScope({
        evaluationId: '200',
        requestedByUserId: '10',
        reconcileMembers: false,
        pruneExtraMembers: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('enqueueEvaluationScopeTeardown', () => {
    it('encola job con jobId correcto y payload normalizado', async () => {
      await service.enqueueEvaluationScopeTeardown({
        evaluationId: ' 42 ',
        viewerGroupEmail: ' EV-42-Viewers@AcademiaPasalo.com ',
        driveScopeFolderId: 'drive-folder-xyz',
      });

      expect(queue.add).toHaveBeenCalledTimes(1);
      const [name, data, opts] = (queue.add as jest.Mock).mock.calls[0];
      expect(name).toBe(MEDIA_ACCESS_JOB_NAMES.TEARDOWN_EVALUATION_SCOPE);
      expect(data).toMatchObject({
        evaluationId: '42',
        viewerGroupEmail: 'ev-42-viewers@academiapasalo.com',
        driveScopeFolderId: 'drive-folder-xyz',
        source: MEDIA_ACCESS_SYNC_SOURCES.EVALUATION_DELETED,
      });
      expect(data.requestedAt).toBeDefined();
      expect(opts.jobId).toBe('media-access__teardown-scope__42');
      expect(opts.removeOnComplete).toBe(true);
    });

    it('encola job con driveScopeFolderId null cuando no se pasa', async () => {
      await service.enqueueEvaluationScopeTeardown({
        evaluationId: '42',
        viewerGroupEmail: 'ev-42-viewers@academiapasalo.com',
        driveScopeFolderId: null,
      });

      const [, data] = (queue.add as jest.Mock).mock.calls[0];
      expect(data.driveScopeFolderId).toBeNull();
    });

    it('omite el encolado cuando evaluationId esta en blanco', async () => {
      await service.enqueueEvaluationScopeTeardown({
        evaluationId: '   ',
        viewerGroupEmail: 'ev-42-viewers@academiapasalo.com',
        driveScopeFolderId: null,
      });

      expect(queue.add).not.toHaveBeenCalled();
    });

    it('omite el encolado cuando viewerGroupEmail esta en blanco', async () => {
      await service.enqueueEvaluationScopeTeardown({
        evaluationId: '42',
        viewerGroupEmail: '',
        driveScopeFolderId: null,
      });

      expect(queue.add).not.toHaveBeenCalled();
    });
  });
});
