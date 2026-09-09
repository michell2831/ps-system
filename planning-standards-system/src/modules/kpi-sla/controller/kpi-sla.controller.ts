import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Patch,
    Body,
    Param,
    Query,
    Request,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { KpiSlaService } from '../service/kpi-sla.service';
import { CreateKpiDto } from '../dto/create-kpi.dto';
import { UpdateKpiDto } from '../dto/update-kpi.dto';
import { CreateSlaRuleDto } from '../dto/create-sla-rule.dto';
import { UpdateSlaRuleDto } from '../dto/update-sla-rule.dto';
import { CreateHolidayDto } from '../dto/create-holiday.dto';
import { UpdateHolidayDto } from '../dto/update-holiday.dto';
import { CreatePeriodDto } from '../dto/create-period.dto';
import { UpdatePeriodDto } from '../dto/update-period.dto';
import { PaginationDto } from '../dto/pagination.dto';
import { GetKpisQueryDto } from '../dto/get-kpis-query.dto';
import { GetHolidaysQueryDto } from '../dto/get-holidays-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permission } from '../../../common/rbac/permission.enum';

@ApiTags('KPI & SLA Standards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api')
export class KpiSlaController {
    constructor(private readonly svc: KpiSlaService) { }

    @Post('kpis')
    @HttpCode(HttpStatus.CREATED)
    @Roles(Permission.KPIS_WRITE)
    @ApiOperation({ summary: 'Create a KPI' })
    createKpi(@Request() req, @Body() dto: CreateKpiDto) {
        const office = req.user?.office ?? 'unknown-office';
        const actor = req.user?.sub ?? 'system';
        return this.svc.createKpi(office, actor, dto);
    }

