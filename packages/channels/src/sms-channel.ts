import type { ChannelSendResult, FollowUpMessage } from "@no-ghosting/shared";
import type { Channel } from "./base";

/**
 * SMS channel placeholder.
 * TODO: Implement with Twilio, MessageBird, or similar provider.
 */
export const smsChannel: Channel = {
  type: "sms",
  name: "SMS",

  async validateConfig(config: Record<string, unknown>): Promise<boolean> {
    return !!(config.accountSid && config.authToken && config.fromNumber);
  },

  async send(
    message: FollowUpMessage,
    _config: Record<string, unknown>,
  ): Promise<ChannelSendResult> {
    if (!message.to.phone) {
      return { success: false, error: "No phone number for candidate" };
    }

    // TODO: Implement actual SMS sending
    console.log(
      `[SMS] Would send to ${message.to.phone}: ${message.body.slice(0, 160)}`,
    );
    return { success: false, error: "SMS channel not yet implemented" };
  },
};
