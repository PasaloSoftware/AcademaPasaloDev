import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StartClassEventRecordingUploadDto } from '@modules/events/dto/start-class-event-recording-upload.dto';
import { FinalizeClassEventRecordingUploadDto } from '@modules/events/dto/finalize-class-event-recording-upload.dto';

describe('Recording Upload DTOs', () => {
  it('rechaza fileName vacío o solo espacios', async () => {
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

  it('rechaza uploadToken vacío o solo espacios', async () => {
    const dto = plainToInstance(FinalizeClassEventRecordingUploadDto, {
      uploadToken: '   ',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'uploadToken')).toBe(true);
  });
});
