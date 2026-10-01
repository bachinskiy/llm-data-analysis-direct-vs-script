function parseDamage(value) {
  if (typeof value !== "string") return null;
  if (!/^(?:\d+|[1-9]\d{0,2}(?:,\d{3})+)$/.test(value)) return null;
  return +value.replace(/,/g, "");
}

function parseNonnegativeDigits(value) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  return +value;
}

function transform(rows) {
  var records = [];
  var severityCounts = {
    unknown: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  };

  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    var damage = parseDamage(row.damage_text);
    var injured = parseNonnegativeDigits(row.injured_text);
    var hazmat = parseNonnegativeDigits(row.hazmat_released_text);
    var severity;

    if (damage === null || injured === null || hazmat === null) {
      severity = "unknown";
    } else if (injured > 0 || hazmat > 0 || damage >= 1000000) {
      severity = "critical";
    } else if (damage >= 100000) {
      severity = "high";
    } else if (damage >= 10000) {
      severity = "medium";
    } else {
      severity = "low";
    }

    severityCounts[severity] += 1;
    records.push({
      raw_id: row.raw_id,
      report_year: row.report_year,
      track_type: row.track_type,
      severity_class: severity,
      valid_damage_usd: damage,
      valid_injured: injured,
      valid_hazmat: hazmat
    });
  }

  return {
    records: records,
    summary: {
      total_records: records.length,
      severity_counts: severityCounts
    }
  };
}

module.exports = { transform };