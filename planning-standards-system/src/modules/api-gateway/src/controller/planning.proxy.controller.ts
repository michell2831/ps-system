import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ProxyService } from '../service/proxy.service';

@ApiTags('Planning Hub & OPCR Tracker (proxied)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/planning')
export class PlanningController {
    constructor(
        private readonly proxy: ProxyService,
        private readonly config: ConfigService,
    ) {}

    private get target(): string {
        return this.config.get<string>('PLANNING_URL');
    }

    @All('hub-summary')
    @ApiOperation({ summary: 'Proxies to planning: GET /api/planning/hub-summary (PS-P01)' })
    hubSummary(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }

    @All('opcr-status')
    @ApiOperation({ summary: 'Proxies to planning: GET /api/planning/opcr-status (PS-P06)' })
    opcrStatus(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }

    // Wildcard catch-all for any future /api/planning/* routes
    @All('*')
    planningWildcard(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }
}
