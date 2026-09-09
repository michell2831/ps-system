import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { RequestContext } from '../../../common/context/request-context';

// ─────────────────────────────────────────────────────────────────────────────
// Response shape interfaces (filled in once office list source is confirmed)
// ─────────────────────────────────────────────────────────────────────────────

export interface OfficeCard {
    office: string;
    activePeriod: string | null;
    commitmentStatus: string | null;
    activeKpiCount: number;
    activeServiceCount: number;
}

export interface HubSummaryResponse {
    officeCards: OfficeCard[];
    kpiStandards: any[];      // TODO: type fully once downstream shape confirmed
    evaluationPeriods: any[]; // TODO: type fully once downstream shape confirmed
    generatedAt: string;
}

export interface OpcrOfficeStatus {
    office: string;
    status: 'Submitted' | 'In Progress' | 'Not Started';
    rawStatus?: string | null;
    commitmentId: string | null;
    versionNumber: number | null;
    dateSubmittedOrSaved?: string | null;
    submittedBy?: string | null;
}

export interface OpcrStatusResponse {
    periodId: string;
    offices: OpcrOfficeStatus[];
    generatedAt: string;
}

export interface TimelineOfficeStatus {
    office: string;
    status: 'Submitted' | 'In Progress' | 'Not Started';
    commitmentStatus: string | null;
    commitmentId: string | null;
}

export interface TimelinePeriodEntry {
    id: string;
    name: string;
    periodType: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    status: 'Active' | 'Queued' | 'Completed' | string;
    rawStatus: string;
    isActive: boolean;
    year: number;
    offices: TimelineOfficeStatus[];
}

export interface PlanningTimelineResponse {
    year: number;
    availableYears: number[];
    total: number;
    periods: TimelinePeriodEntry[];
    generatedAt: string;
}

@Injectable()
export class PlanningService {
    private readonly logger = new Logger(PlanningService.name);

    constructor(
        private readonly http: HttpService,
        private readonly config: ConfigService,
    ) {}

    // ── Downstream headers (mirrors commitment.service.ts pattern) ──────────
    private downstreamHeaders(forceCrossOffice = true): Record<string, string> {
        const ctx = RequestContext.get();
        return {
            'x-office':            ctx?.office ?? 'unknown-office',
            // Planning hub always reads cross-office — force true regardless
            // of the caller's own isCrossOffice flag.
            'x-is-cross-office':   forceCrossOffice ? 'true' : (ctx?.isCrossOffice ? 'true' : 'false'),
            'x-role':              'Admin',
            'x-actor-id':          ctx?.actorId ?? 'system',
            'x-actor-username':    ctx?.actorUsername ?? '',
        };
    }

