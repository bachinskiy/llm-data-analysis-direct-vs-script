function transform(rows) {
  const groups = new Map();
  const records = rows.map((row) => {
    const damage = typeof row.damage_text === 'string' && /^[0-9,]+$/.test(row.damage_text)
      ? Number(row.damage_text.replace(/,/g, ''))
      : null;
    const injured = typeof row.injured_text === 'string' && /^[0-9]+$/.test(row.injured_text)
      ? Number(row.injured_text)
      : null;
    const hazmat = typeof row.hazmat_released_text === 'string' && /^[0-9]+$/.test(row.hazmat_released_text)
      ? Number(row.hazmat_released_text)
      : null;

    let severity_class;
    if (damage === null || injured === null || hazmat === null) {
      severity_class = 'unknown';
    } else if (injured > 0 || hazmat > 0 || damage >= 1000000) {
      severity_class = 'critical';
    } else if (damage >= 100000) {
      severity_class = 'high';
    } else if (damage >= 10000) {
      severity_class = 'medium';
    } else {
      severity_class = 'low';
    }

    const record = {
      raw_id: row.raw_id,
      report_year: row.report_year,
      track_type: row.track_type,
      severity_class,
      valid_damage_usd: damage,
      valid_injured: injured,
      valid_hazmat: hazmat
    };

    let byYear = groups.get(record.report_year);
    if (!byYear) {
      byYear = new Map();
      groups.set(record.report_year, byYear);
    }
    let byTrack = byYear.get(record.track_type);
    if (!byTrack) {
      byTrack = new Map();
      byYear.set(record.track_type, byTrack);
    }
    let group = byTrack.get(record.severity_class);
    if (!group) {
      group = {
        report_year: record.report_year,
        track_type: record.track_type,
        severity_class: record.severity_class,
        row_count: 0,
        valid_damage_usd: 0,
        valid_injured: 0,
        valid_hazmat: 0
      };
      byTrack.set(record.severity_class, group);
    }
    group.row_count += 1;
    group.valid_damage_usd += damage === null ? 0 : damage;
    group.valid_injured += injured === null ? 0 : injured;
    group.valid_hazmat += hazmat === null ? 0 : hazmat;

    return record;
  });

  const summary = [];
  for (const byYear of groups.values()) {
    for (const byTrack of byYear.values()) {
      for (const group of byTrack.values()) {
        summary.push(group);
      }
    }
  }

  return { records, summary };
}

module.exports = { transform };