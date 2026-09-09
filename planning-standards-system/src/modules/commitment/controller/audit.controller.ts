import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuditService } from '../service/audit.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permission } from '../../../common/rbac/permission.enum';

@ApiTags('Audit Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/audit-events')
export class AuditController {
    constructor(private readonly auditSvc: AuditService) { }

    @Get()
    @Roles(Permission.AUDIT_LOGS_READ)
    @ApiOperation({ summary: 'Get all audit events - fetched by audit group' })
    @ApiQuery({ name: 'is_synced', required: false, type: Boolean })
    @ApiQuery({ name: 'event', required: false })
    @ApiQuery({ name: 'office_id', required: false })
    findAll(
        @Query('is_synced') is_synced?: string,
        @Query('event') event?: string,
        @Query('office_id') office_id?: string,
    ) {
        const isSyncedBool = is_synced !== undefined ? is_synced === 'true' : undefined;
        return this.auditSvc.findAll({ is_synced: isSyncedBool, event, office_id });
    }

    @Patch(':id/sync')
    @Roles(Permission.COMMITMENTS_WRITE)
    @ApiOperation({ summary: 'Mark an audit event as synced' })
    markSynced(@Param('id') id: string) {
        return this.auditSvc.markSynced(id);
    }

    @Post()
    @ApiOperation({ summary: 'Log a new audit event (used by other PSS microservices and the gateway)' })
    async createEvent(@Request() req, @Body() payload: any) {
        const enriched = {
            ...payload,
            // actor_role / actor_username must come from the verified JWT/gateway
            // context, never from the client-supplied body — payload is untrusted
            // input, and this data ends up in ARMS's compliance audit trail.
            actor_role: req.user?.armsRole ?? req.headers['x-arms-role'] ?? payload.actor_role,
            actor_username: req.user?.username ?? req.headers['x-actor-username'] ?? payload.actor_username,
            ip_address: req.headers['x-client-ip'] ?? payload.ip_address,
        };

        await this.auditSvc.log(enriched);
        return { success: true };
    }
}