    // ── PS-P01: Planning Configuration Hub ────────────────────────────────
    // ⚠️  BLOCKED — Blocker 1 (office list source) pending PM confirmation.
    //
    // WHAT IS BLOCKED: the outer "per-office card" loop. We need a list of
    // canonical office identifiers to iterate over so we can match commitment
    // rows, KPI counts, and service counts per office. Two options:
    //   (a) Call GET /api/offices → ARMS proxy (dynamic, accurate, requires
    //       PLANNING_URL env var to point back to the gateway or ARMS directly)
    //   (b) Hardcode pilot office identifiers in config/env (e.g. PILOT_OFFICES)
    //
    // WHAT IS ALREADY SAFE TO WIRE (once office list is resolved):
    //   - GET {KPI_SLA_URL}/api/periods  (cross-office)   → evaluationPeriods
    //   - GET {KPI_SLA_URL}/api/kpis     (cross-office)   → kpiStandards + per-office count
    //   - GET {KPI_SLA_URL}/api/sla-rules (cross-office)  → slaSummary
    //   - GET {COMMITMENT_URL}/api/commitments (cross-office) → per-office commitment status
    //   - GET {SERVICE_CATALOGUE_URL}/api/services (cross-office) → per-office service count
    //
    // ── Option A: Dynamic Office List from ARMS / Gateway ──────────────────
    /**
     * Dynamically fetches canonical office list from ARMS via the API Gateway proxy
     * (GET /api/offices) or direct ARMS auth service (GET /offices).
     * Falls back gracefully to standard pilot offices if ARMS is offline in local dev/testing.
     */
    async fetchOfficeList(): Promise<string[]> {
        const gatewayUrl = this.config.get<string>('API_GATEWAY_URL') || 'http://localhost:4003';
        const armsUrl    = this.config.get<string>('ARMS_AUTH_URL') || 'http://localhost:3000';
        const headers    = this.downstreamHeaders(true);

        const candidateUrls = [
            `${gatewayUrl}/api/offices`,
            `${armsUrl}/offices`,
        ];

        for (const url of candidateUrls) {
            try {
                const res = await firstValueFrom(
                    this.http.get(url, { headers, timeout: 3000 }),
                );
                const rawList = Array.isArray(res.data)
                    ? res.data
                    : (Array.isArray(res.data?.data) ? res.data.data : []);

                if (rawList.length > 0) {
                    const extracted = rawList
                        .map((item: any) => {
                            if (typeof item === 'string') return item;
                            return item?.code || item?.office_id || item?.id || item?.name || null;
                        })
                        .filter((item): item is string => !!item && typeof item === 'string');

                    if (extracted.length > 0) {
                        return Array.from(new Set(extracted));
                    }
                }
            } catch (err: any) {
                this.logger.debug(`fetchOfficeList: attempt failed on ${url} (${err.message}). Trying next candidate.`);
            }
        }

        // Fallback for local dev/testing if ARMS service is not yet running
        return [
            'Campus Academic Office',
            'Campus Student Services and Affairs Office',
            'Campus Administrative Office',
        ];
    }

    // ── PS-P01: Planning Configuration Hub ────────────────────────────────
    // All upstream calls happen in parallel via Promise.all (AC8 performance requirement ≤3s).
    async getHubSummary(): Promise<HubSummaryResponse> {
        const kpiSlaUrl        = this.config.get<string>('KPI_SLA_URL');
        const commitmentUrl    = this.config.get<string>('COMMITMENT_URL');
        const catalogueUrl     = this.config.get<string>('SERVICE_CATALOGUE_URL');
        const headers          = this.downstreamHeaders(true);

        const start = Date.now();

        try {
            // Parallel fetch — all 5 sources (including ARMS office list) at once (AC8: ≤3s requirement)
            const [periodsRes, kpisRes, commitmentsRes, servicesRes, fetchedOffices] = await Promise.all([
                firstValueFrom(this.http.get(`${kpiSlaUrl}/api/periods`,    { headers })),
                firstValueFrom(this.http.get(`${kpiSlaUrl}/api/kpis?limit=100`,      { headers })),
                firstValueFrom(this.http.get(`${commitmentUrl}/api/commitments`, { headers })),
                firstValueFrom(this.http.get(`${catalogueUrl}/api/services?limit=100`, { headers })),
                this.fetchOfficeList(),
            ]);

            const elapsed = Date.now() - start;
            if (elapsed > 1000) {
                this.logger.warn(`getHubSummary: slow aggregation — ${elapsed}ms (AC8 budget: 3000ms)`);
            }
            this.logger.debug(`getHubSummary: aggregation completed in ${elapsed}ms`);

            const periods     = periodsRes.data?.data    ?? periodsRes.data    ?? [];
            const kpis        = kpisRes.data?.data       ?? kpisRes.data       ?? [];
            const commitments = commitmentsRes.data?.data ?? commitmentsRes.data ?? [];
            const services    = servicesRes.data?.data   ?? servicesRes.data   ?? [];

            // Combine ARMS canonical offices with any offices present in commitments data
            const offices = Array.from(
                new Set([
                    ...fetchedOffices,
                    ...commitments.map((c: any) => c.office).filter(Boolean),
                ])
            );

            const officeCards: OfficeCard[] = offices.map((office) => {
                const officeCommitments = commitments.filter((c: any) => c.office === office);
                const activeCommitment  = officeCommitments.find((c: any) => c.status !== 'Draft') ?? officeCommitments[0] ?? null;
                const activePeriod      = periods.find((p: any) => p.id === activeCommitment?.period_id) ?? null;

                return {
                    office,
                    activePeriod:       activePeriod?.name ?? null,
                    commitmentStatus:   activeCommitment?.status ?? null,
                    activeKpiCount:     kpis.filter((k: any) => k.office === office).length,
                    activeServiceCount: services.filter((s: any) => s.office === office).length,
                };
            });

            return {
                officeCards,
                kpiStandards:      kpis,
                evaluationPeriods: periods,
                generatedAt:       new Date().toISOString(),
            };
        } catch (err: any) {
            this.logger.error(`getHubSummary: upstream fetch failed — ${err.message}`);
            throw new ServiceUnavailableException(
                'One or more upstream services are unavailable. Please try again shortly.',
            );
        }
    }

