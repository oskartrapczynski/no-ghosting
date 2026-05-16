import type { ChannelSendResult, FollowUpMessage } from "@no-ghosting/shared";

/**
 * Base interface for all notification channels.
 * Each channel knows how to deliver a follow-up message to a candidate.
 */
export interface Channel {
  /** Channel type identifier */
  readonly type: "email" | "sms" | "ats_message";

  /** Human-readable name */
  readonly name: string;

  /** Validate that the channel is properly configured */
  validateConfig(config: Record<string, unknown>): Promise<boolean>;

  /** Send a follow-up message */
  send(
    message: FollowUpMessage,
    config: Record<string, unknown>,
  ): Promise<ChannelSendResult>;
}
