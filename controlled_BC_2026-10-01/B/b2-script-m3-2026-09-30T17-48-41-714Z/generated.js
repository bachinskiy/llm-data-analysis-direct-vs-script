function parseDamage(value) {
  if (typeof value !== 'string') return null;
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(value)) return null;
  return Number(value.replace(/,/g, ''));
}

function parseCount(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  return Number(value);
}

function severity(damage, injured, hazmat) {
  if (damage === null || injured === null || hazmat === null) return 'unknown';
  if (injured > 0 || hazmat > 0 || damage >= 1000000) return 'critical';
  if (damage >= 100000) return 'high';
  if (damage >= 10000) return 'medium';
  return 'low';
}

function transform(rows) {
  var records = rows.map(function (row) {
    var damage = parseDamage(row.damage_text);
    var injured = parseCount(row.injured_text);
    var hazmat = parseCount(row.hazmat_released_text);
    return {
      raw_id: row.raw_id,
      report_year: row.report_year,
      track_type: row.track_type,
      severity_class: severity(damage, injured, hazmat),
      valid_damage_usd: damage,
      valid_injured: injured,
      valid_hazmat: hazmat
    };
  });

  var summary = {
    total_records: records.length,
    severity_counts: { low: 0, medium: 0, high: 0, critical: 0, unknown: 0 }
  };
  records.forEach(function (record) {
    summary.severity_counts[record.severity_class] += 1;
  });

  return { records: records, summary: summary };
}

module.exports = { transform };