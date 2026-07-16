import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  if (!process.env.SMTP_USER) {
    console.log("[Notifier] SMTP not configured, skipping email");
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html: body,
    });
    console.log(`[Notifier] Email sent to ${to}: ${subject}`);
    return true;
  } catch (error: any) {
    console.error(`[Notifier] Failed to send email:`, error.message);
    return false;
  }
}

export function buildChangeNotification(
  taskName: string,
  changes: { field: string; old: any; new: any }[],
  taskUrl?: string
): string {
  const changeList = changes
    .map((c) => `<li><strong>${c.field}</strong>: ${JSON.stringify(c.old)} → ${JSON.stringify(c.new)}</li>`)
    .join("");

  return `
    <h2>Data Changed: ${taskName}</h2>
    <p>The following changes were detected:</p>
    <ul>${changeList}</ul>
    ${taskUrl ? `<p><a href="${taskUrl}">View Task</a></p>` : ""}
    <hr>
    <p style="color: #666; font-size: 12px;">Sent by BrowserBot Scheduler</p>
  `;
}
