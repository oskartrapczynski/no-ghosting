import nodemailer from "nodemailer";
import type { ChannelSendResult, FollowUpMessage } from "@no-ghosting/shared";
import type { Channel } from "./base";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export const emailChannel: Channel = {
  type: "email",
  name: "Email (SMTP)",

  async validateConfig(config: Record<string, unknown>): Promise<boolean> {
    const smtp = config as unknown as SmtpConfig;
    if (!smtp.host || !smtp.port || !smtp.user || !smtp.pass) {
      return false;
    }
    try {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure ?? false,
        auth: { user: smtp.user, pass: smtp.pass },
      });
      await transporter.verify();
      return true;
    } catch {
      return false;
    }
  },

  async send(
    message: FollowUpMessage,
    config: Record<string, unknown>,
  ): Promise<ChannelSendResult> {
    const smtp = config as unknown as SmtpConfig;

    if (!message.to.email) {
      return { success: false, error: "No email address for candidate" };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure ?? false,
        auth: { user: smtp.user, pass: smtp.pass },
      });

      const result = await transporter.sendMail({
        from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
        to: message.to.email,
        subject: message.subject ?? `Update on your application`,
        text: message.body,
      });

      return { success: true, messageId: result.messageId };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  },
};
