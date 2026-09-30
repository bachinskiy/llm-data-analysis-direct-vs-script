function transform(rows) {
  var records = [];
  var summary = [];
  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    var valid_damage_usd = typeof row.damage_text === "string" && /^[0-9,]+$/.test(row.damage_text) ? +row.damage_text.replace(/,/g, "") : null;
    var valid_injured = typeof row.injured_text === "string" && /^[0-9]+$/.test(row.injured_text) ? +row.injured_text : null;
    var valid_hazmat = typeof row.hazmat_released_text === "string" && /^[0-9]+$/.test(row.hazmat_released_text) ? +row.hazmat_released_text : null;
    var severity_class;
    if (valid_damage_usd === null || valid_injured === null || valid_hazmat === null) severity_class = "unknown";
    else if (valid_injured > 0 || valid_hazmat > 0 || valid_damage_usd >= 1000000) severity_class = "critical";
    else if (valid_damage_usd >= 100000) severity_class = "high";
    else if (valid_damage_usd >= 10000) severity_class = "medium";
    else severity_class = "low";
    var record = { raw_id: row.raw_id, report_year: row.report_year, track_type: row.track_type, severity_class: severity_class, valid_damage_usd: valid_damage_usd, valid_injured: valid_injured, valid_hazmat: valid_hazmat };
    records.push(record);
    var group = null;
    for (var j = 0; j < summary.length; j += 1) {
      if (summary[j].report_year === record.report_year && summary[j].track_type === record.track_type && summary[j].severity_class === record.severity_class) { group = summary[j]; break; }
    }
    if (group === null) { group = { report_year: record.report_year, track_type: record.track_type, severity_class: record.severity_class, row_count: 0, valid_damage_usd_sum: 0, valid_injured_sum: 0, valid_hazmat_sum: 0 }; summary.push(group); }
    group.row_count += 1;
    group.valid_damage_usd_sum += record.valid_damage_usd === null ? 0 : record.valid_damage_usd;
    group.valid_injured_sum += record.valid_injured === null ? 0 : record.valid_injured;
    group.valid_hazmat_sum += record.valid_hazmat === null ? 0 : record.valid_hazmat;
  }
  return { records: records, summary: summary };
}
module.exports = { transform };
