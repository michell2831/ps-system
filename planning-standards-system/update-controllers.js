const fs = require('fs');
const path = require('path');

function updateController(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Remove old JwtAuthGuard import
    content = content.replace(/import \{ JwtAuthGuard \} from '..\/guards\/jwt\.guard';\r?\n?/, '');

    // 2. Add new imports if not present
    const newImports = `import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permission } from '../../common/rbac/permission.enum';\n`;

    if (!content.includes('JwtAuthGuard } from \'../../common/guards/jwt-auth.guard\'')) {
        // insert after the last import
        const lastImportIndex = content.lastIndexOf('import ');
        const nextNewlineIndex = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, nextNewlineIndex + 1) + newImports + content.slice(nextNewlineIndex + 1);
    }

    // 3. Update @UseGuards
    content = content.replace(/@UseGuards\(JwtAuthGuard\)/, '@UseGuards(JwtAuthGuard, RolesGuard)');

    // 4. Add @Roles decorator to methods based on endpoint and file
    const fileBase = path.basename(filePath);

    if (fileBase === 'kpi-sla.controller.ts') {
        content = content.replace(/(@HttpCode\(HttpStatus\.CREATED\)\s+)?@ApiOperation\({ summary: 'Create a KPI' }\)/g, '$1@Roles(Permission.KPIS_WRITE)\n    @ApiOperation({ summary: \'Create a KPI\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Get all KPIs for the authenticated office \(paginated\)' }\)/g, '@Roles(Permission.KPIS_READ)\n    @ApiOperation({ summary: \'Get all KPIs for the authenticated office (paginated)\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Update a KPI' }\)/g, '@Roles(Permission.KPIS_WRITE)\n    @ApiOperation({ summary: \'Update a KPI\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Soft-delete a KPI' }\)/g, '@Roles(Permission.KPIS_WRITE)\n    @ApiOperation({ summary: \'Soft-delete a KPI\' })');

        content = content.replace(/(@HttpCode\(HttpStatus\.CREATED\)\s+)?@ApiOperation\({ summary: 'Create an SLA rule' }\)/g, '$1@Roles(Permission.KPIS_WRITE)\n    @ApiOperation({ summary: \'Create an SLA rule\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Get all SLA rules for the authenticated office' }\)/g, '@Roles(Permission.KPIS_READ)\n    @ApiOperation({ summary: \'Get all SLA rules for the authenticated office\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Update SLA rule \(saves version history\)' }\)/g, '@Roles(Permission.KPIS_WRITE)\n    @ApiOperation({ summary: \'Update SLA rule (saves version history)\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Get all version history of an SLA rule' }\)/g, '@Roles(Permission.KPIS_READ)\n    @ApiOperation({ summary: \'Get all version history of an SLA rule\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Restore a previous version of an SLA rule' }\)/g, '@Roles(Permission.KPIS_WRITE)\n    @ApiOperation({ summary: \'Restore a previous version of an SLA rule\' })');

        content = content.replace(/(@HttpCode\(HttpStatus\.CREATED\)\s+)?@ApiOperation\({ summary: 'Add a holiday' }\)/g, '$1@Roles(Permission.HOLIDAYS_WRITE)\n    @ApiOperation({ summary: \'Add a holiday\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Get all holidays \(paginated\)' }\)/g, '@Roles(Permission.HOLIDAYS_READ)\n    @ApiOperation({ summary: \'Get all holidays (paginated)\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Update a holiday' }\)/g, '@Roles(Permission.HOLIDAYS_WRITE)\n    @ApiOperation({ summary: \'Update a holiday\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Delete a holiday' }\)/g, '@Roles(Permission.HOLIDAYS_WRITE)\n    @ApiOperation({ summary: \'Delete a holiday\' })');

        content = content.replace(/(@HttpCode\(HttpStatus\.CREATED\)\s+)?@ApiOperation\({ summary: 'Create an evaluation period' }\)/g, '$1@Roles(Permission.PERIODS_WRITE)\n    @ApiOperation({ summary: \'Create an evaluation period\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Get all evaluation periods for the authenticated office \(paginated\)' }\)/g, '@Roles(Permission.PERIODS_READ)\n    @ApiOperation({ summary: \'Get all evaluation periods for the authenticated office (paginated)\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Get OPEN periods with warning\/due\/overdue status for dashboard banner' }\)/g, '@Roles(Permission.PERIODS_READ)\n    @ApiOperation({ summary: \'Get OPEN periods with warning/due/overdue status for dashboard banner\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Get a single evaluation period by ID' }\)/g, '@Roles(Permission.PERIODS_READ)\n    @ApiOperation({ summary: \'Get a single evaluation period by ID\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Update an evaluation period' }\)/g, '@Roles(Permission.PERIODS_WRITE)\n    @ApiOperation({ summary: \'Update an evaluation period\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Mark an OPEN evaluation period as completed — auto-activates next QUEUED period' }\)/g, '@Roles(Permission.PERIODS_WRITE)\n    @ApiOperation({ summary: \'Mark an OPEN evaluation period as completed — auto-activates next QUEUED period\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Delete a QUEUED evaluation period' }\)/g, '@Roles(Permission.PERIODS_WRITE)\n    @ApiOperation({ summary: \'Delete a QUEUED evaluation period\' })');
    } else if (fileBase === 'service-catalogue.controller.ts') {
        content = content.replace(/@ApiOperation\({ summary: 'Get all services for the authenticated office \(paginated\)\. Staff role auto-filters N\/A and Inactive\.' }\)/g, '@Roles(Permission.SERVICES_READ)\n    @ApiOperation({ summary: \'Get all services for the authenticated office (paginated). Staff role auto-filters N/A and Inactive.\' })');
        content = content.replace(/@ApiOperation\({ summary: 'EMS reference — get all NA flags for an office and period' }\)/g, '@Roles(Permission.SERVICES_READ)\n    @ApiOperation({ summary: \'EMS reference — get all NA flags for an office and period\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Bulk remove all N\/A flags for a period — called when period is completed' }\)/g, '@Roles(Permission.SERVICES_WRITE)\n    @ApiOperation({ summary: \'Bulk remove all N/A flags for a period — called when period is completed\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Get a service by ID' }\)/g, '@Roles(Permission.SERVICES_READ)\n    @ApiOperation({ summary: \'Get a service by ID\' })');
        
        content = content.replace(/(@UsePipes\([^)]+\)\s+)?@ApiOperation\({ summary: 'Create a new service — Admin only' }\)/g, '$1@Roles(Permission.SERVICES_WRITE)\n    @ApiOperation({ summary: \'Create a new service — Admin only\' })');
        content = content.replace(/(@UsePipes\([^)]+\)\s+)?@ApiOperation\({ summary: 'Update a service \(with audit logging\) — Admin only' }\)/g, '$1@Roles(Permission.SERVICES_WRITE)\n    @ApiOperation({ summary: \'Update a service (with audit logging) — Admin only\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Archive a service — Admin only' }\)/g, '@Roles(Permission.SERVICES_WRITE)\n    @ApiOperation({ summary: \'Archive a service — Admin only\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Activate a service — Admin only' }\)/g, '@Roles(Permission.SERVICES_WRITE)\n    @ApiOperation({ summary: \'Activate a service — Admin only\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Deactivate a service — Admin only' }\)/g, '@Roles(Permission.SERVICES_WRITE)\n    @ApiOperation({ summary: \'Deactivate a service — Admin only\' })');
        
        content = content.replace(/@ApiOperation\({ summary: 'Get all intake fields of a service' }\)/g, '@Roles(Permission.SERVICES_READ)\n    @ApiOperation({ summary: \'Get all intake fields of a service\' })');
        content = content.replace(/(@UsePipes\([^)]+\)\s+)?@ApiOperation\({ summary: 'Add an intake field to a service — Admin only' }\)/g, '$1@Roles(Permission.SERVICES_WRITE)\n    @ApiOperation({ summary: \'Add an intake field to a service — Admin only\' })');
        content = content.replace(/(@UsePipes\([^)]+\)\s+)?@ApiOperation\({ summary: 'Update an intake field — Admin only' }\)/g, '$1@Roles(Permission.SERVICES_WRITE)\n    @ApiOperation({ summary: \'Update an intake field — Admin only\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Deactivate an intake field — Admin only' }\)/g, '@Roles(Permission.SERVICES_WRITE)\n    @ApiOperation({ summary: \'Deactivate an intake field — Admin only\' })');

        content = content.replace(/@ApiOperation\({ summary: 'Get all NA flags of a service' }\)/g, '@Roles(Permission.SERVICES_READ)\n    @ApiOperation({ summary: \'Get all NA flags of a service\' })');
        content = content.replace(/(@UsePipes\([^)]+\)\s+)?@ApiOperation\({ summary: 'Flag a service as Not Applicable for a period — Admin only' }\)/g, '$1@Roles(Permission.SERVICES_WRITE)\n    @ApiOperation({ summary: \'Flag a service as Not Applicable for a period — Admin only\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Remove N\/A flag from a service for the active period — Admin only' }\)/g, '@Roles(Permission.SERVICES_WRITE)\n    @ApiOperation({ summary: \'Remove N/A flag from a service for the active period — Admin only\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Lift a specific NA flag by ID — Admin only' }\)/g, '@Roles(Permission.SERVICES_WRITE)\n    @ApiOperation({ summary: \'Lift a specific NA flag by ID — Admin only\' })');
    } else if (fileBase === 'commitment.controller.ts') {
        content = content.replace(/@ApiOperation\({ summary: 'Create a new commitment draft' }\)/g, '@Roles(Permission.COMMITMENTS_WRITE)\n  @ApiOperation({ summary: \'Create a new commitment draft\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Get all commitments for the authenticated office \(paginated\)' }\)/g, '@Roles(Permission.COMMITMENTS_READ)\n  @ApiOperation({ summary: \'Get all commitments for the authenticated office (paginated)\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Get a single commitment by ID \(with items and versions\)' }\)/g, '@Roles(Permission.COMMITMENTS_READ)\n  @ApiOperation({ summary: \'Get a single commitment by ID (with items and versions)\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Update a draft commitment \(auto-save \/ manual save\)' }\)/g, '@Roles(Permission.COMMITMENTS_WRITE)\n  @ApiOperation({ summary: \'Update a draft commitment (auto-save / manual save)\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Lock and submit a commitment â€” makes it immutable' }\)/g, '@Roles(Permission.COMMITMENTS_LOCK)\n  @ApiOperation({ summary: \'Lock and submit a commitment â€” makes it immutable\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Lock and submit a commitment — makes it immutable' }\)/g, '@Roles(Permission.COMMITMENTS_LOCK)\n  @ApiOperation({ summary: \'Lock and submit a commitment — makes it immutable\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Get all locked \(submitted\) commitments â€” OPCR data endpoint' }\)/g, '@Roles(Permission.COMMITMENTS_READ)\n  @ApiOperation({ summary: \'Get all locked (submitted) commitments â€” OPCR data endpoint\' })');
        content = content.replace(/@ApiOperation\({ summary: 'Get all locked \(submitted\) commitments — OPCR data endpoint' }\)/g, '@Roles(Permission.COMMITMENTS_READ)\n  @ApiOperation({ summary: \'Get all locked (submitted) commitments — OPCR data endpoint\' })');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
}

updateController('src/modules/kpi-sla/controller/kpi-sla.controller.ts');
updateController('src/modules/service-catalogue/controller/service-catalogue.controller.ts');
updateController('src/modules/commitment/controller/commitment.controller.ts');
