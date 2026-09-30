function transform(rows) {
  const records = rows.map(function (row) {
    const damage = parseDamage(row.damage_text);
    const injured = parseCount(row.injured_text);
    const hazmat = parseCount(row.hazmat_released_text);
    const severityClass = classifySeverity(damage, injured, hazmat);

    return {
      raw_id: row.raw_id,
      report_year: row.report_year,
      track_type: row.track_type,
      severity_class: severityClass,
      valid_damage_usd: damage,
      valid_injured: injured,
      valid_hazmat: hazmat
    };
  });

  const summary = {
    total_records: records.length,
    severity_counts: {
      unknown: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }
  };

  records.forEach(function (record) {
    summary.severity_counts[record.severity_class] += 1;
  });

  return { records: records, summary: summary };
}

function parseDamage(value) {
  if (typeof value !== 'string' || !/^[0-9,]+$/.test(value)) {
    return null;
  }

  return Number.parseInt(value.replace(/,/g, ''), 10);
}

function parseCount(value) {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) {
    return null;
  }

  return Number.parseInt(value, 10);
}

function classifySeverity(damage, injured, hazmat) {
  if (damage === null || injured === null || hazmat === null) {
    return 'unknown';
  }

  if (injured > 0 || hazmat > 0 || damage >= 1000000) {
    return 'critical';
  }

  if (damage >= 100000) {
    return 'high';
  }

  if (damage >= 10000) {
    return 'medium';
  }

  return 'low';
}

module.exports = { transform };