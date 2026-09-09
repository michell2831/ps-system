import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import PDFDocument = require('pdfkit');
import { ReportExport, ReportFormat, ReportExportStatus } from '../database/report-export.entity';
import { CommitmentService, ActorContext, CommitmentExportData } from './commitment.service';
import { AuditService } from './audit.service';
import { RequestContext } from '../../../common/context/request-context';

interface EnrichedItem {
    service_name: string;
    kpi_name: string;
    kpi_category: string;
    target_value: number | null;
    unit: string | null;
}

@Injectable()
export class ReportExportService {
    private readonly logger = new Logger(ReportExportService.name);

    constructor(
        @InjectRepository(ReportExport, 'commitment_db')
        private readonly repo: Repository<ReportExport>,
        private readonly commitmentSvc: CommitmentService,
        private readonly auditService: AuditService,
        private readonly http: HttpService,
        private readonly config: ConfigService,
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

    private async lookupName(url: string, fallback: string): Promise<string> {
        try {
            const { data } = await firstValueFrom(this.http.get(url, { headers: this.downstreamHeaders() }));
            return data?.name ?? fallback;
        } catch {
            return fallback;
        }
    }

    private async lookupKpi(url: string): Promise<any | null> {
        try {
            const { data } = await firstValueFrom(this.http.get(url, { headers: this.downstreamHeaders() }));
            return data;
        } catch {
            return null;
        }
    }

    // AC1 — POST /api/reports/generate
    async generate(
        commitmentId: string,
        format: 'PDF' | 'CSV',
        office: string,
        isCrossOffice: boolean,
        actor: string,
        ctx: ActorContext = {},
    ): Promise<{ id: string; status: ReportExportStatus; format: ReportFormat; file_path: string | null; exported_at: string }> {
        // AC6 — reuses CommitmentService's own office check: 403 for another
        // office's commitment, 404 if it doesn't exist at all.
        const exportData: CommitmentExportData = await this.commitmentSvc.exportCommitment(
            commitmentId,
            office,
            isCrossOffice,
            actor,
            ctx,
        );

        const record = this.repo.create({
            commitment_id: commitmentId,
            office_id: exportData.meta.office,
            period_id: exportData.meta.period_id,
            format: format as ReportFormat,
            status: ReportExportStatus.PENDING,
            exported_by: actor,
        });
        await this.repo.save(record);

        try {
            const catalogueUrl = this.config.get<string>('SERVICE_CATALOGUE_URL');
            const kpiSlaUrl = this.config.get<string>('KPI_SLA_URL');

            const periodName = await this.lookupName(
                `${kpiSlaUrl}/api/periods/${exportData.meta.period_id}`,
                exportData.meta.period_id,
            );

            const enrichedItems: EnrichedItem[] = await Promise.all(
                exportData.items.map(async (item) => {
                    const [serviceName, kpiInfo] = await Promise.all([
                        this.lookupName(`${catalogueUrl}/api/services/${item.service_id}`, item.service_id),
                        item.kpi_id ? this.lookupKpi(`${kpiSlaUrl}/api/kpis/${item.kpi_id}`) : Promise.resolve(null),
                    ]);
                    return {
                        service_name: serviceName,
                        kpi_name: kpiInfo?.name ?? item.kpi_id ?? 'N/A',
                        kpi_category: kpiInfo?.category ?? 'N/A',
                        target_value: item.target_value,
                        unit: item.unit,
                    };
                }),
            );

            const buffer =
                format === 'PDF'
                    ? await this.renderPdf(exportData, periodName, enrichedItems)
                    : this.renderCsv(enrichedItems);

            record.status = ReportExportStatus.READY;
            record.file_data = buffer;
            record.mime_type = format === 'PDF' ? 'application/pdf' : 'text/csv';
            record.file_path = `/api/reports/${record.id}/download`;
            await this.repo.save(record);

            // AC5 — audit trail
            this.auditService.log({
                event_type: 'REPORT_EXPORTED',
                actor_id: actor,
                office_id: office,
                resource_id: commitmentId,
                details: { report_id: record.id, format },
                timestamp: new Date().toISOString(),
                actor_role: ctx.actor_role,
                actor_username: ctx.actor_username,
                ip_address: ctx.ip_address,
                service_name: 'pss-commitment',
            });

            return {
                id: record.id,
                status: record.status,
                format: record.format,
                file_path: record.file_path,
                exported_at: record.exported_at.toISOString(),
            };
        } catch (err) {
            this.logger.error(`Report generation failed for commitment ${commitmentId}: ${err}`);
            record.status = ReportExportStatus.FAILED;
            record.error_message = err instanceof Error ? err.message : 'Unknown error';
            await this.repo.save(record);
            return {
                id: record.id,
                status: record.status,
                format: record.format,
                file_path: null,
                exported_at: record.exported_at.toISOString(),
            };
        }
    }

    // AC4, AC7 — GET /api/reports/:id/download
    async download(id: string, office: string, isCrossOffice: boolean): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
        const record = await this.repo.findOne({ where: { id } });
        if (!record) throw new NotFoundException(`Report ${id} not found`);
        // Don't leak cross-office existence — just 404 if it isn't this office's report.
        if (!isCrossOffice && record.office_id !== office) {
            throw new NotFoundException(`Report ${id} not found`);
        }
        if (record.status !== ReportExportStatus.READY || !record.file_data) {
            throw new NotFoundException(`Report ${id} is not ready for download (status: ${record.status})`);
        }
        const ext = record.format === ReportFormat.PDF ? 'pdf' : 'csv';
        return {
            buffer: record.file_data,
            mimeType: record.mime_type ?? (record.format === ReportFormat.PDF ? 'application/pdf' : 'text/csv'),
            filename: `commitment-${record.commitment_id}-report.${ext}`,
        };
    }

