import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SlaComputationLog } from '../database/sla-computation-log.entity';
import { ServiceUtilization } from '../database/service-utilization.entity';
import { Kpi } from '../database/kpi.entity';
import { PaginationDto } from '../dto/pagination.dto';
import { CreateServiceUtilizationDto } from '../dto/create-service-utilization.dto';

/**
 * Backs:
 *  - Task 9: SLA Computation Monitor (read-only log + service utilization)
 *  - Task 8: KPI half of the overall-performance analytics summary
 *
 * Kept in a separate service/controller so the SLA-monitor + analytics
 * additions don't touch the existing KpiSlaService/KpiSlaController.
 */
@Injectable()
export class MonitorService {
  constructor(
    @InjectRepository(SlaComputationLog, 'kpi_sla_db')
    private readonly logRepo: Repository<SlaComputationLog>,

    @InjectRepository(ServiceUtilization, 'kpi_sla_db')
    private readonly utilizationRepo: Repository<ServiceUtilization>,

    @InjectRepository(Kpi, 'kpi_sla_db')
    private readonly kpiRepo: Repository<Kpi>,
  ) {}

  // ── Task 9: SLA computation log (read-only, paginated) ──────────────────
  async findComputationLogs(
    filters: { service_id?: string; transaction_id?: string },
    pagination: PaginationDto = new PaginationDto(),
  ): Promise<{ data: SlaComputationLog[]; total: number; page: number; limit: number }> {
    const query = this.logRepo.createQueryBuilder('log');

    if (filters.service_id) {
      query.andWhere('log.service_id = :sid', { sid: filters.service_id });
    }
    if (filters.transaction_id) {
      query.andWhere('log.transaction_id = :tid', { tid: filters.transaction_id });
    }

    const allowedSortFields = ['evaluated_at', 'computed_duration_days', 'opcr_score', 'service_name'];
    const sortBy = allowedSortFields.includes(pagination.sort_by) ? pagination.sort_by : 'evaluated_at';

    const [data, total] = await query
      .orderBy(`log.${sortBy}`, pagination.sort_order)
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();

    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  // ── Task 9: Service utilization (read-only list) ────────────────────────
  async findServiceUtilization(): Promise<ServiceUtilization[]> {
    return this.utilizationRepo.find({
      order: { year: 'DESC', quarter: 'ASC', service_name: 'ASC' },
    });
  }

  /**
   * Ingest a quarterly aggregated count submitted by EMS (Contract B3).
   * Upserts on (service_name, quarter, year). This is a "standard API
   * endpoint" (BE2) — the SLA algorithm itself remains BE1's.
   */
  async upsertServiceUtilization(dto: CreateServiceUtilizationDto): Promise<ServiceUtilization> {
    const existing = await this.utilizationRepo.findOne({
      where: { service_name: dto.service_name, quarter: dto.quarter, year: dto.year },
    });

    if (existing) {
      Object.assign(existing, {
        service_id: dto.service_id ?? existing.service_id,
        office: dto.office ?? existing.office,
        transaction_count: dto.transaction_count,
        source: dto.source ?? existing.source ?? 'EMS',
      });
      return this.utilizationRepo.save(existing);
    }

    const row = this.utilizationRepo.create({ ...dto, source: dto.source ?? 'EMS' });
    return this.utilizationRepo.save(row);
  }

  // ── Task 8: KPI half of overall-performance analytics ───────────────────
  async getKpiAnalyticsSummary(): Promise<{
    total_kpis: number;
    kpi_type_distribution: Record<string, number>;
    overall_target_pct: number | null;
  }> {
    const total_kpis = await this.kpiRepo.count({ where: { is_active: true } });

    const rawDistribution = await this.kpiRepo
      .createQueryBuilder('kpi')
      .select('kpi.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('kpi.is_active = :active', { active: true })
      .groupBy('kpi.category')
      .getRawMany<{ category: string; count: string }>();

    const kpi_type_distribution: Record<string, number> = {};
    for (const row of rawDistribution) {
      kpi_type_distribution[row.category] = Number(row.count);
    }

    // "Overall institutional target %" — average target_value of KPIs measured
    // in percent. (Assumption: see task notes; the dashboard treats this as the
    // mean of percentage targets across active KPIs.)
    const avgRow = await this.kpiRepo
      .createQueryBuilder('kpi')
      .select('AVG(kpi.target_value)', 'avg')
      .where('kpi.is_active = :active', { active: true })
      .andWhere("kpi.unit = 'PERCENT'")
      .getRawOne<{ avg: string | null }>();

    const overall_target_pct = avgRow?.avg != null ? Math.round(Number(avgRow.avg) * 100) / 100 : null;

    return { total_kpis, kpi_type_distribution, overall_target_pct };
  }
}
