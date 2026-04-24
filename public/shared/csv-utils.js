(function() {
  'use strict';

  function parseCsvLine(line) {
    var values = [];
    var current = '';
    var inQuotes = false;

    for (var i = 0; i < line.length; i++) {
      var char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  function parseCsvContent(csvContent) {
    var lines = String(csvContent || '').split('\n');
    if (lines.length < 2) return { headers: [], rows: [] };

    var headers = lines[0].split(',').map(function(header) {
      return header.trim().toLowerCase().replace(/"/g, '');
    });
    var rows = [];

    for (var i = 1; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      rows.push(parseCsvLine(line));
    }

    return { headers: headers, rows: rows };
  }

  window.CsvUtils = {
    parseCsvLine: parseCsvLine,
    parseCsvContent: parseCsvContent
  };
})();