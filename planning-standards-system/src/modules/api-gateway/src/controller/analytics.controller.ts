import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Analytics + Planning Timeline controller.
 * Merged into one controller to avoid a new module registration.
 */
@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/analytics')
export class AnalyticsController {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private downstreamHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (req.user) {
      headers['x-office'] = req.user.office ?? 'unknown-office';
      headers['x-role'] = req.user.role ?? 'Admin';
      headers['x-actor-id'] = req.user.userId ?? req.user.sub ?? 'system';
      headers['x-actor-username'] = req.user.username ?? req.user.userId ?? 'system';
      headers['x-arms-role'] = req.user.armsRole ?? req.user.role ?? 'STAFF';
      headers['x-is-cross-office'] = req.user.isCrossOffice ? 'true' : 'false';
    }
    return headers;
  }

  private async safeGet<T>(url: string, headers: Record<string, string>, fallback: T): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.http.get(url, { headers, validateStatus: () => true }),
      );
      if (res.status >= 200 && res.status < 300) return res.data as T;
      return fallback;
    } catch {
      return fallback;
    }
  }

  @Get('overall-performance')
  @ApiOperation({ summary: 'Task 8 — institutional analytics: active services, total KPIs, target %, KPI-type distribution' })
  async overallPerformance(@Req() req: Request) {
    const headers = this.downstreamHeaders(req);
    const catalogueUrl = this.config.get<string>('SERVICE_CATALOGUE_URL');
    const kpiSlaUrl = this.config.get<string>('KPI_SLA_URL');

    const [services, kpis] = await Promise.all([
      this.safeGet<{ total_active_services: number }>(
        `${catalogueUrl}/api/services/analytics/summary`,
        headers,
        { total_active_services: 0 },
      ),
      this.safeGet<{
        total_kpis: number;
        kpi_type_distribution: Record<string, number>;
        overall_target_pct: number | null;
      }>(
        `${kpiSlaUrl}/api/analytics/kpi-summary`,
        headers,
        { total_kpis: 0, kpi_type_distribution: {}, overall_target_pct: null },
      ),
    ]);

    return {
      total_active_services: services.total_active_services,
      total_kpis: kpis.total_kpis,
      overall_institutional_target_pct: kpis.overall_target_pct,
      kpi_type_distribution: kpis.kpi_type_distribution,
    };
  }

  /**
   * Story 6 — GET /api/analytics/planning-timeline
   *
   * Aggregates evaluation periods from kpi-sla and OPCR commitment
   * statuses from commitment service to produce a campus planning calendar.
   *
   * Accessible to: PlanningOfficer, SuperAdmin, OPCREvaluator (cross-office)
   * Read-only — no write actions on this endpoint.
   *
   * Returns:
   *   periods: Array of periods with their type, dates, status, and per-office OPCR status
   */
  @Get('planning-timeline')
  @ApiOperation({
    summary: 'Story 6 — Campus planning timeline: all evaluation periods + per-office OPCR submission status',
  })
  async planningTimeline(@Req() req: Request) {
    const headers = this.downstreamHeaders(req);
    const kpiSlaUrl = this.config.get<string>('KPI_SLA_URL');
    const commitmentUrl = this.config.get<string>('COMMITMENT_URL');

    // Fetch all periods (cross-office — this endpoint is for planning officers)
    const crossOfficeHeaders = { ...headers, 'x-is-cross-office': 'true' };

    const [periodsRes, commitmentsRes] = await Promise.all([
      this.safeGet<{ data: any[]; total: number }>(
        `${kpiSlaUrl}/api/periods?limit=100`,
        crossOfficeHeaders,
        { data: [], total: 0 },
      ),
      this.safeGet<{ data: any[]; total: number }>(
        `${commitmentUrl}/api/commitments?limit=100`,
        crossOfficeHeaders,
        { data: [], total: 0 },
      ),
    ]);

    const periods = periodsRes?.data ?? [];
    const commitments = commitmentsRes?.data ?? [];

    // Build a lookup: period_id → { office → commitment_status }
    const commitmentMap: Record<string, Record<string, string>> = {};
    for (const c of commitments) {
      if (!commitmentMap[c.period_id]) {
        commitmentMap[c.period_id] = {};
      }
      commitmentMap[c.period_id][c.office] = c.status;
    }

    // Build timeline entries
    const timeline = periods.map((period) => {
      const opcr = commitmentMap[period.id] ?? {};
      const officeStatuses = Object.entries(opcr).map(([office, status]) => ({
        office,
        opcr_status: status === 'Locked' ? 'Submitted ✓' : status === 'Draft' ? 'Draft' : 'Not Started',
        commitment_status: status,
      }));

      return {
        id: period.id,
        name: period.name,
        period_type: period.period_type,
        start_date: period.start_date,
        end_date: period.end_date,
        status: period.status,
        is_active: period.is_active,
        days_until_end: period.days_until_end ?? null,
        warning_level: period.warning_level ?? 'none',
        warning_message: period.warning_message ?? null,
        office_opcr_statuses: officeStatuses,
      };
    });

    // Sort: Active first, then Queued, then Closed
    const statusOrder: Record<string, number> = { Open: 1, Queued: 2, Closed: 3, Archived: 4 };
    timeline.sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));

    return {
      total: timeline.length,
      periods: timeline,
    };
  }
}