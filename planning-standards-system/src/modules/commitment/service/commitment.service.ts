import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    ForbiddenException,
    UnprocessableEntityException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Commitment } from '../database/commitment.entity';
import { CommitmentItem } from '../database/commitment-item.entity';
import { CommitmentVersion } from '../database/commitment-version.entity';
import { CommitmentStatus } from '../enums';
import { CreateCommitmentDto } from '../dto/create-commitment.dto';
import { UpdateCommitmentDto } from '../dto/update-commitment.dto';
import { PaginationDto } from '../dto/pagination.dto';
import { AuditService } from './audit.service';
import { RequestContext } from '../../../common/context/request-context';


export interface ActorContext {
    actor_role?: string;
    actor_username?: string;
    ip_address?: string;
}
export interface CommitmentExportData {
    meta: {
        office: string;
        period_id: string;
        status: string;
        is_draft: boolean;
        version_number: number;
        submitted_by: string | null;
        submitted_at: string | null;
        exported_at: string;
    };
    items: Array<{
        index: number;
        service_id: string;
        kpi_id: string | null;
        target_value: number | null;
        unit: string | null;
    }>;
}

@Injectable()
export class CommitmentService {
    private readonly logger = new Logger(CommitmentService.name);

    constructor(
        @InjectRepository(Commitment, 'commitment_db')
        private readonly commitmentRepo: Repository<Commitment>,

        @InjectRepository(CommitmentItem, 'commitment_db')
        private readonly itemRepo: Repository<CommitmentItem>,

        @InjectRepository(CommitmentVersion, 'commitment_db')
        private readonly versionRepo: Repository<CommitmentVersion>,

        private readonly http: HttpService,
        private readonly config: ConfigService,
        private readonly auditService: AuditService,
    ) { }


    private downstreamHeaders(): Record<string, string> {
        const ctx = RequestContext.get();
        return {
            'x-office': ctx?.office ?? 'unknown-office',
            'x-is-cross-office': ctx?.isCrossOffice ? 'true' : 'false',
            'x-role': ctx?.actorRole ?? '',
            'x-actor-id': ctx?.actorId ?? 'system',
            'x-actor-username': ctx?.actorUsername ?? '',
        };
    }

    private async validatePeriodExists(period_id: string): Promise<void> {
        const baseUrl = this.config.get<string>('KPI_SLA_URL');
        try {
            await firstValueFrom(
                this.http.get(`${baseUrl}/api/periods/${period_id}`, {
                    headers: this.downstreamHeaders(),
                }),
            );
        } catch {
            throw new NotFoundException(`Period ${period_id} not found in kpi-sla service`);
        }
    }

    private async validatePeriodIsOpen(period_id: string): Promise<void> {
        const baseUrl = this.config.get<string>('KPI_SLA_URL');
        try {
            const { data: period } = await firstValueFrom(
                this.http.get(`${baseUrl}/api/periods/${period_id}`, {
                    headers: this.downstreamHeaders(),
                }),
            );

            const status: string = (period?.status ?? '').toLowerCase();

            if (status === 'closed') {
                throw new ForbiddenException(
                    `Period ${period_id} is closed. Drafts cannot be edited for a closed period.`,
                );
            }
        } catch (err) {
            if (err instanceof ForbiddenException) throw err;
            throw new NotFoundException(`Period ${period_id} not found in kpi-sla service`);
        }
    }

    private async validateServiceExists(service_id: string, office: string): Promise<void> {
        const baseUrl = this.config.get<string>('SERVICE_CATALOGUE_URL');
        try {
            await firstValueFrom(
                this.http.get(`${baseUrl}/api/services/${service_id}`, {
                    headers: { 'x-office': office, ...this.downstreamHeaders() },
                }),
            );
        } catch {
            throw new NotFoundException(`Service ${service_id} not found in service-catalogue`);
        }
    }

