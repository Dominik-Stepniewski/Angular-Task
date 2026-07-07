import { DynamicModule, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

export interface RedisModuleOptions {
  url: string;
}

@Module({})
export class RedisModule {
  static forRoot(options: RedisModuleOptions): DynamicModule {
    const provider = {
      provide: RedisService,
      useFactory: async (): Promise<RedisService> => {
        const service = new RedisService();
        await service.connect(options.url);
        return service;
      },
    };

    return {
      module: RedisModule,
      global: true,
      providers: [provider],
      exports: [RedisService],
    };
  }
}
