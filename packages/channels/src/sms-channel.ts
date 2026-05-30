import type { ChannelSendResult, FollowUpMessage } from "@no-ghosting/shared";
import type { Channel } from "./base";

/**
 * SMS channel placeholder.
 * TODO: Implement with Twilio, MessageBird, or similar provider to nudge
 * recruiters via SMS if email isn't enough.
 */
export const smsChannel: Channel = {
  type: "sms",
  name: "SMS",

  async validateConfig(config: Record<string, unknown>): Promise<boolean> {
    return !!(config.accountSid && config.authToken && config.fromNumber);
  },

  async send(
    _message: FollowUpMessage,
    _config: Record<string, unknown>,
  ): Promise<ChannelSendResult> {
    return { success: false, error: "SMS channel not yet implemented" };
  },
};
