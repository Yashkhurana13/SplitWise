const { parse } = require('csv-parse/sync');

// Basic Sanitization: removes commas, trims spaces, parses to float
const sanitizeAmount = (rawAmount) => {
  if (!rawAmount) return 0;
  const cleanStr = String(rawAmount).replace(/,/g, '').trim();
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100; // Round to 2 decimals
};

// Date Parsing: Handles "YYYY-MM-DD", "DD/MM/YYYY", and throws on weird ones for now
const parseDate = (rawDate) => {
  if (!rawDate) return new Date();
  
  // Detect DD/MM/YYYY
  if (rawDate.includes('/')) {
    const parts = rawDate.split('/');
    if (parts.length === 3) {
      // Assuming DD/MM/YYYY as per CSV (e.g. 15/03/2026)
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
    }
  }

  // Detect textual "Mar 14"
  if (/[a-zA-Z]/.test(rawDate)) {
    const currentYear = new Date().getFullYear();
    const d = new Date(`${rawDate} ${currentYear} 00:00:00Z`);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback to standard parse
  const d = new Date(rawDate);
  return isNaN(d.getTime()) ? new Date() : d;
};

const parseImportedCSV = (csvBuffer) => {
  const records = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((record) => {
    return {
      rawRow: JSON.stringify(record),
      date: parseDate(record.date),
      description: record.description?.trim() || '',
      paid_by: record.paid_by?.trim() || '',
      amount: sanitizeAmount(record.amount),
      currency: record.currency?.trim() || null,
      split_type: record.split_type?.trim().toUpperCase() || '',
      split_with: record.split_with ? record.split_with.split(';').map(s => s.trim()) : [],
      split_details: record.split_details?.trim() || '',
      notes: record.notes?.trim() || ''
    };
  });
};

module.exports = {
  parseImportedCSV,
  sanitizeAmount,
  parseDate
};
