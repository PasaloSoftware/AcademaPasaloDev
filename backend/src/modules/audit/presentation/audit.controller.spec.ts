import { AuditController } from './audit.controller';
import { AuditExportJobsService } from '@modules/audit/application/audit-export-jobs.service';
import { AuditService } from '@modules/audit/application/audit.service';
import { EventEmitter } from 'events';

describe('AuditController', () => {
  let controller: AuditController;

  beforeEach(() => {
    controller = new AuditController(
      {} as AuditService,
      {} as AuditExportJobsService,
    );
  });

  it('should abort cleanup and return 500 when the export stream fails before headers are sent', async () => {
    const res = new EventEmitter() as EventEmitter & {
      writableFinished: boolean;
      headersSent: boolean;
      status: jest.Mock;
      json: jest.Mock;
      destroy: jest.Mock;
      once: EventEmitter['once'];
    };
    res.writableFinished = false;
    res.headersSent = false;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.destroy = jest.fn();

    const stream = new EventEmitter();
    const onFinish = jest.fn().mockResolvedValue(undefined);
    const onAbort = jest.fn().mockResolvedValue(undefined);

    controller['attachResponseCleanup'](
      res as never,
      stream as never,
      {
        downloadKind: 'async',
        requestedByUserId: 'user-1',
        jobId: 'job-1',
        fileName: 'audit.zip',
      },
      onFinish,
      onAbort,
    );

    stream.emit('error', new Error('stream-failure'));
    await new Promise((resolve) => setImmediate(resolve));

    expect(onAbort).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'No se pudo transmitir el archivo del reporte de auditoria',
      }),
    );
    expect(res.destroy).not.toHaveBeenCalled();
  });
});
