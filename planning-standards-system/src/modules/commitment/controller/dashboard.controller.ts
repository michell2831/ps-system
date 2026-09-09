import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permission } from '../../../common/rbac/permission.enum';
import { DashboardService } from '../service/dashboard-data.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboardSvc: DashboardService) { }

  @Get('summary')
  @Roles(Permission.COMMITMENTS_READ)
  @ApiOperation({
    summary:
      'Get aggregated dashboard summary for the active period. ' +
      'Cross-office roles (SUPER_ADMIN, OPCR_EVALUATOR) must pass ?office=<OFFICE> to view a specific office\'s dashboard.',
  })
  @ApiQuery({ name: 'office', required: false, description: 'Required for cross-office roles; ignored for office-scoped roles.' })
  async getSummary(@Request() req, @Query('office') officeParam?: string) {
    const office = req.user?.office ?? 'unknown-office';
    const isCrossOffice = req.user?.isCrossOffice ?? false;
    return this.dashboardSvc.getSummary(office, isCrossOffice, officeParam);
  }
}
