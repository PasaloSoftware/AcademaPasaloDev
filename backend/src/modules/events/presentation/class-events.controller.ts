import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import { ClassEventsService } from '@modules/events/application/class-events.service';
import { ClassEventsQueryService } from '@modules/events/application/class-events-query.service';
import { ClassEventRecordingUploadsService } from '@modules/events/application/class-event-recording-uploads.service';
import { CreateClassEventDto } from '@modules/events/dto/create-class-event.dto';
import { UpdateClassEventDto } from '@modules/events/dto/update-class-event.dto';
import { AssignProfessorDto } from '@modules/events/dto/assign-professor.dto';
import { ClassEventResponseDto } from '@modules/events/dto/class-event-response.dto';
import { GlobalSessionsQueryDto } from '@modules/events/dto/global-sessions-query.dto';
import { StartClassEventRecordingUploadDto } from '@modules/events/dto/start-class-event-recording-upload.dto';
import { FinalizeClassEventRecordingUploadDto } from '@modules/events/dto/finalize-class-event-recording-upload.dto';
import { HeartbeatClassEventRecordingUploadDto } from '@modules/events/dto/heartbeat-class-event-recording-upload.dto';
import { Auth } from '@common/decorators/auth.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ResponseMessage } from '@common/decorators/response-message.decorator';
import { User } from '@modules/users/domain/user.entity';
import { ClassEvent } from '@modules/events/domain/class-event.entity';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { technicalSettings } from '@config/technical-settings';
import {
  assertValidDateRange,
  parseBusinessDatetimeToUtc,
  parseScheduleRangeEndExclusiveToUtc,
  parseScheduleRangeStartToUtc,
} from '@common/utils/peru-time.util';

@Controller('class-events')
@Auth()
export class ClassEventsController {
  constructor(
    private readonly classEventsService: ClassEventsService,
    private readonly classEventsQueryService: ClassEventsQueryService,
    private readonly recordingUploadsService: ClassEventRecordingUploadsService,
  ) {}

  private mapEventsToResponse(
    events: Awaited<ReturnType<ClassEventsService['getEventsByEvaluation']>>,
  ): ClassEventResponseDto[] {
    const now = new Date();

    return events.map((event) => {
      const status = this.classEventsService.calculateEventStatus(event, now);
      const access = this.classEventsService.getEventAccess(event);
      return ClassEventResponseDto.fromEntity(event, status, access);
    });
  }

  private mapEventToResponse(event: ClassEvent): ClassEventResponseDto {
    const status = this.classEventsService.calculateEventStatus(event);
    const access = this.classEventsService.getEventAccess(event);
    return ClassEventResponseDto.fromEntity(event, status, access);
  }

