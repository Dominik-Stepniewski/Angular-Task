import { DynamicModule, Module } from '@nestjs/common';
import { MongoService } from './mongo.service';

export interface MongoModuleOptions {
  uri: string;
  dbName: string;
}

@Module({})
export class MongoModule {
  static forRoot(options: MongoModuleOptions): DynamicModule {
    const provider = {
      provide: MongoService,
      useFactory: async (): Promise<MongoService> => {
        const service = new MongoService();
        await service.connect(options.uri, options.dbName);
        return service;
      },
    };

    return {
      module: MongoModule,
      global: true,
      providers: [provider],
      exports: [MongoService],
    };
  }
}
