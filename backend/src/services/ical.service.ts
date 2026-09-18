/**
 * Generate RFC 5545 iCalendar (.ics) string format for contract deadline reminders.
 */
export function generateICalFeed(reminders: any[]): string {
  const formatDateToICal = (dateStr: Date | string): string => {
    const d = new Date(dateStr);
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const nowFormatted = formatDateToICal(new Date());

  let icsLines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LegalEase AI Platform//Contract Deadline Reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:LegalEase Contract Deadlines",
    "X-WR-TIMEZONE:UTC",
  ];

  for (const item of reminders) {
    const contractDate = item.contract_date;
    const document = contractDate?.document;

    const docName = document?.filename || "Contract Document";
    const dateType = contractDate?.date_type ? contractDate.date_type.replace(/_/g, " ").toUpperCase() : "DEADLINE";
    const rawText = contractDate?.raw_text || "";
    const dtStart = contractDate?.resolved_date ? formatDateToICal(contractDate.resolved_date) : formatDateToICal(item.scheduled_for);

    const uid = `reminder-${item.id}@legalease.app`;
    const summary = `LegalEase Alert: ${dateType} - ${docName}`;
    const description = `Deadline Type: ${dateType}\\nDocument: ${docName}\\nSource Text: ${rawText}\\nRemind Days Before: ${item.days_before}`;

    icsLines.push("BEGIN:VEVENT");
    icsLines.push(`UID:${uid}`);
    icsLines.push(`DTSTAMP:${nowFormatted}`);
    icsLines.push(`DTSTART:${dtStart}`);
    icsLines.push(`DTEND:${dtStart}`);
    icsLines.push(`SUMMARY:${summary}`);
    icsLines.push(`DESCRIPTION:${description}`);
    icsLines.push("STATUS:CONFIRMED");
    icsLines.push("END:VEVENT");
  }

  icsLines.push("END:VCALENDAR");

  return icsLines.join("\r\n");
}