    private async validateKpiExists(kpi_id: string, office: string): Promise<void> {
        const baseUrl = this.config.get<string>('KPI_SLA_URL');
        try {
            await firstValueFrom(
                this.http.get(`${baseUrl}/api/kpis?include_inactive=false`, {
                    headers: { 'x-office': office, ...this.downstreamHeaders() },
                }),
            );
        } catch {
            // non-blocking — kpi validation is best-effort
        }
    }

    async createCommitment(
        office: string,
        actor: string,
        dto: CreateCommitmentDto,
        ctx: ActorContext = {},
    ): Promise<Commitment> {
        await this.validatePeriodExists(dto.period_id);

        const existingDraft = await this.commitmentRepo.findOne({
            where: { office, period_id: dto.period_id, status: CommitmentStatus.DRAFT },
        });

        if (existingDraft) {
            throw new ConflictException(
                `A Draft commitment already exists for this office and period (${existingDraft.id}). ` +
                `Update the existing draft instead.`,
            );
        }

        if (dto.items?.length > 0) {
            const invalidItems = dto.items
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => item.target_value !== undefined && item.target_value !== null && item.target_value < 0);

            if (invalidItems.length > 0) {
                const failedIndexes = invalidItems.map(({ index }) => `item[${index}]`).join(', ');
                throw new BadRequestException(
                    `target_value must be a positive number. Invalid items: ${failedIndexes}`,
                );
            }
        }

        const commitment = this.commitmentRepo.create({
            office,
            period_id: dto.period_id,
            status: CommitmentStatus.DRAFT,
            version_number: 1,
            created_by: actor,
        });

        const saved = await this.commitmentRepo.save(commitment);

        if (dto.items?.length > 0) {
            const items = dto.items.map((itemDto) =>
                this.itemRepo.create({
                    commitment_id: saved.id,
                    service_id: itemDto.service_id,
                    kpi_id: itemDto.kpi_id,
                    target_value: itemDto.target_value ?? null,
                    unit: itemDto.unit,
                }),
            );
            await this.itemRepo.save(items);
        }

        this.auditService.log({
            event_type: 'COMMITMENT_CREATED',
            actor_id: actor,
            office_id: office,
            resource_id: saved.id,
            details: { period_id: dto.period_id, item_count: dto.items?.length ?? 0 },
            timestamp: new Date().toISOString(),
            actor_role: ctx.actor_role,
            actor_username: ctx.actor_username,
            ip_address: ctx.ip_address,
            service_name: 'pss-commitment',
        });