    @Get('kpis')
    @Roles(Permission.KPIS_READ)
    @ApiOperation({ summary: 'Get all KPIs for the authenticated office (paginated)' })
    @ApiQuery({ name: 'service_id', required: false })
    @ApiQuery({ name: 'category', required: false })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'sort_by', required: false })
    @ApiQuery({ name: 'sort_order', required: false, enum: ['ASC', 'DESC'] })
    findAllKpis(@Request() req, @Query() query: GetKpisQueryDto) {
        const office = req.user?.office ?? 'unknown-office';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        const { service_id, category, include_inactive, ...pagination } = query;
        const includeInactiveBool = include_inactive === 'true';
        return this.svc.findAllKpis(office, { service_id, category, include_inactive: includeInactiveBool }, pagination, isCrossOffice);
    }

    @Put('kpis/:id')
    @Roles(Permission.KPIS_WRITE)
    @ApiOperation({ summary: 'Update a KPI' })
    updateKpi(@Request() req, @Param('id') id: string, @Body() dto: UpdateKpiDto) {
        const office = req.user?.office ?? 'unknown-office';
        return this.svc.updateKpi(id, office, dto);
    }

    @Delete('kpis/:id')
    @Roles(Permission.KPIS_WRITE)
    @ApiOperation({ summary: 'Soft-delete a KPI' })
    removeKpi(@Request() req, @Param('id') id: string) {
        const office = req.user?.office ?? 'unknown-office';
        const actor = req.user?.sub ?? 'system';
        return this.svc.removeKpi(id, office, actor);
    }

    @Post('sla-rules')
    @HttpCode(HttpStatus.CREATED)
    @Roles(Permission.KPIS_WRITE)
    @ApiOperation({ summary: 'Create an SLA rule' })
    createSlaRule(@Request() req, @Body() dto: CreateSlaRuleDto) {
        const office = req.user?.office ?? 'unknown-office';
        const actor = req.user?.sub ?? 'system';
        return this.svc.createSlaRule(office, actor, dto);
    }

    @Get('sla-rules')
    @Roles(Permission.KPIS_READ)
    @ApiOperation({ summary: 'Get all SLA rules for the authenticated office' })
    findAllSlaRules(@Request() req) {
        const office = req.user?.office ?? 'unknown-office';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        return this.svc.findAllSlaRules(office, isCrossOffice);
    }

    @Put('sla-rules/:id')
    @Roles(Permission.KPIS_WRITE)
    @ApiOperation({ summary: 'Update SLA rule (saves version history)' })
    updateSlaRule(@Request() req, @Param('id') id: string, @Body() dto: UpdateSlaRuleDto) {
        const office = req.user?.office ?? 'unknown-office';
        const actor = req.user?.sub ?? 'system';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        return this.svc.updateSlaRule(id, office, actor, dto, isCrossOffice);
    }

    @Get('sla-rules/:id/versions')
    @Roles(Permission.KPIS_READ)
    @ApiOperation({ summary: 'Get all version history of an SLA rule' })
    getSlaRuleVersions(@Request() req, @Param('id') id: string) {
        const office = req.user?.office ?? 'unknown-office';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        return this.svc.getSlaRuleVersions(id, office, isCrossOffice);
    }

    @Patch('sla-rules/:id/versions/:versionId/restore')
    @Roles(Permission.KPIS_WRITE)
    @ApiOperation({ summary: 'Restore a previous version of an SLA rule' })
    restoreSlaVersion(
        @Request() req,
        @Param('id') id: string,
        @Param('versionId') versionId: string,
    ) {
        const office = req.user?.office ?? 'unknown-office';
        const actor = req.user?.sub ?? 'system';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        return this.svc.restoreSlaVersion(id, versionId, office, actor, isCrossOffice);
    }

    @Post('holidays')
    @HttpCode(HttpStatus.CREATED)
    @Roles(Permission.HOLIDAYS_WRITE)
    @ApiOperation({ summary: 'Add a holiday' })
    createHoliday(@Request() req, @Body() dto: CreateHolidayDto) {
        const actor = req.user?.sub ?? 'system';
        return this.svc.createHoliday(dto, actor);
    }

    @Get('holidays')
    @Roles(Permission.HOLIDAYS_READ)
    @ApiOperation({ summary: 'Get all holidays (paginated)' })
    @ApiQuery({ name: 'month', required: false, type: Number })
    @ApiQuery({ name: 'year', required: false, type: Number })
    @ApiQuery({ name: 'type', required: false })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAllHolidays(@Query() query: GetHolidaysQueryDto) {
        const { month, year, type, ...pagination } = query;
        return this.svc.findAllHolidays({ month, year, type }, pagination);
    }

    @Put('holidays/:id')
    @Roles(Permission.HOLIDAYS_WRITE)
    @ApiOperation({ summary: 'Update a holiday' })
    updateHoliday(@Param('id') id: string, @Body() dto: UpdateHolidayDto) {
        return this.svc.updateHoliday(id, dto);
    }

    @Delete('holidays/:id')
    @Roles(Permission.HOLIDAYS_WRITE)
    @ApiOperation({ summary: 'Delete a holiday' })
    removeHoliday(@Request() req, @Param('id') id: string) {
        const actor = req.user?.sub ?? 'system';
        return this.svc.removeHoliday(id, actor);
    }

    @Post('periods')
    @HttpCode(HttpStatus.CREATED)
    @Roles(Permission.PERIODS_WRITE)
    @ApiOperation({ summary: 'Create an evaluation period' })
    createPeriod(@Request() req, @Body() dto: CreatePeriodDto) {
        const office = req.user?.office ?? 'unknown-office';
        const actor = req.user?.sub ?? 'system';
        return this.svc.createPeriod(office, actor, dto);
    }

    @Get('periods')
    @Roles(Permission.PERIODS_READ)
    @ApiOperation({ summary: 'Get all evaluation periods for the authenticated office (paginated)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAllPeriods(@Request() req, @Query() pagination?: PaginationDto) {
        const office = req.user?.office ?? 'unknown-office';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        return this.svc.findAllPeriods(office, pagination, isCrossOffice);
    }

    @Get('periods/warnings')
    @Roles(Permission.PERIODS_READ)
    @ApiOperation({ summary: 'Get OPEN periods with warning/due/overdue status for dashboard banner' })
    getPeriodWarnings(@Request() req) {
        const office = req.user?.office ?? 'unknown-office';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        return this.svc.getPeriodWarnings(office, isCrossOffice);
    }

    @Get('periods/:id')
    @Roles(Permission.PERIODS_READ)
    @ApiOperation({ summary: 'Get a single evaluation period by ID' })
    findOnePeriod(@Request() req, @Param('id') id: string) {
        const office = req.user?.office ?? 'unknown-office';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        return this.svc.findOnePeriod(id, office, isCrossOffice);
    }

    @Put('periods/:id')
    @Roles(Permission.PERIODS_WRITE)
    @ApiOperation({ summary: 'Update an evaluation period' })
    updatePeriod(@Request() req, @Param('id') id: string, @Body() dto: UpdatePeriodDto) {
        const office = req.user?.office ?? 'unknown-office';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        return this.svc.updatePeriod(id, office, dto, isCrossOffice);
    }

    @Patch('periods/:id/complete')
    @Roles(Permission.PERIODS_WRITE)
    @ApiOperation({ summary: 'Mark an OPEN evaluation period as completed - auto-activates next QUEUED period' })
    completePeriod(@Request() req, @Param('id') id: string) {
        const office = req.user?.office ?? 'unknown-office';
        const actor = req.user?.sub ?? 'system';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        return this.svc.completePeriod(id, office, actor, isCrossOffice);
    }

    @Delete('periods/:id')
    @Roles(Permission.PERIODS_WRITE)
    @ApiOperation({ summary: 'Delete a QUEUED evaluation period' })
    removePeriod(@Request() req, @Param('id') id: string) {
        const office = req.user?.office ?? 'unknown-office';
        const isCrossOffice = req.user?.isCrossOffice ?? false;
        return this.svc.removePeriod(id, office, isCrossOffice);
    }
}