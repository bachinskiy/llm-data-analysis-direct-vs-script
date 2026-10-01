function transform(rows) {
  const records = [];
  const severity_counts = {
    unknown: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  };

  function parseDamage(value) {
    if (typeof value !== 'string' || !/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(value)) {
      return null;
    }
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function parseCount(value) {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const valid_damage_usd = parseDamage(row.damage_text);
    const valid_injured = parseCount(row.injured_text);
    const valid_hazmat = parseCount(row.hazmat_released_text);
    let severity_class;

    if (valid_damage_usd === null || valid_injured === null || valid_hazmat === null) {
      severity_class = 'unknown';
    } else if (valid_injured > 0 || valid_hazmat > 0 || valid_damage_usd >= 1000000) {
      severity_class = 'critical';
    } else if (valid_damage_usd >= 100000) {
      severity_class = 'high';
    } else if (valid_damage_usd >= 10000) {
      severity_class = 'medium';
    } else {
      severity_class = 'low';
    }

    severity_counts[severity_class] += 1;
    records.push({
      raw_id: row.raw_id,
      report_year: row.report_year,
      track_type: row.track_type,
      severity_class,
      valid_damage_usd,
      valid_injured,
      valid_hazmat
    });
  }

  return {
    records,
    summary: {
      total_records: records.length,
      severity_counts
    }
  };
}

module.exports = { transform };
