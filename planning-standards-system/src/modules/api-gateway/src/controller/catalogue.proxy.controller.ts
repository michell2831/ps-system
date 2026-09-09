import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ProxyService } from '../service/proxy.service';

@ApiTags('Service Catalogue (proxied)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api')
export class CatalogueProxyController {
    constructor(
        private readonly proxy: ProxyService,
        private readonly config: ConfigService,
    ) { }

    private get target(): string {
        return this.config.get<string>('SERVICE_CATALOGUE_URL');
    }

    @All('services')
    @ApiOperation({ summary: 'Proxies to service-catalogue: /api/services' })
    services(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }

    @All('services/*')
    @ApiOperation({ summary: 'Proxies to service-catalogue: /api/services/*' })
    servicesWildcard(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }

    @All('service-modes')
    @ApiOperation({ summary: 'Proxies to service-catalogue: /api/service-modes' })
    serviceModes(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }

    @All('service-modes/*')
    @ApiOperation({ summary: 'Proxies to service-catalogue: /api/service-modes/*' })
    serviceModesWildcard(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }
}