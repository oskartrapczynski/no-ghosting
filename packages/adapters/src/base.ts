import type { AtsSyncResult } from "@no-ghosting/shared";

/**
 * Base interface that every ATS adapter must implement.
 *
 * Each adapter handles one ATS system (Taleo, iCIMS, Workday, etc.)
 * and knows how to pull candidates and pipelines from it.
 */
export interface AtsAdapter {
  /** Unique identifier for this adapter (e.g., "taleo", "icims") */
  readonly id: string;

  /** Human-readable name (e.g., "Oracle Taleo") */
  readonly name: string;

  /** Test connection to the ATS */
  testConnection(config: Record<string, unknown>): Promise<boolean>;

  /** Sync all pipelines and candidates from the ATS */
  sync(config: Record<string, unknown>): Promise<AtsSyncResult>;
}
