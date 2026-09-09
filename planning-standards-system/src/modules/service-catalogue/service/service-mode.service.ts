import { Injectable, OnApplicationBootstrap, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceMode } from '../database/service-mode.entity';

@Injectable()
export class ServiceModeService implements OnApplicationBootstrap {
    private readonly logger = new Logger(ServiceModeService.name);

    constructor(
        @InjectRepository(ServiceMode, 'catalogue_db')
        private readonly serviceModeRepo: Repository<ServiceMode>,
    ) { }

    async onApplicationBootstrap(): Promise<void> {
        const standardModes = [
            { name: 'Walk-in', description: 'Standard walk-in service delivery mode' },
            { name: 'Online', description: 'Service delivered entirely online' },
            { name: 'Email', description: 'Service processed via email communication' },
            { name: 'Referral', description: 'Service requires an external or internal referral' },
            { name: 'Non-Referral', description: 'Service can be availed directly without a referral' },
            { name: 'Phone', description: 'Service delivered via phone call' },
        ];

        this.logger.log('Seeding standard service modes...');

        for (const mode of standardModes) {
            const exists = await this.serviceModeRepo.findOne({ where: { name: mode.name } });
            if (!exists) {
                const newMode = this.serviceModeRepo.create(mode);
                await this.serviceModeRepo.save(newMode);
                this.logger.log(`Seeded service mode: ${mode.name}`);
            }
        }
        this.logger.log('Service modes seeding complete.');
    }

    /** GET /api/service-modes — returns all active modes (default) or all including inactive */
    async findAll(includeInactive = false): Promise<ServiceMode[]> {
        const where = includeInactive ? {} : { is_active: true };
        return this.serviceModeRepo.find({
            where,
            order: { name: 'ASC' },
        });
    }

    /** @deprecated Use findAll(false) */
    async findAllActive(): Promise<ServiceMode[]> {
        return this.findAll(false);
    }

    /** POST /api/service-modes */
    async create(dto: { name: string; description?: string }): Promise<ServiceMode> {
        const existing = await this.serviceModeRepo.findOne({ where: { name: dto.name } });
        if (existing) {
            throw new ConflictException(`A service mode named "${dto.name}" already exists.`);
        }
        const mode = this.serviceModeRepo.create({
            name: dto.name.trim(),
            description: dto.description?.trim() ?? null,
            is_active: true,
        });
        return this.serviceModeRepo.save(mode);
    }

    /** PUT /api/service-modes/:id */
    async update(id: string, dto: { name?: string; description?: string }): Promise<ServiceMode> {
        const mode = await this.serviceModeRepo.findOne({ where: { id } });
        if (!mode) throw new NotFoundException(`Service mode ${id} not found`);

        if (dto.name && dto.name.trim() !== mode.name) {
            const existing = await this.serviceModeRepo.findOne({ where: { name: dto.name.trim() } });
            if (existing && existing.id !== id) {
                throw new ConflictException(`A service mode named "${dto.name}" already exists.`);
            }
            mode.name = dto.name.trim();
        }
        if (dto.description !== undefined) {
            mode.description = dto.description?.trim() ?? null;
        }
        return this.serviceModeRepo.save(mode);
    }

    /** PATCH /api/service-modes/:id/toggle */
    async toggle(id: string): Promise<ServiceMode> {
        const mode = await this.serviceModeRepo.findOne({ where: { id } });
        if (!mode) throw new NotFoundException(`Service mode ${id} not found`);
        mode.is_active = !mode.is_active;
        return this.serviceModeRepo.save(mode);
    }
}
