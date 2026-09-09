import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MonitorService } from '../service/monitor.service';
import { GetSlaLogsQueryDto } from '../dto/get-sla-logs-query.dto';
import { CreateServiceUtilizationDto } from '../dto/create-service-utilization.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permission } from '../../../common/rbac/permission.enum';

@ApiTags('SLA Computation Monitor & Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api')
export class MonitorController {
  constructor(private readonly monitor: MonitorService) {}

  // ── Task 9: SLA computation log (read-only, paginated) ──────────────────
  @Get('sla-computation-logs')
  @Roles(Permission.KPIS_READ)
  @ApiOperation({ summary: 'Task 9 — read-only SLA computation log (paginated)' })
  @ApiQuery({ name: 'service_id', required: false })
  @ApiQuery({ name: 'transaction_id', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sort_by', required: false })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['ASC', 'DESC'] })
  getComputationLogs(@Query() query: GetSlaLogsQueryDto) {
    const { service_id, transaction_id, ...pagination } = query;
    return this.monitor.findComputationLogs({ service_id, transaction_id }, pagination);
  }

  // ── Task 9: Service utilization (read-only list) ────────────────────────
  @Get('service-utilization')
  @Roles(Permission.KPIS_READ)
  @ApiOperation({ summary: 'Task 9 — read-only quarterly service utilization counts' })
  getServiceUtilization() {
    return this.monitor.findServiceUtilization();
  }

  // ── Task 9 / Contract B3: ingest aggregated counts from EMS ─────────────
  @Post('service-utilization')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Permission.KPIS_WRITE)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Contract B3 — record/update an EMS quarterly utilization count (upsert)' })
  ingestServiceUtilization(@Body() dto: CreateServiceUtilizationDto) {
    return this.monitor.upsertServiceUtilization(dto);
  }

  // ── Task 8: KPI half of the overall-performance analytics ───────────────
  // Internal: called by the API gateway's analytics aggregator.
  @Get('analytics/kpi-summary')
  @Roles(Permission.KPIS_READ)
  @ApiOperation({ summary: 'Task 8 — KPI totals + type distribution + target % (for dashboard)' })
  getKpiAnalyticsSummary() {
    return this.monitor.getKpiAnalyticsSummary();
  }
}
