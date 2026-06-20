import { calendarDate, type CalendarDate } from "@/lib/calendar-date";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

function splitLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line.charAt(i);
    if (inQuotes) {
      if (c === '"') {
        if (line.charAt(i + 1) === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result.map((s) => s.trim());
}

export function parseCsv(text: string): ParsedCsv {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  const headerLine = lines[0];
  if (!headerLine) return { headers: [], rows: [] };
  const headers = splitLine(headerLine);
  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? "";
    });
    return row;
  });
  return { headers, rows };
}

/** Parse a date value in the mapping's declared format into a CalendarDate. */
export function parseImportDate(value: string, format: string): CalendarDate {
  const v = value.trim();
  if (format === "YYYY-MM-DD") return calendarDate(v);
  const parts = v.split(/[/\-.]/);
  const [a, b, c] = parts;
  if (!a || !b || !c) throw new Error(`Cannot parse date "${value}" as ${format}`);
  const pad = (s: string) => s.padStart(2, "0");
  if (format === "MM/DD/YYYY") return calendarDate(`${c}-${pad(a)}-${pad(b)}`);
  if (format === "DD/MM/YYYY") return calendarDate(`${c}-${pad(b)}-${pad(a)}`);
  throw new Error(`Unsupported date format: ${format}`);
}
