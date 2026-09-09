/**
 * permissions.js
 * Central source of truth for RBAC capability derivation.
 *
 * Roles (armsRole strings):
 *   SUPER_ADMIN      — full access to everything
 *   PLANNING_OFFICER — cross-office, manages KPIs/SLA/Periods/OPCR compile+lock
 *   OPCR_EVALUATOR   — campus director, review-only on OPCR
 *   SUBSYSTEM_ADMIN  — office head, manages own office services/KPIs
 *   STAFF            — read-only on service catalogue only
 */

export function getPermissions(user) {
    if (!user) {
        return buildPermissions({ role: 'STAFF', isCrossOffice: false });
    }

    const { armsRole = 'STAFF', isCrossOffice = false } = user;

    switch (armsRole) {

        case 'SUPER_ADMIN':
            return buildPermissions({
                role: 'SuperAdmin',
                isCrossOffice: true,
                canWriteServices: true,
                canWriteKpi: true,
                canWriteSla: true,
                canWriteHolidays: true,
                canWritePeriods: true,
                canWriteCommitments: true,
                canLockCommitments: true,
                canViewCommitments: true,
                canSeeAddServiceBtn: true,
                canSeeKpiActions: true,
                canSeeSlaForm: true,
                canSeeCommitmentsInSidebar: false, // ❌ Hidden from SuperAdmin sidebar (uses Campus OPCR Tracker)
                canSeeOtherOffices: true,
                canSeeServiceModes: true,
                canWriteServiceModes: true,
                canSeeOpcrTracker: true,
                canExportOpcr: true,
                canRequestRevision: true,
            });

        case 'PLANNING_OFFICER':
            return buildPermissions({
                role: 'PlanningOfficer',
                isCrossOffice: true,
                canWriteServices: false,       // ❌ NO Service Catalogue write
                canSeeAddServiceBtn: false,
                canWriteKpi: true,             // ✅ KPI Standards — all offices
                canSeeKpiActions: true,
                canWriteSla: true,             // ✅ SLA Rules — full
                canSeeSlaForm: true,
                canWriteHolidays: true,        // ✅ Holidays — full
                canWritePeriods: true,         // ✅ Evaluation Periods — full
                canWriteCommitments: true,     // ✅ Campus OPCR — Compile
                canLockCommitments: true,      // ✅ Campus OPCR — Lock
                canViewCommitments: true,
                canSeeCommitmentsInSidebar: false, // ❌ Hidden from Planning Officer sidebar (uses Campus OPCR Tracker & Planning Hub)
                canSeeOtherOffices: true,
                canSeePlanningHub: true,       // ✅ PS-P01 Planning Hub (Planning Officer only)
                canSeeOpcrTracker: true,       // ✅ PS-P06 Campus OPCR Tracker (Planning Officer only)
                canSeeServiceModes: true,      // ✅ Service Mode Library
                canWriteServiceModes: true,    // ✅ Service Modes write
                canExportOpcr: true,           // ✅ Export OPCR
                canRequestRevision: false,     // ❌ NO Request Revision
            });

        case 'CAMPUS_DIRECTOR':
            return buildPermissions({
                role: 'CampusDirector',
                isCrossOffice: true,
                canWriteServices: false,
                canSeeAddServiceBtn: false,
                canWriteKpi: false,
                canSeeKpiActions: false,
                canWriteSla: false,
                canSeeSlaForm: false,
                canWriteHolidays: false,
                canWritePeriods: false,
                canWriteCommitments: false,
                canLockCommitments: false,
                canViewCommitments: true,      // ✅ Review / View Only
                canSeeCommitmentsInSidebar: true,
                canSeeOtherOffices: true,      // ✅ Full campus-wide view (no office filter)
                canSeeServiceModes: true,
                canWriteServiceModes: false,
                canExportOpcr: true,           // ✅ Download only
                canRequestRevision: false,
                isCampusDirector: true,
            });

        case 'OPCR_EVALUATOR':
            return buildPermissions({
                role: 'OPCREvaluator',
                isCrossOffice: true,
                canWriteServices: false,
                canSeeAddServiceBtn: false,
                canWriteKpi: false,
                canSeeKpiActions: false,
                canWriteSla: false,
                canSeeSlaForm: false,
                canWriteHolidays: false,
                canWritePeriods: false,
                canWriteCommitments: false,
                canLockCommitments: false,
                canViewCommitments: true,      // ✅ Review Only
                canSeeCommitmentsInSidebar: true,
                canSeeOtherOffices: true,
                canSeeServiceModes: false,
                canWriteServiceModes: false,
                canExportOpcr: true,           // ✅ Download only
                canRequestRevision: false,
            });

        case 'SUBSYSTEM_ADMIN':
            return buildPermissions({
                role: 'Admin',
                isCrossOffice: false,
                canWriteServices: true,        // ✅ own office
                canSeeAddServiceBtn: true,
                canWriteKpi: false,            // ❌ Transferred to Planning Officer (AC1, AC4)
                canSeeKpiActions: false,       // ❌ Hide write controls (AC4)
                canWriteSla: false,            // ❌ NO SLA Rules write (AC1, AC4)
                canSeeSlaForm: false,          // ❌ Hide SLA write form (AC4)
                canWriteHolidays: false,       // ❌ Transferred to Planning Officer (AC1, AC4, AC5)
                canWritePeriods: false,        // ❌ NO Periods write (AC1, AC4)
                canWriteCommitments: true,     // ✅ submit own targets
                canLockCommitments: false,     // ❌ NO lock
                canViewCommitments: true,      // ✅ view-only OPCR
                canSeeCommitmentsInSidebar: true,
                canSeeOtherOffices: false,
                canSeeServiceModes: false,
                canWriteServiceModes: false,
                canExportOpcr: true,           // ✅ download
                canRequestRevision: true,      // ✅ own office
            });

        case 'STAFF':
        default:
            return buildPermissions({
                role: 'Staff',
                isCrossOffice: false,
                canWriteServices: false,
                canSeeAddServiceBtn: false,
                canWriteKpi: false,
                canSeeKpiActions: false,
                canWriteSla: false,
                canSeeSlaForm: false,
                canWriteHolidays: false,
                canWritePeriods: false,
                canWriteCommitments: false,
                canLockCommitments: false,
                canViewCommitments: false,
                canSeeCommitmentsInSidebar: false,
                canSeeOtherOffices: false,
                canSeeServiceModes: false,
                canWriteServiceModes: false,
                canExportOpcr: false,
                canRequestRevision: false,
            });
    }
}

