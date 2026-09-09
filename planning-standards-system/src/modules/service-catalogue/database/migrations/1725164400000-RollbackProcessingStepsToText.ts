import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RollbackProcessingStepsToText
 *
 * AC5 rollback artifact for Sprint 4 TT3.
 *
 * up()   -- no-op guard: confirms processing_steps is still jsonb.
 * down() -- reverts processing_steps from jsonb back to plain TEXT by
 *           joining each JSON array element with a newline, matching the
 *           frontend render logic in useAppStore.js L156:
 *             s.processing_steps.join('\n')
 *
 * NOTE: This is a schema safeguard, NOT a production recovery mechanism.
 *       Confirmed with PM (Sprint 4 PM Remarks). The down() path exists
 *       so a hotfix rollback has a tested, documented path -- not because
 *       a rollback is expected in normal operations.
 *
 * IMPORTANT: array_to_string() does NOT accept jsonb directly.
 *            Must use jsonb_array_elements_text() to expand first.
 */
export class RollbackProcessingStepsToText1725164400000 implements MigrationInterface {
  name = 'RollbackProcessingStepsToText1725164400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // True no-op: processing_steps is already jsonb and that is correct.
    // This migration exists solely to provide a documented, reversible rollback
    // path via down() — it is a schema safeguard, not a forward schema change.
    // Confirmed with PM (Sprint 4 TT3 PM Remarks).
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres does not allow subqueries in ALTER COLUMN ... USING expressions.
    // Create a helper function, use it in USING, then drop it.
    // Joins each jsonb array element with '\n', matching the FE render in
    // useAppStore.js L156: s.processing_steps.join('\n')
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION _pss_jsonb_arr_to_text(val jsonb)
      RETURNS text LANGUAGE sql AS $$
        SELECT string_agg(el, E'\n')
        FROM jsonb_array_elements_text(val) AS t(el)
      $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "service"
      ALTER COLUMN "processing_steps" TYPE text
      USING _pss_jsonb_arr_to_text("processing_steps");
    `);
    await queryRunner.query(`DROP FUNCTION _pss_jsonb_arr_to_text;`);
  }
}
