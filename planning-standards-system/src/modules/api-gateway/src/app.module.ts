import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CatalogueProxyController } from './controller/catalogue.proxy.controller';
import { KpiSlaProxyController } from './controller/kpi-sla.proxy.controller';
import { CommitmentProxyController } from './controller/commitment.proxy.controller';
import { AnalyticsController } from './controller/analytics.controller';
import { OfficesProxyController } from './controller/offices.proxy.controller';
import { PlanningController } from './controller/planning.proxy.controller';
import { ProxyService } from './service/proxy.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtValidationService } from './service/jwt-validation.service';
import { ForwardedIpInterceptor } from './interceptors/forwarded-ip.interceptor';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        HttpModule,
    ],
    controllers: [
        AnalyticsController,
        CatalogueProxyController,
        KpiSlaProxyController,
        CommitmentProxyController,
        OfficesProxyController,
        PlanningController,
    ],
    providers: [
        ProxyService,
        JwtAuthGuard,
        JwtValidationService,
        {
            provide: APP_INTERCEPTOR,
            useClass: ForwardedIpInterceptor,
        },
    ],
})
export class AppModule { }