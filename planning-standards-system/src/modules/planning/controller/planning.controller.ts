import {
    Controller,
    Get,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { PlanningService } from '../service/planning.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permission } from '../../../common/rbac/permission.enum';

@ApiTags('Planning Hub')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiHeader({
    name: 'x-office',
    description: 'Office identifier set by the gateway from the validated ARMS token',
    required: false,
})
@Controller('api/planning')
export class PlanningController {
    constructor(private readonly svc: PlanningService) {}

    // ── PS-P01: Planning Configuration Hub ────────────────────────────────
    // AC1: only Planning Officer reaches this; all others receive 403.
    // NOTE: Aggregation logic is stubbed pending PM decision on office list
    // source (Blocker 1 — hardcoded pilot list vs. ARMS /api/offices proxy).
    // See PlanningService.getHubSummary() for the TODO marker.
    @Get('hub-summary')
    @Roles(Permission.PLANNING_HUB_READ)
    @ApiOperation({
        summary: 'PS-P01 — Planning Configuration Hub summary (Planning Officer only). ' +
                 'Returns office overview cards, KPI standards, SLA summary, and evaluation periods ' +
                 'across all offices in a single parallel-fetched response.',
    })
    getHubSummary(@Request() req) {
        // Planning Officer always sees all offices — force isCrossOffice: true
        // regardless of the caller's own token flag.
        return this.svc.getHubSummary();
    }

    // ── PS-P06: Campus OPCR Tracker ────────────────────────────────────────
    // AC1: only Planning Officer reaches this; all others receive 403.
    // AC4: all pilot offices appear in response, including offices with no
    //      commitment row for the given period (shows as "Not Started").
    @Get('opcr-status')
    @Roles(Permission.PLANNING_HUB_READ)
    @ApiOperation({
        summary: 'PS-P06 — Campus OPCR Tracker status per office for a given period ' +
                 '(Planning Officer only). Locked → "Submitted", Draft → "In Progress", ' +
                 'no row → "Not Started".',
    })
    @ApiQuery({ name: 'period_id', required: true, description: 'UUID of the evaluation period to query' })
    getOpcrStatus(@Request() req, @Query('period_id') periodId: string) {
        return this.svc.getOpcrStatus(periodId);
    }

    // ── PS-P07: Planning Timeline ──────────────────────────────────────────
    // AC1: only Planning Officer (and SuperAdmin) reaches this; all others receive 403.
    @Get('timeline')
    @Roles(Permission.PLANNING_TIMELINE_READ)
    @ApiOperation({
        summary: 'PS-P07 — Campus planning timeline: all evaluation periods + per-office OPCR submission status',
    })
    @ApiQuery({ name: 'year', required: false, description: 'Filter evaluation periods by year (defaults to current year)' })
    getTimeline(@Request() req, @Query('year') year?: string) {
        return this.svc.getTimeline(year);
    }
}
