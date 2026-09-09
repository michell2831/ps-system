
// Task 4: ServiceClassification enum removed. `classification` on the
// Service entity is now a free-text string so non-medical offices
// (Registrar, OSAS, etc.) can enter their own labels (e.g. "Walk-in",
// "With Billing Statement") instead of being forced into the CSC
// Simple/Complex/Highly Technical values. See service.entity.ts and
// create-service.dto.ts for the corresponding column/validation change.

export enum ServiceStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  ARCHIVED = 'Archived',
}


export enum FieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  DROPDOWN = 'DROPDOWN',
  BOOLEAN = 'BOOLEAN',
  FILE = 'FILE',
  /** @deprecated Use BOOLEAN instead — will be removed in a future release */
  CHECKBOX = 'CHECKBOX',
  /** @deprecated Use TEXT instead — will be removed in a future release */
  TEXTAREA = 'TEXTAREA',
}


export enum SlaUnit {
  MINUTES = 'Minutes',
  HOURS = 'Hours',
  DAYS = 'Days',
}


export enum ReferralStatus {
  WITH = 'With',
  WITHOUT = 'Without',
  NA = 'N/A',
}
