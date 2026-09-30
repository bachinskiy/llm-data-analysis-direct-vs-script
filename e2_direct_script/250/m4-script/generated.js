function transform(rows) {
  const records = [];
  const summary = {
    total_records: 0,
    severity_counts: {
      unknown: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    }
  };

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];

    const validDamage = typeof row.damage_text === 'string' && /^[0-9,]+$/.test(row.damage_text)
      ? Number(row.damage_text.replace(/,/g, ''))
      : null;
    const validInjured = typeof row.injured_text === 'string' && /^[0-9]+$/.test(row.injured_text)
      ? Number(row.injured_text)
      : null;
    const validHazmat = typeof row.hazmat_released_text === 'string' && /^[0-9]+$/.test(row.hazmat_released_text)
      ? Number(row.hazmat_released_text)
      : null;

    let severityClass;
    if (validDamage === null || validInjured === null || validHazmat === null) {
      severityClass = 'unknown';
    } else if (validInjured > 0 || validHazmat > 0 || validDamage >= 1000000) {
      severityClass = 'critical';
    } else if (validDamage >= 100000) {
      severityClass = 'high';
    } else if (validDamage >= 10000) {
      severityClass = 'medium';
    } else {
      severityClass = 'low';
    }

    records.push({
      raw_id: row.raw_id,
      report_year: row.report_year,
      track_type: row.track_type,
      severity_class: severityClass,
      valid_damage_usd: validDamage,
      valid_injured: validInjured,
      valid_hazmat: validHazmat
    });

    summary.total_records += 1;
    summary.severity_counts[severityClass] += 1;
  }

  return { records: records, summary: summary };
}

module.exports = { transform };