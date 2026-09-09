export enum WorkScheduleType {
    WEEKDAYS = 'WEEKDAYS',
    MONDAY_TO_SATURDAY = 'MONDAY_TO_SATURDAY',
    CUSTOM = 'CUSTOM',
}
export enum HolidayType {
    REGULAR = 'REGULAR',
    SPECIAL_NON_WORKING = 'SPECIAL_NON_WORKING',
    COMPANY = 'COMPANY',
}
export enum PeriodType {
    MONTHLY = 'Monthly',
    QUARTERLY = 'Quarterly',
    YEARLY = 'Yearly',
    SEMI_ANNUAL = 'SEMI_ANNUAL',
    BI_ANNUAL = 'BI_ANNUAL',
    /** @deprecated Use YEARLY instead */
    ANNUAL = 'Annual',
    /** @deprecated Use QUARTERLY or YEARLY instead */
    SEMESTER = 'Semester',
}
export enum PeriodStatus {
    OPEN = 'Open',
    CLOSED = 'Closed',
    ARCHIVED = 'Archived',
    QUEUED = 'Queued',
}
export enum KpiCategory {
    EFFICIENCY = 'EFFICIENCY',
    COMPLIANCE = 'COMPLIANCE',
    CUSTOMER = 'CUSTOMER',
}
export enum KpiUnit {
    DAYS = 'DAYS',
    PERCENT = 'PERCENT',
    COUNT = 'COUNT',
}