import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

export function csvToObjects(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((cells) => {
    const object = {};
    headers.forEach((header, index) => {
      object[header] = cells[index] ?? '';
    });
    return object;
  });
}

export function stringifyCsvCell(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function objectsToCsv(rows, headers) {
  const lines = [headers.map(stringifyCsvCell).join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((header) => stringifyCsvCell(row[header])).join(','));
  });
  return `${lines.join('\n')}\n`;
}

export async function readCsvObjects(filePath) {
  try {
    const text = await readFile(filePath, 'utf8');
    return csvToObjects(text);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function writeCsvObjects(filePath, rows, headers) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, objectsToCsv(rows, headers), 'utf8');
}
