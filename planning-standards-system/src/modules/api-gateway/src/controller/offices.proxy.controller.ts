import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ProxyService } from '../service/proxy.service';

@ApiTags('Offices (proxied from ARMS)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/offices')
export class OfficesProxyController {
    constructor(
        private readonly proxy: ProxyService,
        private readonly config: ConfigService,
    ) { }

    @All()
    @ApiOperation({ summary: 'Proxies to ARMS auth-service/gateway: /offices' })
    base(@Req() req: Request, @Res() res: Response) {
        // Rewrite req.originalUrl and req.url so downstream ARMS router handles it on /offices
        req.url = req.url.replace(/^\/api\/offices/, '/offices');
        req.originalUrl = req.originalUrl.replace(/^\/api\/offices/, '/offices');
        
        const armsAuthUrl = this.config.get<string>('ARMS_AUTH_URL') || 'http://localhost:3000';
        return this.proxy.forward(req, res, armsAuthUrl);
    }
}
