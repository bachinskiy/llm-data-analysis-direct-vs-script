function parseDamage(value) {
  if (typeof value !== 'string' || !/^[0-9,]+$/.test(value)) return null;
  return Number(value.replace(/,/g, ''));
}

function parseInteger(value) {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) return null;
  return Number(value);
}

function transform(rows) {
  const records = [];
  const groups = new Map();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const valid_damage_usd = parseDamage(row.damage_text);
    const valid_injured = parseInteger(row.injured_text);
    const valid_hazmat = parseInteger(row.hazmat_released_text);
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

    const record = {
      raw_id: row.raw_id,
      report_year: row.report_year,
      track_type: row.track_type,
      severity_class,
      valid_damage_usd,
      valid_injured,
      valid_hazmat
    };
    records.push(record);

    let yearGroups = groups.get(record.report_year);
    if (yearGroups === undefined) {
      yearGroups = new Map();
      groups.set(record.report_year, yearGroups);
    }
    let trackGroups = yearGroups.get(record.track_type);
    if (trackGroups === undefined) {
      trackGroups = new Map();
      yearGroups.set(record.track_type, trackGroups);
    }
    let group = trackGroups.get(record.severity_class);
    if (group === undefined) {
      group = {
        report_year: record.report_year,
        track_type: record.track_type,
        severity_class: record.severity_class,
        row_count: 0,
        total_damage_usd: 0,
        total_injured: 0,
        total_hazmat: 0
      };
      trackGroups.set(record.severity_class, group);
    }
    group.row_count += 1;
    group.total_damage_usd += record.valid_damage_usd === null ? 0 : record.valid_damage_usd;
    group.total_injured += record.valid_injured === null ? 0 : record.valid_injured;
    group.total_hazmat += record.valid_hazmat === null ? 0 : record.valid_hazmat;
  }

  const summary = [];
  for (const yearGroups of groups.values()) {
    for (const trackGroups of yearGroups.values()) {
      for (const group of trackGroups.values()) {
        summary.push(group);
      }
    }
  }

  return { records, summary };
}

module.exports = { transform };
