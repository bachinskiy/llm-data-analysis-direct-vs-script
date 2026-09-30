function parseDamage(value) {
  if (typeof value !== 'string' || !/^[0-9,]+$/.test(value)) return null;
  return +value.replace(/,/g, '');
}

function parseInteger(value) {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) return null;
  return +value;
}

function classify(damage, injured, hazmat) {
  if (damage === null || injured === null || hazmat === null) return 'unknown';
  if (injured > 0 || hazmat > 0 || damage >= 1000000) return 'critical';
  if (damage >= 100000) return 'high';
  if (damage >= 10000) return 'medium';
  return 'low';
}

function transform(rows) {
  var records = [];
  var summary = [];

  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    var damage = parseDamage(row.damage_text);
    var injured = parseInteger(row.injured_text);
    var hazmat = parseInteger(row.hazmat_released_text);
    var severity = classify(damage, injured, hazmat);
    var record = {
      raw_id: row.raw_id,
      report_year: row.report_year,
      track_type: row.track_type,
      severity_class: severity,
      valid_damage_usd: damage,
      valid_injured: injured,
      valid_hazmat: hazmat
    };

    records.push(record);

    var group = null;
    for (var j = 0; j < summary.length; j += 1) {
      if (
        summary[j].report_year === record.report_year &&
        summary[j].track_type === record.track_type &&
        summary[j].severity_class === record.severity_class
      ) {
        group = summary[j];
        break;
      }
    }

    if (group === null) {
      group = {
        report_year: record.report_year,
        track_type: record.track_type,
        severity_class: record.severity_class,
        row_count: 0,
        valid_damage_usd_sum: 0,
        valid_injured_sum: 0,
        valid_hazmat_sum: 0
      };
      summary.push(group);
    }

    group.row_count += 1;
    group.valid_damage_usd_sum += damage === null ? 0 : damage;
    group.valid_injured_sum += injured === null ? 0 : injured;
    group.valid_hazmat_sum += hazmat === null ? 0 : hazmat;
  }

  return { records: records, summary: summary };
}

module.exports = { transform };