    // ── PS-P06: Campus OPCR Tracker ────────────────────────────────────────
    // AC4: all pilot offices appear in response, including offices with no
    // commitment row for the given period (shows as "Not Started").
    async getOpcrStatus(periodId: string): Promise<OpcrStatusResponse> {
        const commitmentUrl = this.config.get<string>('COMMITMENT_URL');
        const headers       = this.downstreamHeaders(true);

        try {
            const [response, fetchedOffices] = await Promise.all([
                firstValueFrom(
                    this.http.get(`${commitmentUrl}/api/commitments`, {
                        params:  { period_id: periodId, limit: 100 },
                        headers,
                    }),
                ) as Promise<{ data: any }>,
                this.fetchOfficeList(),
            ]);

            const commitments: any[] = (response as any).data?.data ?? (response as any).data ?? [];

            // Combine ARMS canonical offices with any offices present in commitments data
            const allOffices = Array.from(
                new Set([
                    ...fetchedOffices,
                    ...commitments.map((c: any) => c.office).filter(Boolean),
                ])
            );

            const officeStatuses: OpcrOfficeStatus[] = allOffices.map((office) => {
                const commitment = commitments.find((c: any) => c.office === office) ?? null;

                let status: OpcrOfficeStatus['status'] = 'Not Started';
                if (commitment?.status === 'Locked') status = 'Submitted';
                else if (commitment?.status === 'Draft' || commitment?.status === 'Revision Requested') {
                    status = 'In Progress';
                }

                return {
                    office,
                    status,
                    rawStatus:      commitment?.status ?? null,
                    commitmentId:   commitment?.id ?? null,
                    versionNumber:  commitment?.version_number ?? null,
                    dateSubmittedOrSaved: commitment?.submitted_at || commitment?.locked_at || commitment?.updated_at || commitment?.created_at || null,
                    submittedBy:    commitment?.submitted_by || commitment?.locked_by || commitment?.created_by || null,
                };
            });

            return {
                periodId,
                offices:     officeStatuses,
                generatedAt: new Date().toISOString(),
            };
        } catch (err: any) {
            this.logger.error(`getOpcrStatus: upstream fetch failed — ${err.message}`);
            throw new ServiceUnavailableException(
                'Commitment service is unavailable. Please try again shortly.',
            );
        }
    }

