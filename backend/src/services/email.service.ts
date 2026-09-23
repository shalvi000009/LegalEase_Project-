import sgMail from "@sendgrid/mail";

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL || "reminders@legalease.app";

if (apiKey) {
  sgMail.setApiKey(apiKey);
}

export interface SendReminderEmailParams {
  to: string;
  userName: string;
  documentTitle: string;
  dateType: string;
  resolvedDate: Date;
  daysBefore: number;
}

/**
 * Send deadline reminder transactional email via SendGrid.
 * Falls back to mock logging if SENDGRID_API_KEY is not configured.
 */
export async function sendReminderEmail(params: SendReminderEmailParams): Promise<{ success: boolean; messageId?: string }> {
  const { to, userName, documentTitle, dateType, resolvedDate, daysBefore } = params;

  const formattedDate = new Date(resolvedDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const readableDateType = dateType.replace(/_/g, " ").toUpperCase();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f8; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
          .header { background: #1e293b; color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .content { padding: 32px; }
          .alert-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px; }
          .details-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          .details-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          .details-table td.label { font-weight: bold; color: #64748b; width: 40%; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LegalEase Deadline Alert</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <div class="alert-box">
              <strong>Notice:</strong> You have an upcoming contract deadline in <strong>${daysBefore} day(s)</strong>.
            </div>
            <table class="details-table">
              <tr>
                <td class="label">Contract Document:</td>
                <td><strong>${documentTitle}</strong></td>
              </tr>
              <tr>
                <td class="label">Deadline Type:</td>
                <td><strong>${readableDateType}</strong></td>
              </tr>
              <tr>
                <td class="label">Deadline Date:</td>
                <td><strong>${formattedDate}</strong></td>
              </tr>
            </table>
            <p style="margin-top: 24px;">Please review your contract and take any necessary actions before the deadline expires.</p>
          </div>
          <div class="footer">
            LegalEase AI Contract Analysis Platform &bull; Automated Reminder Service
          </div>
        </div>
      </body>
    </html>
  `;

  const msg = {
    to,
    from: fromEmail,
    subject: `[LegalEase Alert] ${readableDateType} for ${documentTitle} in ${daysBefore} day(s)`,
    html: htmlContent,
  };

  if (!apiKey || process.env.MOCK_SERVICES === "true") {
    console.log(`[EMAIL SERVICE MOCK] Simulated SendGrid email to ${to}: "${msg.subject}"`);
    return { success: true, messageId: `mock-${Date.now()}` };
  }

  try {
    const [response] = await sgMail.send(msg);
    console.log(`[EMAIL SERVICE] SendGrid email sent successfully to ${to}. Status Code: ${response.statusCode}`);
    return { success: true, messageId: response.headers["x-message-id"] as string };
  } catch (error: any) {
    console.error("[EMAIL SERVICE ERROR] Failed to send SendGrid email:", error?.response?.body || error.message);
    throw error;
  }
}
