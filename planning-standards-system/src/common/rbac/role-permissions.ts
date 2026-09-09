
import { Role } from './role.enum';
import { Permission } from './permission.enum';

export const RolePermissions: Record<Role, Permission[]> = {
    [Role.SUPER_ADMIN]: [
        Permission.SERVICES_READ,
        Permission.SERVICES_WRITE,
        Permission.KPIS_READ,
        Permission.KPIS_WRITE,
        Permission.HOLIDAYS_READ,
        Permission.HOLIDAYS_WRITE,
        Permission.PERIODS_READ,
        Permission.PERIODS_WRITE,
        Permission.COMMITMENTS_READ,
        Permission.COMMITMENTS_WRITE,
        Permission.COMMITMENTS_LOCK,
        Permission.SERVICE_MODES_READ,
        Permission.SERVICE_MODES_WRITE,
        Permission.PLANNING_TIMELINE_READ,
        Permission.PLANNING_HUB_READ,
        Permission.AUDIT_LOGS_READ,
    ],

    [Role.PLANNING_OFFICER]: [
        Permission.SERVICES_READ,           // Service Catalogue — cross-office read
        Permission.KPIS_READ,
        Permission.KPIS_WRITE,             // KPI Standards — all offices
        Permission.HOLIDAYS_READ,
        Permission.HOLIDAYS_WRITE,          // SLA Rules — full
        Permission.PERIODS_READ,
        Permission.PERIODS_WRITE,           // Evaluation Periods — full
        Permission.SERVICE_MODES_READ,
        Permission.SERVICE_MODES_WRITE,     // Service Mode Library — full
        Permission.PLANNING_TIMELINE_READ,  // Planning Timeline — view
        Permission.COMMITMENTS_READ,        // Office Target Submissions — view all
        Permission.COMMITMENTS_WRITE,       // Campus OPCR — Compile
        Permission.COMMITMENTS_LOCK,        // Campus OPCR — Lock
        Permission.PLANNING_HUB_READ,       // PS-P01 Planning Hub + PS-P06 OPCR Tracker
    ],

    [Role.ADMIN]: [
        // SubsystemAdmin — own office only
        Permission.SERVICES_READ,
        Permission.SERVICES_WRITE,          // Service Catalogue — own office
        Permission.KPIS_READ,
        Permission.KPIS_WRITE,              // KPI Standards — own office
        Permission.HOLIDAYS_READ,
        Permission.HOLIDAYS_WRITE,          // needed for own office SLA mgmt
        Permission.PERIODS_READ,            // read-only periods
        Permission.SERVICE_MODES_READ,      // read-only service modes
        Permission.COMMITMENTS_READ,        // Campus OPCR — view-only
        Permission.COMMITMENTS_WRITE,       // Office Target Submissions — submit own
        Permission.AUDIT_LOGS_READ,         // Gated audit log inspection
    ],

    [Role.OPCR_EVALUATOR]: [
        Permission.SERVICES_READ,
        Permission.KPIS_READ,
        Permission.HOLIDAYS_READ,
        Permission.PERIODS_READ,
        Permission.COMMITMENTS_READ,        // Campus OPCR — Review Only + download
        Permission.SERVICE_MODES_READ,
    ],

    [Role.STAFF]: [
        Permission.SERVICES_READ,
        Permission.KPIS_READ,
        Permission.HOLIDAYS_READ,
        Permission.PERIODS_READ,
        Permission.SERVICE_MODES_READ,
        Permission.COMMITMENTS_READ,
        Permission.PLANNING_HUB_READ,
        Permission.PLANNING_TIMELINE_READ,
    ],

    // TT3 (AC7): CampusDirector — GET all data campus-wide, no write access.
    // isCrossOffice is set true by JwtAuthGuard for this role so all queries
    // bypass the office_id WHERE clause automatically.
    // FE removes ALL write buttons from DOM for this role (TT3 AC8).
    [Role.CAMPUS_DIRECTOR]: [
        Permission.SERVICES_READ,
        Permission.KPIS_READ,
        Permission.HOLIDAYS_READ,
        Permission.PERIODS_READ,
        Permission.COMMITMENTS_READ,
        Permission.SERVICE_MODES_READ,
        Permission.PLANNING_TIMELINE_READ,
        Permission.PLANNING_HUB_READ,       // Campus-wide planning view
    ],
};