    // ── PS-P07: Planning Timeline ──────────────────────────────────────────
    // Aggregates evaluation periods from kpi-sla and commitments from commitment service.
    async getTimeline(yearQuery?: string): Promise<PlanningTimelineResponse> {
        const kpiSlaUrl     = this.config.get<string>('KPI_SLA_URL');
        const commitmentUrl = this.config.get<string>('COMMITMENT_URL');
        const headers       = this.downstreamHeaders(true);

        try {
            const [periodsRes, commitmentsRes, fetchedOffices] = await Promise.all([
                firstValueFrom(
                    this.http.get(`${kpiSlaUrl}/api/periods?limit=100`, { headers })
                ) as Promise<{ data: any }>,
                firstValueFrom(
                    this.http.get(`${commitmentUrl}/api/commitments?limit=100`, { headers })
                ) as Promise<{ data: any }>,
                this.fetchOfficeList(),
            ]);

            const allPeriods: any[]     = (periodsRes as any).data?.data ?? (periodsRes as any).data ?? [];
            const allCommitments: any[] = (commitmentsRes as any).data?.data ?? (commitmentsRes as any).data ?? [];

            // Canonical offices list
            const canonicalOffices = Array.from(
                new Set([
                    ...fetchedOffices,
                    ...allCommitments.map((c: any) => c.office).filter(Boolean),
                ])
            );

            // Compute available years from all periods
            const availableYearsSet = new Set<number>();
            allPeriods.forEach((p: any) => {
                if (p.start_date) {
                    const y = new Date(p.start_date).getFullYear();
                    if (!isNaN(y)) availableYearsSet.add(y);
                } else if (p.created_at) {
                    const y = new Date(p.created_at).getFullYear();
                    if (!isNaN(y)) availableYearsSet.add(y);
                }
            });

            const currentYear = new Date().getFullYear();
            availableYearsSet.add(currentYear);
            const availableYears = Array.from(availableYearsSet).sort((a, b) => b - a);

            const selectedYear = yearQuery ? parseInt(yearQuery, 10) : (availableYears[0] || currentYear);

            // Filter periods for the target year
            const filteredPeriods = allPeriods.filter((p: any) => {
                const pYear = p.start_date
                    ? new Date(p.start_date).getFullYear()
                    : (p.created_at ? new Date(p.created_at).getFullYear() : currentYear);
                return pYear === selectedYear;
            });

            // Map each period to a timeline entry with per-office submission mini-status
            const periods: TimelinePeriodEntry[] = filteredPeriods.map((period: any) => {
                const startDateStr = period.start_date ? new Date(period.start_date).toISOString() : '';
                const endDateStr = period.end_date ? new Date(period.end_date).toISOString() : '';

                let durationDays = 0;
                if (period.start_date && period.end_date) {
                    const startMs = new Date(period.start_date).getTime();
                    const endMs = new Date(period.end_date).getTime();
                    durationDays = Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
                }

                // Map status to Active / Queued / Completed
                let displayStatus: 'Active' | 'Queued' | 'Completed' | string = 'Queued';
                const rawStatus = (period.status || '').toLowerCase();
                if (period.is_active || rawStatus === 'active' || rawStatus === 'open') {
                    displayStatus = 'Active';
                } else if (rawStatus === 'completed' || rawStatus === 'closed' || rawStatus === 'archived') {
                    displayStatus = 'Completed';
                } else {
                    displayStatus = 'Queued';
                }

                // Per-office submission statuses for this period
                const periodCommitments = allCommitments.filter((c: any) => c.period_id === period.id);

                const offices: TimelineOfficeStatus[] = canonicalOffices.map((office) => {
                    const commitment = periodCommitments.find((c: any) => c.office === office) ?? null;

                    let status: TimelineOfficeStatus['status'] = 'Not Started';
                    if (commitment?.status === 'Locked') {
                        status = 'Submitted';
                    } else if (commitment?.status === 'Draft' || commitment?.status === 'Revision Requested') {
                        status = 'In Progress';
                    }

                    return {
                        office,
                        status,
                        commitmentStatus: commitment?.status ?? null,
                        commitmentId: commitment?.id ?? null,
                    };
                });

                const pYear = period.start_date
                    ? new Date(period.start_date).getFullYear()
                    : selectedYear;

                return {
                    id: period.id,
                    name: period.name,
                    periodType: period.period_type || 'Quarterly',
                    startDate: startDateStr,
                    endDate: endDateStr,
                    durationDays,
                    status: displayStatus,
                    rawStatus: period.status,
                    isActive: Boolean(period.is_active || displayStatus === 'Active'),
                    year: pYear,
                    offices,
                };
            });

            // Sort chronologically by startDate
            periods.sort((a, b) => {
                const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
                const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
                return timeA - timeB;
            });

            return {
                year: selectedYear,
                availableYears,
                total: periods.length,
                periods,
                generatedAt: new Date().toISOString(),
            };
        } catch (err: any) {
            this.logger.error(`getTimeline: upstream fetch failed — ${err.message}`);
            throw new ServiceUnavailableException(
                'Planning timeline services are unavailable. Please try again shortly.',
            );
        }
    }
}
