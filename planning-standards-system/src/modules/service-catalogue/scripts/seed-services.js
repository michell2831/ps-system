/**
 * TT1 — DB Seed: Administrative, Academic, OSAS Services
 * PSS Service Catalogue Microservice (Sprint 4 — BE Dev 1 - Steph)
 *
 * Fixes applied over the original SEEDING_INSTRUCTIONS.md, based on an audit
 * of the actual data in CHARTER SEEDER/output/*.json:
 *
 *  FIX 1 — Dedupe key changed from (office, name) to (office, name, service_mode).
 *          The raw data has multiple real, distinct services sharing the same
 *          `name` (e.g. "Processing of Request for Credentials Service" x4),
 *          differentiated only by `service_mode`. A name-only dedupe check
 *          would wrongly skip 3 of those 4 as "already exists".
 *
 *  FIX 2 — with_referral is derived from `service_mode`, not parsed out of
 *          `name`. Zero records in the actual data have "(With Referral)" /
 *          "(Without Referral)" in the name string, so the original
 *          name-parsing rule would always fall through to "Non-Referral" and
 *          silently discard the real referral data.
 *
 *  FIX 3 — Name disambiguation. When several records share the same
 *          (office, name) but different service_mode values, the mode is
 *          appended to the name on insert (e.g. "... — Transcript of
 *          Records") so they don't collide as indistinguishable rows in the
 *          `service` table. Only applied when the name is actually ambiguous
 *          — untouched otherwise.
 *
 * Everything else follows SEEDING_INSTRUCTIONS.md as written:
 *   - service_mode itself is still omitted from the POST payload (not a DB column)
 *   - required_documents string -> array parsing
 *   - sla_target_unit always sent as "minutes"
 *   - status "Active", created_by "system_seed"
 *   - office header read per-record from the "office" field
 *   - intake_fields posted only for services actually created (not skipped)
 *
 * Usage:
 *   node seed-services.js --dry-run     # audit + preview only, no API calls
 *   node seed-services.js               # actually seed against the running API
 *
 * Env vars:
 *   API_BASE   default: http://localhost:3000
 */

const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const DRY_RUN = process.argv.includes('--dry-run');

const DATA_DIR = process.env.SEED_DATA_DIR || path.join(__dirname, 'data');
const BATCH_FILES = [
  'batch1_academic_office.json',
  'batch2_osas.json',
  'batch3_administrative_office.json',
];

