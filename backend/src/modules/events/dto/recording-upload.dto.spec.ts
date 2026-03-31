import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StartClassEventRecordingUploadDto } from '@modules/events/dto/start-class-event-recording-upload.dto';
import { FinalizeClassEventRecordingUploadDto } from '@modules/events/dto/finalize-class-event-recording-upload.dto';

describe('Recording Upload DTOs', () => {
  it('rechaza fileName vacio o solo espacios', async () => {
    const dto = plainToInstance(StartClassEventRecordingUploadDto, {
      fileName: '   ',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'fileName')).toBe(true);
  });

  it('normaliza fileName antes de validar', async () => {
    const dto = plainToInstance(StartClassEventRecordingUploadDto, {
      fileName: '  clase-1.mp4  ',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.fileName).toBe('clase-1.mp4');
  });

  it('rechaza uploadToken vacio o solo espacios', async () => {
    const dto = plainToInstance(FinalizeClassEventRecordingUploadDto, {
      uploadToken: '   ',
      fileId: 'drive-file-1',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'uploadToken')).toBe(true);
  });

  it('rechaza fileId vacio o solo espacios en finalize', async () => {
    const dto = plainToInstance(FinalizeClassEventRecordingUploadDto, {
      uploadToken: 'token-activo',
      fileId: '   ',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'fileId')).toBe(true);
  });

  it('normaliza uploadToken y fileId antes de validar finalize', async () => {
    const dto = plainToInstance(FinalizeClassEventRecordingUploadDto, {
      uploadToken: '  token-activo  ',
      fileId: '  drive-file-1  ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.uploadToken).toBe('token-activo');
    expect(dto.fileId).toBe('drive-file-1');
  });
});
