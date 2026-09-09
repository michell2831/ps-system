import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SlaComputationLog } from '../database/sla-computation-log.entity';
import { SlaRule } from '../database/sla-rule.entity';
import { Holiday } from '../database/holiday.entity';
import { ComputeSlaDto } from '../dto/compute-sla.dto';
import { computeWorkingMinutes, mapToOpcrScore, SlaScheduleConfig, HolidayDate } from './sla-computation.algorithm';

interface ServiceCatalogueSlaInfo {
  id: string;
  name: string;
  sla_target_value: number;
  sla_target_unit: 'Minutes' | 'Hours' | 'Days';
}

/**
 * PS022 — the SLA Computation Engine. BE1 owns this exclusively.
 *
 * Writes to BE2's `sla_computation_log` table (see
 * database/sla-computation-log.entity.ts, owned/created by BE2). This
 * service is deliberately the *only* place that inserts rows into that
 * table — BE2's MonitorService only reads from it.
 */
@Injectable()
export class SlaComputationService {
  private readonly logger = new Logger(SlaComputationService.name);

  constructor(
    @InjectRepository(SlaComputationLog, 'kpi_sla_db')
    private readonly logRepo: Repository<SlaComputationLog>,

    @InjectRepository(SlaRule, 'kpi_sla_db')
    private readonly slaRuleRepo: Repository<SlaRule>,

    @InjectRepository(Holiday, 'kpi_sla_db')
    private readonly holidayRepo: Repository<Holiday>,

    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Converts an SLA target expressed in Minutes/Hours/Days into a single
   * "days" unit so it can be compared against computed_duration_days.
   * Assumes an 8-hour working day for the Hours/Minutes -> Days conversion;
   * revisit once the office confirms the exact working-day length.
   */
  private normalizeTargetToDays(value: number, unit: ServiceCatalogueSlaInfo['sla_target_unit']): number {
    if (unit === 'Days') return value;
    if (unit === 'Hours') return value / 8;
    return value / (8 * 60); // Minutes
  }

  /**
   * Fetches the service's SLA target + name from the service-catalogue
   * microservice (cross-service call, same pattern as
   * validateServiceExists in kpi-sla.service.ts).
   */
  private async fetchServiceSlaInfo(service_id: string, office?: string): Promise<ServiceCatalogueSlaInfo> {
    const baseUrl = this.config.get<string>('SERVICE_CATALOGUE_URL');
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${baseUrl}/api/services/${service_id}`, {
          headers: office ? { 'x-office': office } : {},
        }),
      );
      return data;
    } catch {
      throw new NotFoundException(`Service ${service_id} not found in service-catalogue`);
    }
  }

  /**
   * PS022: the full SLA computation algorithm.
   *  1. Receive transaction_id, service_id, office, time_in, time_out (DTO, validated by controller)
   *  2. Fetch SLA target from service-catalogue using service_id
   *  3-5. Compute elapsed working time (skip weekends/CUSTOM off-days, holidays, respect office hours)
   *  6. Map to 1-5 OPCR Timeliness Score
   *  7. Build response payload
   *  8. Persist to sla_computation_log (BE2's table)
   */
  async compute(dto: ComputeSlaDto): Promise<{
    transaction_id: string;
    opcr_score: number;
    computed_duration_days: number;
    sla_target_days: number;
    evaluated_at: Date;
  }> {
    const timeIn = new Date(dto.time_in);
    const timeOut = new Date(dto.time_out);

    // Step 2: SLA target from service-catalogue
    const serviceInfo = await this.fetchServiceSlaInfo(dto.service_id, dto.office);
    const slaTargetDays = this.normalizeTargetToDays(serviceInfo.sla_target_value, serviceInfo.sla_target_unit);

    // Steps 3 & 5: office's SLA Rule (working days + working hours).
    // Falls back to any active rule if office wasn't supplied — same
    // defensive spirit as the rest of this PS022 implementation.
    const slaRule = dto.office
      ? await this.slaRuleRepo.findOne({ where: { office: dto.office, is_active: true } })
      : await this.slaRuleRepo.findOne({ where: { is_active: true } });

    if (!slaRule) {
      throw new NotFoundException(
        dto.office
          ? `No active SLA rule configured for office ${dto.office}`
          : 'No active SLA rule configured',
      );
    }

    const schedule: SlaScheduleConfig = {
      work_schedule_type: slaRule.work_schedule_type,
      work_schedule_config: (slaRule.work_schedule_config as unknown as string[]) ?? null,
      work_start_time: slaRule.work_start_time,
      work_end_time: slaRule.work_end_time,
    };

    // Step 4: holidays (both recurring and year-specific)
    const holidayRows = await this.holidayRepo.find();
    const holidays: HolidayDate[] = holidayRows.map((h) => ({ month: h.month, day: h.day, year: h.year }));

    const workingMinutes = computeWorkingMinutes(timeIn, timeOut, schedule, holidays);
    const computedDurationDays = workingMinutes / (8 * 60); // same 8h/day convention as the target normalization

    // Step 6: OPCR score
    const pctOfTargetUsed = slaTargetDays > 0 ? (computedDurationDays / slaTargetDays) * 100 : 0;
    const opcrScore = mapToOpcrScore(pctOfTargetUsed);

    // Step 8: persist to BE2's sla_computation_log table
    const saved = await this.logRepo.save(
      this.logRepo.create({
        transaction_id: dto.transaction_id,
        service_id: dto.service_id,
        service_name: serviceInfo.name,
        office: dto.office ?? slaRule.office,
        time_in: timeIn,
        time_out: timeOut,
        computed_duration_days: round2(computedDurationDays),
        sla_target_days: round2(slaTargetDays),
        opcr_score: opcrScore,
      }),
    );

    this.logger.log(
      `SLA computed for transaction ${dto.transaction_id}: ${round2(computedDurationDays)}d / ${round2(slaTargetDays)}d target -> OPCR ${opcrScore}`,
    );

    // Step 7: response payload
    return {
      transaction_id: saved.transaction_id,
      opcr_score: saved.opcr_score,
      computed_duration_days: saved.computed_duration_days,
      sla_target_days: saved.sla_target_days,
      evaluated_at: saved.evaluated_at,
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}