import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { technicalSettings } from '@config/technical-settings';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { Career } from '@modules/users/domain/career.entity';
import { USER_CACHE_KEYS } from '@modules/users/domain/user.constants';

@Injectable()
export class CareerRepository {
  private static readonly CAREERS_CACHE_TTL_SECONDS =
    technicalSettings.cache.users.careersCatalogCacheTtlSeconds;

  constructor(
    @InjectRepository(Career)
    private readonly repository: Repository<Career>,
    private readonly cacheService: RedisCacheService,
  ) {}

  async findAll(): Promise<Career[]> {
    const cacheKey = USER_CACHE_KEYS.CAREERS_CATALOG;
    const cached =
      await this.cacheService.get<Array<{ id: number; name: string }>>(
        cacheKey,
      );

    if (cached) {
      return cached.map((item) => this.repository.create(item));
    }

    const careers = await this.repository.find({
      order: { name: 'ASC' },
    });

    await this.cacheService.set(
      cacheKey,
      careers.map((career) => ({ id: career.id, name: career.name })),
      CareerRepository.CAREERS_CACHE_TTL_SECONDS,
    );

    return careers;
  }

  async findById(id: number): Promise<Career | null> {
    return await this.repository.findOne({ where: { id } });
  }
}
