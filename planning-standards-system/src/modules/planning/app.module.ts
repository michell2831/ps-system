import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PlanningController } from './controller/planning.controller';
import { PlanningService } from './service/planning.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestContextMiddleware } from '../../common/context/request-context';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        HttpModule,
        // NOTE: No TypeOrmModule — this service is read-only aggregation.
        // All data is fetched via HttpService from kpi-sla, service-catalogue,
        // and commitment. No local DB is needed.
    ],
    controllers: [PlanningController],
    providers: [PlanningService, JwtAuthGuard, RolesGuard],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RequestContextMiddleware)
            .forRoutes({ path: '*', method: RequestMethod.ALL });
    }
}
