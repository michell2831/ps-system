export enum Permission {
    SERVICES_READ = 'services.read',
    SERVICES_WRITE = 'services.write',
    KPIS_READ = 'kpis.read',
    KPIS_WRITE = 'kpis.write',
    HOLIDAYS_READ = 'holidays.read',
    HOLIDAYS_WRITE = 'holidays.write',
    PERIODS_READ = 'periods.read',
    PERIODS_WRITE = 'periods.write',
    COMMITMENTS_READ = 'commitments.read',
    COMMITMENTS_WRITE = 'commitments.write',
    COMMITMENTS_LOCK = 'commitments.lock',
    SERVICE_MODES_READ = 'service-modes.read',
    SERVICE_MODES_WRITE = 'service-modes.write',
    PLANNING_TIMELINE_READ = 'planning-timeline.read',
    // PS-P01 / PS-P06 — Planning Hub & OPCR Tracker (Planning Officer only)
    PLANNING_HUB_READ = 'planning-hub.read',
    // Gated audit log inspection (restricted read access)
    AUDIT_LOGS_READ = 'audit-logs.read',
}