  @Post()
  @Roles(ROLE_CODES.PROFESSOR, ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Evento de clase creado exitosamente')
  async create(
    @Body() dto: CreateClassEventDto,
    @CurrentUser() user: User,
  ): Promise<ClassEventResponseDto> {
    const event = await this.classEventsService.createEvent(
      dto.evaluationId,
      dto.sessionNumber,
      dto.title,
      dto.topic,
      parseBusinessDatetimeToUtc(dto.startDatetime, 'startDatetime'),
      parseBusinessDatetimeToUtc(dto.endDatetime, 'endDatetime'),
      dto.liveMeetingUrl,
      user,
      dto.professorUserIds,
    );

    const eventDetail = await this.classEventsService.getEventDetail(
      event.id,
      user,
    );
    return this.mapEventToResponse(eventDetail);
  }

  @Get('my-schedule')
  @Roles(
    ROLE_CODES.STUDENT,
    ROLE_CODES.PROFESSOR,
    ROLE_CODES.ADMIN,
    ROLE_CODES.SUPER_ADMIN,
  )
  @ResponseMessage('Calendario obtenido exitosamente')
  async getMySchedule(
    @CurrentUser() user: User,
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ): Promise<ClassEventResponseDto[]> {
    const start = startDate
      ? parseScheduleRangeStartToUtc(startDate, 'start')
      : new Date();
    const end = endDate
      ? parseScheduleRangeEndExclusiveToUtc(endDate, 'end')
      : new Date(
          start.getTime() +
            technicalSettings.cache.events.myScheduleDefaultRangeDays *
              24 *
              60 *
              60 *
              1000,
        );

    assertValidDateRange(start, end, 'start', 'end');

    const events = await this.classEventsQueryService.getMySchedule(
      user.id,
      start,
      end,
    );
    return this.mapEventsToResponse(events);
  }

  @Get('discovery/layers/:courseCycleId')
  @Roles(ROLE_CODES.PROFESSOR, ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Capas de calendario obtenidas exitosamente')
  async getDiscoveryLayers(
    @Param('courseCycleId') courseCycleId: string,
  ): Promise<
    Awaited<ReturnType<ClassEventsQueryService['getDiscoveryLayers']>>
  > {
    return await this.classEventsQueryService.getDiscoveryLayers(courseCycleId);
  }

  @Get('global/sessions')
  @Roles(ROLE_CODES.PROFESSOR, ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Sesiones globales obtenidas exitosamente')
  async getGlobalSessions(
    @Query() query: GlobalSessionsQueryDto,
  ): Promise<
    Awaited<ReturnType<ClassEventsQueryService['getGlobalSessions']>>
  > {
    const startDate = parseScheduleRangeStartToUtc(
      query.startDate,
      'startDate',
    );
    const endDate = parseScheduleRangeEndExclusiveToUtc(
      query.endDate,
      'endDate',
    );

    assertValidDateRange(startDate, endDate, 'startDate', 'endDate');

    return await this.classEventsQueryService.getGlobalSessions(
      query.courseCycleIds,
      startDate,
      endDate,
    );
  }

  @Get('evaluation/:evaluationId')
  @ResponseMessage('Eventos obtenidos exitosamente')
  async getByEvaluation(
    @Param('evaluationId') evaluationId: string,
    @CurrentUser() user: User,
  ): Promise<ClassEventResponseDto[]> {
    const events = await this.classEventsService.getEventsByEvaluation(
      evaluationId,
      user,
    );

    if (events.length === 0) {
      return [];
    }

    return this.mapEventsToResponse(events);
  }

  @Get(':id')
  @ResponseMessage('Detalle del evento obtenido exitosamente')
  async getDetail(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ClassEventResponseDto> {
    const event = await this.classEventsService.getEventDetail(id, user);
    return this.mapEventToResponse(event);
  }

  @Get(':id/recording-link')
  @Roles(
    ROLE_CODES.STUDENT,
    ROLE_CODES.PROFESSOR,
    ROLE_CODES.ADMIN,
    ROLE_CODES.SUPER_ADMIN,
  )
  @ResponseMessage('URL autorizada de grabacion obtenida exitosamente')
  async getAuthorizedRecordingLink(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return await this.classEventsService.getAuthorizedRecordingLink(user, id);
  }

  @Post(':id/recording-upload/start')
  @Roles(ROLE_CODES.PROFESSOR, ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Upload de grabacion iniciado exitosamente')
  async startRecordingUpload(
    @Param('id') id: string,
    @Body() dto: StartClassEventRecordingUploadDto,
    @CurrentUser() user: User,
  ) {
    return await this.recordingUploadsService.startUpload(id, user, dto);
  }

  @Get(':id/recording-upload/status')
  @Roles(ROLE_CODES.PROFESSOR, ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Estado de upload de grabacion obtenido exitosamente')
  async getRecordingUploadStatus(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return await this.recordingUploadsService.getUploadStatus(id, user);
  }

  @Post(':id/recording-upload/heartbeat')
  @Roles(ROLE_CODES.PROFESSOR, ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Heartbeat de upload de grabacion actualizado exitosamente')
  async heartbeatRecordingUpload(
    @Param('id') id: string,
    @Body() dto: HeartbeatClassEventRecordingUploadDto,
    @CurrentUser() user: User,
  ) {
    return await this.recordingUploadsService.heartbeatUpload(
      id,
      user,
      dto.uploadToken,
    );
  }

  @Post(':id/recording-upload/finalize')
  @Roles(ROLE_CODES.PROFESSOR, ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Grabacion publicada exitosamente')
  async finalizeRecordingUpload(
    @Param('id') id: string,
    @Body() dto: FinalizeClassEventRecordingUploadDto,
    @CurrentUser() user: User,
  ) {
    return await this.recordingUploadsService.finalizeUpload(id, user, dto);
  }

  @Post(':id/recording-upload/cancel')
  @Roles(ROLE_CODES.PROFESSOR, ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Intento de upload de grabacion cancelado exitosamente')
  async cancelRecordingUpload(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return await this.recordingUploadsService.cancelUpload(id, user);
  }

  @Patch(':id')
  @Roles(ROLE_CODES.PROFESSOR, ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Evento actualizado exitosamente')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClassEventDto,
    @CurrentUser() user: User,
  ): Promise<ClassEventResponseDto> {
    const event = await this.classEventsService.updateEvent(
      id,
      user,
      dto.title,
      dto.topic,
      dto.startDatetime
        ? parseBusinessDatetimeToUtc(dto.startDatetime, 'startDatetime')
        : undefined,
      dto.endDatetime
        ? parseBusinessDatetimeToUtc(dto.endDatetime, 'endDatetime')
        : undefined,
      dto.liveMeetingUrl,
      dto.recordingUrl,
    );

    const eventDetail = await this.classEventsService.getEventDetail(
      event.id,
      user,
    );
    return this.mapEventToResponse(eventDetail);
  }

  @Delete(':id/cancel')
  @Roles(ROLE_CODES.PROFESSOR, ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseMessage('Evento cancelado exitosamente')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.classEventsService.cancelEvent(id, user);
  }

  @Post(':id/professors')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Profesor asignado exitosamente')
  async assignProfessor(
    @Param('id') id: string,
    @Body() dto: AssignProfessorDto,
  ): Promise<void> {
    await this.classEventsService.assignProfessor(id, dto.professorUserId);
  }

  @Delete(':id/professors/:professorId')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseMessage('Profesor removido exitosamente')
  async removeProfessor(
    @Param('id') id: string,
    @Param('professorId') professorId: string,
  ): Promise<void> {
    await this.classEventsService.removeProfessor(id, professorId);
  }
}
