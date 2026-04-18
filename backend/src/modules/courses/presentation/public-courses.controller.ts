import { Controller, Get } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ResponseMessage } from '@common/decorators/response-message.decorator';
import { CoursesService } from '@modules/courses/application/courses.service';
import { PublicCourseCatalogItemDto } from '@modules/courses/dto/public-course-catalog.dto';

@Controller('public/courses')
export class PublicCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('landing')
  @ResponseMessage('Cursos publicos obtenidos exitosamente')
  async getLandingCatalog() {
    const items = await this.coursesService.getPublicLandingCatalog();
    return plainToInstance(PublicCourseCatalogItemDto, items, {
      excludeExtraneousValues: true,
    });
  }
}
