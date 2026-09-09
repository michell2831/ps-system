import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SlaComputationService } from '../service/sla-computation.service';
import { ComputeSlaDto } from '../dto/compute-sla.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permission } from '../../../common/rbac/permission.enum';

/**
 * PS022 — SLA Computation Engine. BE1 owns this controller exclusively.
 * The read-only Monitor endpoints (GET sla-computation-logs,
 * GET/POST service-utilization, GET analytics/kpi-summary) live in BE2's
 * MonitorController instead.
 */
@ApiTags('SLA Computation Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/sla')
export class SlaComputationController {
    constructor(private readonly svc: SlaComputationService) { }

    /**
     * Called by EMS whenever a transaction is closed out. Computes the
     * working-day duration and OPCR Timeliness Score, logs the result to
     * BE2's sla_computation_log table, and returns it synchronously.
     *
     * NOTE: this is a server-to-server call from EMS, so unlike the rest of
     * PSS it trusts `office` from the request body rather than deriving it
     * from req.user. Revisit the auth story here (e.g. a dedicated
     * service-to-service credential) before this goes past the Capstone 1
     * proof-of-concept stage.
     */
    @Post('compute')
    @HttpCode(HttpStatus.CREATED)
    @Roles(Permission.KPIS_WRITE)
    @ApiOperation({ summary: 'Compute SLA timeliness for a completed transaction (Contract B2 / PS022)' })
    compute(@Body() dto: ComputeSlaDto) {
        return this.svc.compute(dto);
    }
}