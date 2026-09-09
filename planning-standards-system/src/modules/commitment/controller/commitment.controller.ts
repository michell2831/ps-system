import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    Request,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { CommitmentService, ActorContext } from '../service/commitment.service';
import { CreateCommitmentDto } from '../dto/create-commitment.dto';
import { UpdateCommitmentDto } from '../dto/update-commitment.dto';
import { RequestRevisionDto } from '../dto/request-revision.dto';
import { PaginationDto } from '../dto/pagination.dto';
import { GetCommitmentsQueryDto } from '../dto/get-commitments-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permission } from '../../../common/rbac/permission.enum';

@ApiTags('OPCR Commitments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiHeader({
    name: 'x-office',
    description: 'Office identifier set by the gateway from the validated ARMS token',
    required: false,
})
@Controller('api')
export class CommitmentController {
    constructor(private readonly svc: CommitmentService) { }

    @Post('commitments')
    @HttpCode(HttpStatus.CREATED)
    @Roles(Permission.COMMITMENTS_WRITE)
    @ApiOperation({ summary: 'Create a new commitment draft' })
    createCommitment(@Request() req, @Body() dto: CreateCommitmentDto) {
        const office = req.user?.office ?? 'unknown-office';
        const actor = req.user?.sub ?? 'system';
        return this.svc.createCommitment(office, actor, dto, {
            actor_role: req.user?.armsRole,
            actor_username: req.user?.username,
            ip_address: req.headers['x-client-ip'],
        });
    }

    @Get('commitments')
    @Roles(Permission.COMMITMENTS_READ)
    @ApiOperation({ summary: 'Get all commitments for the authenticated office (paginated). Cross-office roles see all offices.' })
    @ApiQuery({ name: 'period_id', required: false })
    @ApiQuery({ name: 'status', required: false, enum: ['Draft', 'Locked', 'Revision Requested'] })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'sort_by', required: false })
    @ApiQuery({ name: 'sort_order', required: false, enum: ['ASC', 'DESC'] })
    findAllCommitments(
        @Request() req,
        @Query() query: GetCommitmentsQueryDto,
    ) {
        const office = req.user?.office ?? 'unknown-office';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        const { period_id, status, ...pagination } = query;
        return this.svc.findAllCommitments(office, { period_id, status }, pagination, isCrossOffice);
    }

    @Get('commitments/:id')
    @Roles(Permission.COMMITMENTS_READ)
    @ApiOperation({ summary: 'Get a single commitment by ID (with items and versions). Cross-office roles can view commitments from other offices.' })
    findOneCommitment(@Request() req, @Param('id') id: string) {
        const office = req.user?.office ?? 'unknown-office';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        return this.svc.findOneCommitment(id, office, isCrossOffice);
    }

    @Patch('commitments/:id')
    @Roles(Permission.COMMITMENTS_WRITE)
    @ApiOperation({ summary: 'Update a draft commitment (auto-save / manual save)' })
    updateCommitment(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: UpdateCommitmentDto,
    ) {
        const office = req.user?.office ?? 'unknown-office';
        const actor = req.user?.sub ?? 'system';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        return this.svc.updateCommitment(id, office, actor, dto, isCrossOffice);
    }

    @Patch('commitments/:id/lock')
    @Roles(Permission.COMMITMENTS_LOCK)
    @ApiOperation({ summary: 'Lock and submit a commitment — makes it immutable' })
    lockCommitment(@Request() req, @Param('id') id: string) {
        const office = req.user?.office ?? 'unknown-office';
        const actor = req.user?.sub ?? 'system';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        return this.svc.lockCommitment(id, office, actor, {
            actor_role: req.user?.armsRole,
            actor_username: req.user?.username,
            ip_address: req.headers['x-client-ip'],
        }, isCrossOffice);
    }

    // Story PS015 — Request a formal revision on a locked commitment
    // A.1: renamed from /request-revision → /revision-request to match spec (AC1).
    // FE had not yet built against either path (confirmed by codebase search).
    @Post(['commitments/:id/revision-request', 'commitments/:id/request-revision'])
    @HttpCode(HttpStatus.CREATED)
    @Roles(Permission.COMMITMENTS_WRITE)
    @ApiOperation({ summary: 'PS015 AC1 — Request a revision on a Locked commitment (creates new Draft, marks original as Revision Requested)' })
    requestRevision(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: RequestRevisionDto,
    ) {
        const office = req.user?.office ?? 'unknown-office';
        const actor = req.user?.sub ?? 'system';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        return this.svc.requestRevision(id, office, actor, dto.reason, {
            actor_role: req.user?.armsRole,
            actor_username: req.user?.username,
            ip_address: req.headers['x-client-ip'],
        }, isCrossOffice);
    }

    // Story 8 — Export commitment data as JSON (FE handles PDF/CSV rendering)
    @Get('commitments/:id/export')
    @Roles(Permission.COMMITMENTS_READ)
    @ApiOperation({ summary: 'Story 8 — Return commitment data as JSON for FE to render as PDF or CSV' })
    exportCommitment(
        @Request() req,
        @Param('id') id: string,
    ) {
        const office: string = req.user?.office ?? 'unknown-office';
        const actor: string = req.user?.sub ?? 'system';
        const isCrossOffice: boolean = req.user?.isCrossOffice ?? false;
        const ctx: ActorContext = {
            actor_role: req.user?.armsRole,
            actor_username: req.user?.username,
            ip_address: req.headers['x-client-ip'] as string,
        };
        return this.svc.exportCommitment(id, office, isCrossOffice, actor, ctx);
    }

    // Story PS015 AC8 — Standalone versions list
    // NOTE (PM/FE open question): wired per spec; confirm with FE whether the
    // nested `versions` array on GET /commitments/:id is sufficient, in which
    // case this route can be removed without any other code changes.
    @Get('commitments/:id/versions')
    @Roles(Permission.COMMITMENTS_READ)
    @ApiOperation({ summary: 'AC8 — Get all version records for a commitment, ordered by version_number ascending' })
    getCommitmentVersions(@Request() req, @Param('id') id: string) {
        const office = req.user?.office ?? 'unknown-office';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        return this.svc.getCommitmentVersions(id, office, isCrossOffice);
    }

    @Get('opcr/commitments')
    @Roles(Permission.COMMITMENTS_READ)
    @ApiOperation({ summary: 'Get all locked (submitted) commitments — OPCR data endpoint. Cross-office roles see all offices.' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findLockedCommitments(@Request() req, @Query() pagination?: PaginationDto) {
        const office = req.user?.office ?? 'unknown-office';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        return this.svc.findLockedCommitments(office, pagination, isCrossOffice);
    }
}