import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ProxyService } from '../service/proxy.service';

@ApiTags('Commitment & OPCR (proxied)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api')
export class CommitmentProxyController {
    constructor(
        private readonly proxy: ProxyService,
        private readonly config: ConfigService,
    ) { }

    private get target(): string {
        return this.config.get<string>('COMMITMENT_URL');
    }

    @All('commitments')
    @ApiOperation({ summary: 'Proxies to commitment: /api/commitments' })
    commitments(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }

    @All('commitments/*')
    commitmentsWildcard(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }

    @All('dashboard')
    @ApiOperation({ summary: 'Proxies to commitment: /api/dashboard' })
    dashboard(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }

    @All('dashboard/*')
    dashboardWildcard(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }

    @All('audit-events')
    @ApiOperation({ summary: 'Proxies to commitment: /api/audit-events' })
    auditEvents(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }

    @All('audit-events/*')
    auditEventsWildcard(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }

    @All('opcr')
    @ApiOperation({ summary: 'Proxies to commitment: /api/opcr (used by EMS + ARMS)' })
    opcr(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }

    @All('opcr/*')
    opcrWildcard(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }

    // ── Story 2 (PS018) — Report Export ──────────────────────────────────
    @All('reports/generate')
    @ApiOperation({ summary: 'Proxies to commitment: POST /api/reports/generate' })
    reportsGenerate(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }

    @All('reports/*')
    @ApiOperation({ summary: 'Proxies to commitment: /api/reports/* (e.g. download)' })
    reportsWildcard(@Req() req: Request, @Res() res: Response) {
        return this.proxy.forward(req, res, this.target);
    }
}