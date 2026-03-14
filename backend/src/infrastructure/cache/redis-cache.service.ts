import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import util from 'util';
import { technicalSettings } from '@config/technical-settings';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private redisClient!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>(
      'REDIS_HOST',
      technicalSettings.cache.redis.defaultHost,
    );
    const port = this.configService.get<number>(
      'REDIS_PORT',
      technicalSettings.cache.redis.defaultPort,
    );

    this.redisClient = new Redis({
      host,
      port,
      lazyConnect: true,
    });

    this.redisClient.on('error', (error: Error) => {
      this.logger.error({
        message: 'Error en la conexion a Redis',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    });

    this.redisClient.on('connect', () => {
      this.logger.log({
        message: 'Conexion a Redis establecida correctamente',
        timestamp: new Date().toISOString(),
      });
    });

    this.redisClient.connect().catch((error: Error) => {
      this.logger.error({
        message: 'Fallo al inicializar la conexion a Redis',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    });
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.error({
        message: 'Error al obtener dato de cache',
        key,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      });
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redisClient.set(key, serializedValue, 'EX', ttlSeconds);
      } else {
        await this.redisClient.set(key, serializedValue);
      }
    } catch (error) {
      this.logger.error({
        message: 'Error al guardar dato en cache',
        key,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async setIfNotExists(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    try {
      const result = await this.redisClient.set(
        key,
        value,
        'EX',
        ttlSeconds,
        'NX',
      );
      return result === 'OK';
    } catch (error) {
      this.logger.error({
        message: 'Error al adquirir lock en Redis',
        key,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async expireIfValueMatches(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    try {
      const result = await this.redisClient.eval(
        `
          if redis.call('GET', KEYS[1]) == ARGV[1] then
            return redis.call('EXPIRE', KEYS[1], ARGV[2])
          end
          return 0
        `,
        1,
        key,
        value,
        String(ttlSeconds),
      );
      return Number(result) === 1;
    } catch (error) {
      this.logger.error({
        message: 'Error al renovar lock en Redis',
        key,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async delIfValueMatches(key: string, value: string): Promise<boolean> {
    try {
      const result = await this.redisClient.eval(
        `
          if redis.call('GET', KEYS[1]) == ARGV[1] then
            return redis.call('DEL', KEYS[1])
          end
          return 0
        `,
        1,
        key,
        value,
      );
      return Number(result) === 1;
    } catch (error) {
      this.logger.error({
        message: 'Error al liberar lock en Redis',
        key,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      this.logger.error({
        message: 'Error al eliminar dato de cache',
        key,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      const chunkSize = 500;
      for (let i = 0; i < keys.length; i += chunkSize) {
        const chunk = keys.slice(i, i + chunkSize);
        if (chunk.length > 0) {
          await this.redisClient.del(...chunk);
        }
      }
    } catch (error) {
      this.logger.error({
        message: 'Error al eliminar multiples llaves de cache',
        keysCount: keys.length,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async addToIndex(
    indexKey: string,
    cacheKey: string,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      await this.redisClient.sadd(indexKey, cacheKey);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.redisClient.expire(indexKey, ttlSeconds);
      }
    } catch (error) {
      this.logger.error({
        message: 'Error al indexar llave de cache',
        indexKey,
        cacheKey,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async invalidateIndex(indexKey: string): Promise<void> {
    try {
      const keys = await this.redisClient.smembers(indexKey);
      if (keys.length > 0) {
        await this.delMany(keys);
      }
      await this.redisClient.del(indexKey);
    } catch (error) {
      this.logger.error({
        message: 'Error al invalidar indice de cache',
        indexKey,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async invalidateGroup(pattern: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = this.redisClient.scanStream({
        match: pattern,
        count: technicalSettings.cache.redis.invalidateGroupScanCount,
      });

      const keysToDelete: string[] = [];

      stream.on('data', (keys: string[]) => {
        if (keys.length > 0) {
          keysToDelete.push(...keys);
        }
      });

      stream.on('end', () => {
        if (keysToDelete.length === 0) {
          this.logger.log({
            message: 'Invalidacion de grupo completada (sin llaves encontradas)',
            pattern,
            keysDeleted: 0,
            timestamp: new Date().toISOString(),
          });
          resolve();
          return;
        }

        this.redisClient
          .del(...keysToDelete)
          .then(() => {
            this.logger.log({
              message: 'Invalidacion de grupo completada',
              pattern,
              keysDeleted: keysToDelete.length,
              timestamp: new Date().toISOString(),
            });
            resolve();
          })
          .catch((error: Error) => {
            reject(error);
          });
      });

      stream.on('error', (error: unknown) => {
        const errObject =
          error instanceof Error
            ? error
            : new Error(util.inspect(error, { depth: null }));
        this.logger.error({
          message: 'Error durante la invalidacion de grupo',
          pattern,
          error: errObject.message,
          timestamp: new Date().toISOString(),
        });
        reject(errObject);
      });
    });
  }
}
