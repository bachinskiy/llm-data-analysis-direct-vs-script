function parseDamage(value) {
  if (typeof value !== "string") {
    return null;
  }

  if (!/^(?:[0-9]+|[1-9][0-9]{0,2}(?:,[0-9]{3})+)$/.test(value)) {
    return null;
  }

  var number = 0;
  for (var i = 0; i < value.length; i += 1) {
    var code = value.charCodeAt(i);
    if (code !== 44) {
      number = number * 10 + code - 48;
    }
  }
  return number;
}

function parseNonnegativeInteger(value) {
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) {
    return null;
  }

  var number = 0;
  for (var i = 0; i < value.length; i += 1) {
    number = number * 10 + value.charCodeAt(i) - 48;
  }
  return number;
}

function classifySeverity(damage, injured, hazmat) {
  if (damage === null || injured === null || hazmat === null) {
    return "unknown";
  }
  if (injured > 0 || hazmat > 0 || damage >= 1000000) {
    return "critical";
  }
  if (damage >= 100000) {
    return "high";
  }
  if (damage >= 10000) {
    return "medium";
  }
  return "low";
}

function transform(rows) {
  var records = [];
  var summary = {
    total_records: 0,
    severity_counts: {
      unknown: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    }
  };

  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    var damage = parseDamage(row.damage_text);
    var injured = parseNonnegativeInteger(row.injured_text);
    var hazmat = parseNonnegativeInteger(row.hazmat_released_text);
    var severity = classifySeverity(damage, injured, hazmat);

    records.push({
      raw_id: row.raw_id,
      report_year: row.report_year,
      track_type: row.track_type,
      severity_class: severity,
      valid_damage_usd: damage,
      valid_injured: injured,
      valid_hazmat: hazmat
    });

    summary.severity_counts[severity] += 1;
  }

  summary.total_records = records.length;
  return { records: records, summary: summary };
}

module.exports = { transform };