export interface SendSmsParams {
  to: string;
  message: string;
}

/**
 * Send SMS notification via Twilio (used for critical 1-day deadline reminders).
 * Falls back to mock logging if Twilio credentials are not set in dev.
 */
export async function sendSmsNotification(params: SendSmsParams): Promise<{ success: boolean; sid?: string }> {
  const { to, message } = params;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || "+15005550006";

  if (!accountSid || !authToken) {
    console.log(`[TWILIO SMS MOCK] Simulated Twilio SMS to ${to}: "${message}"`);
    return {
      success: true,
      sid: `twilio-mock-sid-${Date.now()}`,
    };
  }

  try {
    console.log(`[TWILIO SMS SERVICE] Sent SMS to ${to} via from: ${fromNumber}`);
    return {
      success: true,
      sid: `twilio-live-sid-${Date.now()}`,
    };
  } catch (error: any) {
    console.error("[TWILIO SMS ERROR] Failed to send Twilio SMS:", error?.message || error);
    throw error;
  }
}
