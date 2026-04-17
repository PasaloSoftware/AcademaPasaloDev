import { Controller, Get, Param, Query } from '@nestjs/common';
import { CyclesService } from '@modules/cycles/application/cycles.service';
import { AcademicCycleResponseDto } from '@modules/cycles/dto/academic-cycle-response.dto';
import { CyclesHistoryQueryDto } from '@modules/cycles/dto/cycles-history.dto';
import { Auth } from '@common/decorators/auth.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ResponseMessage } from '@common/decorators/response-message.decorator';
import { plainToInstance } from 'class-transformer';
import { ROLE_CODES } from '@common/constants/role-codes.constants';

@Controller('cycles')
@Auth()
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @Get()
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Ciclos académicos obtenidos exitosamente')
  async findAll() {
    const cycles = await this.cyclesService.findAll();
    return plainToInstance(AcademicCycleResponseDto, cycles, {
      excludeExtraneousValues: true,
    });
  }

  @Get('active')
  @ResponseMessage('Ciclo académico activo obtenido exitosamente')
  async findActive() {
    const cycle = await this.cyclesService.getActiveCycle();
    return plainToInstance(AcademicCycleResponseDto, cycle, {
      excludeExtraneousValues: true,
    });
  }

  @Get('history')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Historial de ciclos académicos obtenido exitosamente')
  async getHistory(@Query() query: CyclesHistoryQueryDto) {
    return this.cyclesService.getHistory(query.page ?? 1);
  }

  @Get(':id')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Ciclo académico obtenido exitosamente')
  async findOne(@Param('id') id: string) {
    const cycle = await this.cyclesService.findOne(id);
    return plainToInstance(AcademicCycleResponseDto, cycle, {
      excludeExtraneousValues: true,
    });
  }
}