        return this.findOneCommitment(saved.id, office);
    }

    async findAllCommitments(
        office: string,
        filters: { period_id?: string; status?: string },
        pagination: PaginationDto = new PaginationDto(),
        isCrossOffice: boolean = false,
    ): Promise<{ data: Commitment[]; total: number; page: number; limit: number }> {
        const query = this.commitmentRepo
            .createQueryBuilder('commitment')
            .leftJoinAndSelect('commitment.items', 'items');

        if (isCrossOffice) {
            query.where('1=1');
        } else {
            query.where('commitment.office = :office', { office });
        }

        if (filters.period_id) {
            query.andWhere('commitment.period_id = :period_id', { period_id: filters.period_id });
        }
        if (filters.status) {
            query.andWhere('commitment.status = :status', { status: filters.status });
        }

        const allowedSortFields = ['created_at', 'updated_at', 'status', 'version_number'];
        const sortBy = allowedSortFields.includes(pagination.sort_by) ? pagination.sort_by : 'created_at';

        const [data, total] = await query
            .orderBy(`commitment.${sortBy}`, pagination.sort_order)
            .skip((pagination.page - 1) * pagination.limit)
            .take(pagination.limit)
            .getManyAndCount();

        return { data, total, page: pagination.page, limit: pagination.limit };
    }

    async findOneCommitment(id: string, office: string, isCrossOffice: boolean = false): Promise<Commitment> {
        const commitment = await this.commitmentRepo.findOne({
            where: { id },
            relations: { items: true, versions: true },
        });
        if (!commitment) throw new NotFoundException(`Commitment ${id} not found`);
        if (!isCrossOffice && commitment.office !== office) {
            throw new ForbiddenException('You cannot access commitments from another office');
        }
        return commitment;
    }

    async updateCommitment(
        id: string,
        office: string,
        actor: string,
        dto: UpdateCommitmentDto,
        isCrossOffice: boolean = false,
    ): Promise<Commitment> {
        const commitment = await this.findOneCommitment(id, office, isCrossOffice);

        await this.validatePeriodIsOpen(commitment.period_id);

        if (commitment.status === CommitmentStatus.LOCKED) {
            throw new ForbiddenException(
                'This commitment is locked and cannot be modified. Locked commitments are immutable.',
            );
        }

        if (commitment.status === CommitmentStatus.REVISION_REQUESTED) {
            throw new ForbiddenException(
                'This commitment has a revision in progress and cannot be modified directly. ' +
                'Edit the new Draft revision instead.',
            );
        }

        if (dto.items?.length > 0) {
            const invalidItems = dto.items
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => item.target_value !== undefined && item.target_value !== null && item.target_value < 0);

            if (invalidItems.length > 0) {
                const failedIndexes = invalidItems.map(({ index }) => `item[${index}]`).join(', ');
                throw new BadRequestException(
                    `target_value must be a positive number. Invalid items: ${failedIndexes}`,
                );
            }
        }

        await this.createVersionSnapshot(commitment, actor, 'Draft updated');

        if (dto.items) {
            await this.itemRepo.delete({ commitment_id: commitment.id });
            const items = dto.items.map((itemDto) =>
                this.itemRepo.create({
                    commitment_id: commitment.id,
                    service_id: itemDto.service_id,
                    kpi_id: itemDto.kpi_id,
                    target_value: itemDto.target_value ?? null,
                    unit: itemDto.unit,
                }),
            );
            await this.itemRepo.save(items);
            commitment.items = items;
        }

        commitment.version_number += 1;
        await this.commitmentRepo.save(commitment);

        return this.findOneCommitment(id, office);
    }

    async lockCommitment(
        id: string,
        office: string,
        actor: string,
        ctx: ActorContext = {},
        isCrossOffice: boolean = false,
    ): Promise<Commitment> {
        const commitment = await this.findOneCommitment(id, office, isCrossOffice);

        if (commitment.status === CommitmentStatus.LOCKED) {
            throw new ConflictException('This commitment is already locked.');
        }

        if (commitment.items.length === 0) {
            throw new BadRequestException(
                'Cannot lock: the commitment has no items. Add at least one service with a KPI target.',
            );
        }

        const invalidItems = commitment.items
            .map((item, index) => ({ item, index }))
            .filter(({ item }) =>
                item.target_value === null || item.target_value === undefined || item.target_value <= 0,
            );

        if (invalidItems.length > 0) {
            const failedDetails = invalidItems
                .map(({ item, index }) => `item[${index}] (service_id: ${item.service_id})`)
                .join(', ');
            throw new BadRequestException(
                `Cannot lock: ${invalidItems.length} item(s) have missing or invalid target values. ` +
                `Failed: ${failedDetails}`,
            );
        }

        await this.createVersionSnapshot(commitment, actor, 'Locked by admin');

        commitment.status = CommitmentStatus.LOCKED;
        commitment.locked_by = actor;
        commitment.locked_at = new Date();
        commitment.submitted_by = actor;
        commitment.submitted_at = new Date();
        commitment.version_number += 1;

        await this.commitmentRepo.save(commitment);

        this.auditService.log({
            event_type: 'COMMITMENT_LOCKED',
            actor_id: actor,
            office_id: office,
            resource_id: commitment.id,
            details: {
                period_id: commitment.period_id,
                locked_at: commitment.locked_at,
                item_count: commitment.items.length,
                source: 'PSS',
            },
            timestamp: new Date().toISOString(),
            actor_role: ctx.actor_role,
            actor_username: ctx.actor_username,
            ip_address: ctx.ip_address,
            service_name: 'pss-commitment',
        });

        return this.findOneCommitment(id, office);
    }

    // ── Story 7: Request Revision ──────────────────────────────────────────
    async requestRevision(
        id: string,
        office: string,
        actor: string,
        reason: string,
        ctx: ActorContext = {},
        isCrossOffice: boolean = false,
    ): Promise<Commitment> {
        const locked = await this.findOneCommitment(id, office, isCrossOffice);

        if (locked.status === CommitmentStatus.REVISION_REQUESTED) {
            throw new ConflictException(
                'A revision is already in progress for this commitment. ' +
                'Only one revision can be in progress at a time.',
            );
        }

        if (locked.status !== CommitmentStatus.LOCKED) {
            throw new UnprocessableEntityException(
                'Only Locked commitments can be revised. Draft commitments cannot request a revision.',
            );
        }

        const existingDraft = await this.commitmentRepo.findOne({
            where: {
                office: locked.office,
                period_id: locked.period_id,
                status: CommitmentStatus.DRAFT,
            },
        });

        if (existingDraft) {
            throw new ConflictException(
                `A Draft revision already exists for this commitment (${existingDraft.id}). ` +
                `Only one revision can be in progress at a time.`,
            );
        }

        const revision = this.commitmentRepo.create({
            office: locked.office,
            period_id: locked.period_id,
            status: CommitmentStatus.DRAFT,
            version_number: locked.version_number + 1,
            created_by: actor,
        });

        const savedRevision = await this.commitmentRepo.save(revision);

        if (locked.items?.length > 0) {
            const copiedItems = locked.items.map((item) =>
                this.itemRepo.create({
                    commitment_id: savedRevision.id,
                    service_id: item.service_id,
                    kpi_id: item.kpi_id,
                    target_value: item.target_value,
                    unit: item.unit,
                }),
            );
            await this.itemRepo.save(copiedItems);
        }

        await this.versionRepo.save(
            this.versionRepo.create({
                commitment_id: savedRevision.id,
                version_number: locked.version_number,
                status: locked.status,
                revision_reason: `Revision requested: ${reason}`,
                revised_by: actor,
                snapshot: {
                    source_commitment_id: locked.id,
                    office: locked.office,
                    period_id: locked.period_id,
                    status: locked.status,
                    version_number: locked.version_number,
                    items: locked.items?.map((item) => ({
                        id: item.id,
                        service_id: item.service_id,
                        kpi_id: item.kpi_id,
                        target_value: item.target_value,
                        unit: item.unit,
                    })) ?? [],
                },
            }),
        );

        // AC1/AC3: update the original Locked commitment to 'Revision Requested'.
        // This preserves the record (AC3 — status never reverts to Draft) while
        // reflecting that a revision is actively in progress.
        locked.status = CommitmentStatus.REVISION_REQUESTED;
        await this.commitmentRepo.save(locked);

        this.auditService.log({
            event_type: 'COMMITMENT_REVISION_REQUESTED',
            actor_id: actor,
            office_id: office,
            resource_id: savedRevision.id,
            details: {
                source_commitment_id: locked.id,
                revision_reason: reason,
                new_draft_id: savedRevision.id,
                item_count: locked.items?.length ?? 0,
            },
            timestamp: new Date().toISOString(),
            actor_role: ctx.actor_role,
            actor_username: ctx.actor_username,
            ip_address: ctx.ip_address,
            service_name: 'pss-commitment',
        });

        return this.findOneCommitment(savedRevision.id, office, isCrossOffice);
    }

    // ── Story 8: Export Commitment (JSON — FE handles PDF/CSV rendering) ───
    async exportCommitment(
        id: string,
        office: string,
        isCrossOffice: boolean = false,
        actor: string = 'system',
        ctx: ActorContext = {},
    ): Promise<CommitmentExportData> {
        const commitment = await this.findOneCommitment(id, office, isCrossOffice);

        this.auditService.log({
            event_type: 'COMMITMENT_EXPORTED',
            actor_id: actor,
            office_id: office,
            resource_id: id,
            details: { status: commitment.status },
            timestamp: new Date().toISOString(),
            actor_role: ctx.actor_role,
            actor_username: ctx.actor_username,
            ip_address: ctx.ip_address,
            service_name: 'pss-commitment',
        });

        return {
            meta: {
                office: commitment.office,
                period_id: commitment.period_id,
                status: commitment.status,
                is_draft: commitment.status === CommitmentStatus.DRAFT,
                version_number: commitment.version_number,
                submitted_by: commitment.submitted_by ?? null,
                submitted_at: commitment.submitted_at
                    ? new Date(commitment.submitted_at).toISOString()
                    : null,
                exported_at: new Date().toISOString(),
            },
            items: (commitment.items ?? []).map((item, idx) => ({
                index: idx + 1,
                service_id: item.service_id,
                kpi_id: item.kpi_id ?? null,
                target_value: item.target_value ?? null,
                unit: item.unit ?? null,
            })),
        };
    }

    async findLockedCommitments(
        office: string,
        pagination: PaginationDto = new PaginationDto(),
        isCrossOffice: boolean = false,
    ): Promise<{ data: Commitment[]; total: number; page: number; limit: number }> {
        return this.findAllCommitments(office, { status: CommitmentStatus.LOCKED }, pagination, isCrossOffice);
    }

    // ── Story PS015 AC8: Standalone versions endpoint ─────────────────────
    // NOTE (PM/FE open question): confirm whether this endpoint is needed or
    // whether the nested `versions` array in GET /commitments/:id is sufficient.
    // Built per spec — skip wiring the route if FE confirms nested array is enough.
    async getCommitmentVersions(
        id: string,
        office: string,
        isCrossOffice: boolean = false,
    ): Promise<CommitmentVersion[]> {
        // Reuse findOneCommitment for access control (office-scoping + existence check)
        await this.findOneCommitment(id, office, isCrossOffice);

        return this.versionRepo.find({
            where: { commitment_id: id },
            order: { version_number: 'ASC' },
        });
    }

    // ── DESIGN NOTE — Locking after revision (WHAT-BE #3 ambiguity) ────────
    // The spec says "Locking the revised draft sets commitment back to Locked"
    // but is ambiguous between:
    //   (a) the NEW Draft row becomes Locked (implemented here — lockCommitment()
    //       locks whichever row ID is passed, so no extra logic is needed)
    //   (b) the ORIGINAL Revision Requested row reverts to Locked and the draft
    //       is merged into it (requires new merge logic, not currently specified)
    // Option (a) is implemented as the default. RAISE WITH PM/FE BEFORE CLOSING.

    private async createVersionSnapshot(
        commitment: Commitment,
        actor: string,
        reason: string,
    ): Promise<CommitmentVersion> {
        const snapshot = {
            id: commitment.id,
            office: commitment.office,
            period_id: commitment.period_id,
            status: commitment.status,
            version_number: commitment.version_number,
            items: commitment.items?.map((item) => ({
                id: item.id,
                service_id: item.service_id,
                kpi_id: item.kpi_id,
                target_value: item.target_value,
                unit: item.unit,
            })) ?? [],
        };

        const version = this.versionRepo.create({
            commitment_id: commitment.id,
            version_number: commitment.version_number,
            status: commitment.status,
            revision_reason: reason,
            revised_by: actor,
            snapshot,
        });

        return this.versionRepo.save(version);
    }
}