function buildPermissions(overrides) {
    return {
        role: 'Staff',
        isCrossOffice: false,
        canWriteServices: false,
        canWriteKpi: false,
        canWriteSla: false,
        canWriteHolidays: false,
        canWritePeriods: false,
        canWriteCommitments: false,
        canLockCommitments: false,
        canViewCommitments: false,
        canSeeAddServiceBtn: false,
        canSeeKpiActions: false,
        canSeeSlaForm: false,
        canSeeCommitmentsInSidebar: false,
        canSeeOtherOffices: false,
        canSeePlanningHub: false,
        canSeeOpcrTracker: false,
        canSeeServiceModes: false,
        canWriteServiceModes: false,
        canExportOpcr: false,
        canRequestRevision: false,
        isCampusDirector: false,
        ...overrides,
    };
}

/**
 * Checks whether a record's office matches the current user's office scope.
 * If perms.canSeeOtherOffices is true (cross-office), always returns true.
 */
export function isInScope(recordOffice, userOffice, perms) {
    if (!perms || perms.canSeeOtherOffices) return true;
    if (!recordOffice || !userOffice) return true;
    return normalizeOffice(recordOffice) === normalizeOffice(userOffice);
}

/**
 * Normalize office strings for comparison.
 */
export function normalizeOffice(office) {
    if (!office) return '';
    const upper = office.toUpperCase().trim();
    if (upper.includes('ACAD') || upper.includes('ACADEMIC')) return 'ACAD';
    if (upper === 'OSAS' || upper.includes('STUDENT SERVICES AND AFFAIRS') || upper.includes('CAMPUS STUDENT')) return 'OSAS';
    if (upper.includes('ADMIN') || upper.includes('ADMINISTRATIVE')) return 'ADMIN';
    return upper;
}