    // ── PDF rendering — AC2 (content), AC3 (DRAFT watermark) ─────────────
    private renderPdf(exportData: CommitmentExportData, periodName: string, items: EnrichedItem[]): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks: Buffer[] = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            if (exportData.meta.is_draft) {
                doc.save();
                doc.rotate(-45, { origin: [300, 400] });
                doc.fontSize(60).fillColor('#e57373', 0.35).text('DRAFT — NOT FINAL', 60, 380, { align: 'center', width: 480 });
                doc.restore();
                doc.fillColor('black');
            }

            doc.fontSize(18).text('OPCR Commitment Summary Report', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#555');
            doc.text(`Office: ${exportData.meta.office}`);
            doc.text(`Evaluation Period: ${periodName}`);
            doc.text(`Status: ${exportData.meta.status}`);
            doc.text(`Submitted By: ${exportData.meta.submitted_by ?? 'N/A'}`);
            doc.text(`Submission Date: ${exportData.meta.submitted_at ?? 'N/A'}`);
            doc.text(`Generated: ${exportData.meta.exported_at}`);
            doc.fillColor('black').moveDown();

            const tableTop = doc.y + 10;
            const colX = { idx: 50, service: 90, kpi: 260, target: 400, unit: 470 };
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('#', colX.idx, tableTop);
            doc.text('Service / KPI', colX.service, tableTop);
            doc.text('Category', colX.kpi, tableTop);
            doc.text('Target', colX.target, tableTop);
            doc.text('Unit', colX.unit, tableTop);
            doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).strokeColor('#ccc').stroke();

            doc.font('Helvetica').fontSize(9);
            let y = tableTop + 20;
            items.forEach((item, i) => {
                if (y > 760) {
                    doc.addPage();
                    y = 50;
                }
                doc.text(String(i + 1), colX.idx, y);
                doc.text(`${item.service_name}\n${item.kpi_name}`, colX.service, y, { width: 160 });
                doc.text(item.kpi_category, colX.kpi, y, { width: 130 });
                doc.text(item.target_value != null ? String(item.target_value) : 'N/A', colX.target, y);
                doc.text(item.unit ?? 'N/A', colX.unit, y);
                y += 28;
            });

            doc.end();
        });
    }

    // ── CSV rendering — AC4 ────────────────────────────────────────────
    private renderCsv(items: EnrichedItem[]): Buffer {
        const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const header = ['Service Name', 'Classification', 'KPI Name', 'KPI Category', 'Target Value', 'Unit'].map(esc).join(',');
        const rows = items.map((item) =>
            [item.service_name, 'Service', item.kpi_name, item.kpi_category, item.target_value ?? '', item.unit ?? ''].map(esc).join(','),
        );
        return Buffer.from([header, ...rows].join('\n'), 'utf-8');
    }
}