// ---------------------------------------------------------------------------
// 1. Load + merge all batch files
// ---------------------------------------------------------------------------
function loadRecords() {
  const all = [];
  for (const file of BATCH_FILES) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Seed file not found: ${filePath}`);
    }
    const records = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    for (const r of records) {
      r._sourceFile = file;
    }
    all.push(...records);
  }
  return all;
}

// ---------------------------------------------------------------------------
// 2. FIX 1 — build a dedupe key on (office, name, service_mode) and drop
//    exact cross-file overlaps (e.g. 3 records identical in batch1 + batch2)
// ---------------------------------------------------------------------------
function dedupeExactOverlaps(records) {
  const seen = new Map(); // key -> first record kept
  const kept = [];
  const droppedExactOverlaps = [];

  for (const r of records) {
    const key = [r.office, r.name, r.service_mode ?? null].join('||');
    if (seen.has(key)) {
      droppedExactOverlaps.push(r);
      continue;
    }
    seen.set(key, r);
    kept.push(r);
  }

  return { kept, droppedExactOverlaps };
}

// ---------------------------------------------------------------------------
// SCHEMA UPDATE (2026-07-11): the database now has a dedicated `service_mode`
// column on `service`, with a native DB-level unique constraint on
// (office, name, service_mode). This replaces the earlier workaround of
// appending the mode into `name` (that was only ever needed because no
// proper field existed yet). We no longer need to disambiguate names at
// all — records keep their original, clean name, and service_mode is sent
// as its own field in the payload.
// ---------------------------------------------------------------------------
function markDisambiguation(records) {
  // Kept as a no-op passthrough (still called from main()) so the rest of
  // the pipeline doesn't need restructuring — _finalName is now just the
  // original name, unmodified.
  return records.map((r) => ({ ...r, _finalName: r.name, _wasDisambiguated: false }));
}

// (FIX 2 — with_referral is derived from service_mode, not parsed from the
// name. The actual derivation function is defined further below alongside
// FIX 6, which also corrects the enum values to match the live API.)

// ---------------------------------------------------------------------------
// FIX 4 — the live CreateServiceDto does NOT accept office / status /
// created_by in the body at all (whitelist-stripped/rejected — confirmed via
// live 400 errors: "property office should not exist", etc). The controller
// derives office from the x-office header and created_by from x-actor-id
// server-side. status defaults automatically. Only send what the DTO allows.
// ---------------------------------------------------------------------------

// FIX 5 — sla_target_unit enum is capitalized: 'Minutes' | 'Hours' | 'Days'
// (SlaUnit enum in service-catalogue/enums), not lowercase 'minutes'.
const SLA_UNIT = 'Minutes';

// FIX 6 — with_referral enum is 'With' | 'Without' | 'N/A' (ReferralStatus
// enum), NOT 'Non-Referral'. The seeding docs' default value was invalid.
function deriveWithReferral(serviceMode) {
  if (serviceMode === 'With Referral') return 'With';
  if (serviceMode === 'Without Referral') return 'Without';
  return 'N/A';
}

// name has a hard 100-char DB/DTO limit (MaxLength(100)). A handful of raw
// names exceed this on their own (independent of service_mode, which is no
// longer appended to the name at all — see markDisambiguation above).
function truncateName(name, maxLen = 100) {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 1) + '…';
}

function parseRequiredDocuments(raw) {
  if (!raw || raw.trim() === '' || raw.trim() === 'No Requirements Needed') {
    return [];
  }
  return raw.split('; ').map((s) => s.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Build the POST payload for a single record. office/status/created_by are
// intentionally NOT included — the live API rejects them; office comes from
// the x-office header, created_by from x-actor-id, status defaults server-side.
// service_mode is now sent as its own field (see schema update note above).
// ---------------------------------------------------------------------------
function buildServicePayload(record) {
  return {
    name: record._finalName,
    service_mode: record.service_mode || undefined,
    responsible_unit: record.responsible_unit,
    classification: record.classification,
    sla_target_value: Number(record.sla_target_value),
    sla_target_unit: SLA_UNIT,
    processing_steps: record.processing_steps,
    required_documents: parseRequiredDocuments(record.required_documents),
    expected_output: record.expected_output,
    with_referral: deriveWithReferral(record.service_mode),
  };
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
// NOTE: The commitment/service-catalogue JwtAuthGuard (src/common/guards/jwt-auth.guard.ts)
// does NOT use x-mock-role / x-mock-office (that scheme is outdated — it predates the
// current guard). Instead it trusts requests carrying x-actor-id and/or x-office,
// treating them as if they were already validated + forwarded by the API Gateway.
// RolesGuard then checks x-role against RolePermissions — 'Admin' has both
// SERVICES_READ and SERVICES_WRITE (see src/common/rbac/role-permissions.ts).
function authHeaders(office) {
  return {
    'x-actor-id': 'system_seed',
    'x-actor-username': 'system_seed',
    'x-office': office,
    'x-role': 'Admin',
    'x-arms-role': 'SUBSYSTEM_ADMIN',
    'x-is-cross-office': 'false',
  };
}

async function apiGet(pathname, office) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    method: 'GET',
    headers: authHeaders(office),
  });
  if (!res.ok) {
    throw new Error(`GET ${pathname} (${office}) failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function apiPost(pathname, office, body) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(office),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    const err = new Error(`POST ${pathname} (${office}) failed: ${res.status} ${JSON.stringify(json)}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

// ---------------------------------------------------------------------------
// Fetch existing service names per office (idempotency lookup)
// ---------------------------------------------------------------------------
async function fetchAllServicesForOffice(office) {
  // BUG FIX — GET /api/services defaults to limit=20, sorted newest-first
  // (see pagination.dto.ts). Any office with more than 20 services had
  // older entries silently fall onto page 2+, which a single unpaginated
  // call never saw — causing this script to think they didn't exist yet
  // and re-POST them, hitting a real 409 Conflict from the DB. Loop through
  // all pages explicitly, using the max allowed page size (100), so this
  // holds regardless of how many services an office ends up with.
  const all = [];
  let page = 1;
  const limit = 100; // DTO max — see pagination.dto.ts @Max(100)
  while (true) {
    const res = await apiGet(`/api/services?page=${page}&limit=${limit}`, office);
    const list = Array.isArray(res) ? res : (res?.data ?? []);
    all.push(...list);
    const total = Array.isArray(res) ? list.length : (res?.total ?? list.length);
    if (all.length >= total || list.length === 0) break;
    page += 1;
  }
  return all;
}

async function fetchExistingServicesByOffice(offices) {
  const lookup = new Map(); // office -> Map(name -> id)
  for (const office of offices) {
    const list = await fetchAllServicesForOffice(office);
    // Map name -> id, so already-existing services can still be checked/
    // backfilled for intake fields (needed because a prior buggy run could
    // have created services successfully but failed on their intake fields).
    const byName = new Map(list.map((s) => [s.name, s.id]));
    lookup.set(office, byName);
  }
  return lookup;
}

async function getIntakeFieldCount(serviceId, office) {
  const existing = await apiGet(`/api/services/${serviceId}/intake-fields`, office);
  const list = Array.isArray(existing) ? existing : (existing?.data ?? []);
  return list.length;
}

async function createIntakeFields(serviceId, office, intakeFields, results, finalName) {
  for (const field of intakeFields) {
    try {
      await apiPost(`/api/services/${serviceId}/intake-fields`, office, {
        label: field.label,
        field_type: (field.field_type || '').toUpperCase(),
        is_required: field.is_required,
        display_order: field.display_order,
        dropdown_options: null,
      });
      results.intakeFieldsCreated += 1;
    } catch (fieldErr) {
      results.errors.push({ service: finalName, stage: 'intake_field', error: fieldErr.message });
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n=== TT1 Seed — Service Catalogue ===`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no API calls)' : 'LIVE'}`);
  console.log(`API base: ${API_BASE}\n`);

  const raw = loadRecords();
  console.log(`Loaded ${raw.length} raw records from ${BATCH_FILES.length} files.`);

  const { kept, droppedExactOverlaps } = dedupeExactOverlaps(raw);
  console.log(`Dropped ${droppedExactOverlaps.length} exact cross-file duplicate(s):`);
  for (const d of droppedExactOverlaps) {
    console.log(`  - [${d._sourceFile}] "${d.name}" (${d.office}, mode: ${d.service_mode ?? 'null'})`);
  }

  const records = markDisambiguation(kept);
  const disambiguatedCount = records.filter((r) => r._wasDisambiguated).length;
  console.log(`\n${disambiguatedCount} record(s) had their name disambiguated with service_mode suffix.`);
  if (disambiguatedCount > 0) {
    console.log('Examples:');
    records
      .filter((r) => r._wasDisambiguated)
      .slice(0, 5)
      .forEach((r) => console.log(`  - "${r.name}" -> "${r._finalName}"`));
  }

  console.log(`\nFinal unique record count to attempt: ${records.length}`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN: sample payloads ---');
    records.slice(0, 3).forEach((r, i) => {
      console.log(`\n[${i + 1}] office header: ${r.office}`);
      console.log(JSON.stringify(buildServicePayload(r), null, 2));
    });
    console.log('\nDry run complete. No API calls were made.');
    return;
  }

  const offices = [...new Set(records.map((r) => r.office))];
  console.log(`\nFetching existing services for offices: ${offices.join(', ')}`);
  const existingByOffice = await fetchExistingServicesByOffice(offices);

  const results = {
    attempted: records.length,
    created: 0,
    skipped: 0,
    intakeFieldsCreated: 0,
    intakeFieldsBackfilled: 0,
    errors: [],
  };

  for (const record of records) {
    const office = record.office;
    const finalName = record._finalName;
    const officeMap = existingByOffice.get(office) || new Map();
    const intakeFields = record.intake_fields || [];

    const existingId = officeMap.get(finalName);
    if (existingId) {
      results.skipped += 1;
      // Recovery path: the service exists (created in a prior run), but that
      // run may have failed partway through its intake fields (e.g. the
      // field_type casing bug). Check if it actually has fields yet, and
      // backfill only if it doesn't — never duplicate on a true re-run.
      if (intakeFields.length > 0) {
        try {
          const currentCount = await getIntakeFieldCount(existingId, office);
          if (currentCount === 0) {
            await createIntakeFields(existingId, office, intakeFields, results, finalName);
            results.intakeFieldsBackfilled += 1;
          }
        } catch (err) {
          results.errors.push({ service: finalName, stage: 'intake_field_check', error: err.message });
        }
      }
      continue;
    }

    try {
      const payload = buildServicePayload(record);
      const created = await apiPost('/api/services', office, payload);
      results.created += 1;
      officeMap.set(finalName, created.id); // prevent re-creating within this same run

      await createIntakeFields(created.id, office, intakeFields, results, finalName);
    } catch (err) {
      if (err.status === 409) {
        // The listing endpoint's pagination is unreliable (see comments on
        // fetchAllServicesForOffice / a backend na_flags join bug), so it
        // can miss services that genuinely exist. A 409 here is the DB's
        // own source of truth: this service really does already exist.
        // Treat it as a skip instead of a hard error, and try to recover
        // its id via the search filter so intake fields can still be
        // backfilled if needed.
        results.skipped += 1;
        try {
          const searchRes = await apiGet(`/api/services?search=${encodeURIComponent(finalName)}&limit=100`, office);
          const list = Array.isArray(searchRes) ? searchRes : (searchRes?.data ?? []);
          const match = list.find((s) => s.name === finalName);
          if (match && intakeFields.length > 0) {
            const currentCount = await getIntakeFieldCount(match.id, office);
            if (currentCount === 0) {
              await createIntakeFields(match.id, office, intakeFields, results, finalName);
              results.intakeFieldsBackfilled += 1;
            }
          }
        } catch (lookupErr) {
          results.errors.push({ service: finalName, stage: 'conflict_lookup', error: lookupErr.message });
        }
      } else {
        results.errors.push({ service: finalName, stage: 'service', error: err.message });
      }
    }
  }

  console.log('\n=== Seeding Report ===');
  console.log(`Total attempted:        ${results.attempted}`);
  console.log(`Created (new):          ${results.created}`);
  console.log(`Skipped (already existed): ${results.skipped}`);
  console.log(`Intake fields created:  ${results.intakeFieldsCreated}`);
  console.log(`Services backfilled with missing intake fields: ${results.intakeFieldsBackfilled}`);
  console.log(`Errors:                 ${results.errors.length}`);
  if (results.errors.length > 0) {
    console.log('\n--- Errors ---');
    results.errors.forEach((e) => console.log(`  [${e.stage}] "${e.service}": ${e.error}`));
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});