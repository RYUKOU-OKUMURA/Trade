function getTradesSheet_() {
  requireConfigured_(SPREADSHEET_ID, 'SPREADSHEET_ID');
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(TRADES_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(TRADES_SHEET_NAME);
  }
  ensureHeader(sheet);
  setTextFormats(sheet);
  return sheet;
}

function ensureHeader(sheet) {
  var lastColumn = Math.max(sheet.getLastColumn(), TRADE_HEADERS.length);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, TRADE_HEADERS.length).setValues([TRADE_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }

  var currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var hasAnyHeader = currentHeaders.some(function(header) {
    return String(header || '').trim() !== '';
  });
  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, TRADE_HEADERS.length).setValues([TRADE_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }

  var changed = false;
  TRADE_HEADERS.forEach(function(header) {
    if (currentHeaders.indexOf(header) === -1) {
      currentHeaders.push(header);
      changed = true;
    }
  });

  if (changed) {
    sheet.getRange(1, 1, 1, currentHeaders.length).setValues([currentHeaders]);
  }
  sheet.setFrozenRows(1);
}

function getHeaderMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  headers.forEach(function(header, index) {
    if (header) {
      map[String(header)] = index + 1;
    }
  });
  return map;
}

function setTextFormats(sheet) {
  var map = getHeaderMap_(sheet);
  var maxRows = Math.max(sheet.getMaxRows() - 1, 1);
  TEXT_COLUMNS.forEach(function(header) {
    if (map[header]) {
      sheet.getRange(2, map[header], maxRows, 1).setNumberFormat('@');
    }
  });
  DATETIME_COLUMNS.forEach(function(header) {
    if (map[header]) {
      sheet.getRange(2, map[header], maxRows, 1).setNumberFormat('yyyy/mm/dd hh:mm:ss');
    }
  });
  if (map.duration_minutes) {
    sheet.getRange(2, map.duration_minutes, maxRows, 1).setNumberFormat('0');
  }
}

function appendTradeRow(trade) {
  var sheet = getTradesSheet_();
  var map = getHeaderMap_(sheet);
  var rowIndex = sheet.getLastRow() + 1;
  var rowValues = buildRowValues_(map, trade, sheet.getLastColumn());
  setTradeRowTextFormats_(sheet, map, rowIndex);
  sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).setValues([rowValues]);
  return mapRowToTrade(sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0], map);
}

function updateTradeRow(rowIndex, updates) {
  var sheet = getTradesSheet_();
  var map = getHeaderMap_(sheet);
  Object.keys(updates).forEach(function(header) {
    if (!map[header]) {
      throw new Error('列が見つかりません: ' + header);
    }
    var cell = sheet.getRange(rowIndex, map[header]);
    if (TEXT_COLUMNS.indexOf(header) !== -1) {
      cell.setNumberFormat('@');
    }
    cell.setValue(updates[header]);
  });
  return mapRowToTrade(sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0], map);
}

function findRowByTradeId(tradeId) {
  var sheet = getTradesSheet_();
  var map = getHeaderMap_(sheet);
  if (!map.trade_id || sheet.getLastRow() < 2) {
    return null;
  }

  var values = sheet.getRange(2, map.trade_id, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === tradeId) {
      var rowIndex = i + 2;
      var row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
      return {
        rowIndex: rowIndex,
        trade: mapRowToTrade(row, map)
      };
    }
  }
  return null;
}

function getAllTrades() {
  var sheet = getTradesSheet_();
  var map = getHeaderMap_(sheet);
  if (sheet.getLastRow() < 2) {
    return [];
  }

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return values.map(function(row) {
    return mapRowToTrade(row, map);
  }).filter(function(trade) {
    return trade.trade_id;
  });
}

function mapRowToTrade(row, map) {
  function get(header) {
    var column = map[header];
    return column ? row[column - 1] : '';
  }

  function asText(header) {
    var value = get(header);
    return value == null ? '' : String(value);
  }

  function dateInfo(header) {
    var value = get(header);
    if (!value) {
      return {
        value: '',
        timestamp: 0,
        text: ''
      };
    }
    var date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) {
      return {
        value: String(value),
        timestamp: 0,
        text: String(value)
      };
    }
    return {
      value: formatDate(date),
      timestamp: date.getTime(),
      text: formatDate(date)
    };
  }

  var entryDate = dateInfo('entry_saved_at');
  var resultDate = dateInfo('result_saved_at');
  var updatedDate = dateInfo('updated_at');

  return {
    trade_id: asText('trade_id'),
    tradeId: asText('trade_id'),
    status: asText('status'),
    entry_saved_at: entryDate.value,
    entry_saved_at_timestamp: entryDate.timestamp,
    entry_saved_at_text: entryDate.text,
    result_saved_at: resultDate.value,
    result_saved_at_timestamp: resultDate.timestamp,
    result_saved_at_text: resultDate.text,
    duration_minutes: get('duration_minutes') === '' ? '' : Number(get('duration_minutes')),
    entry_image_url: asText('entry_image_url'),
    result_image_url: asText('result_image_url'),
    memo: asText('memo'),
    limit_value: asText('limit_value'),
    stop_value: asText('stop_value'),
    expected_reach_time: asText('expected_reach_time'),
    created_date: asText('created_date'),
    day_of_week: asText('day_of_week'),
    entry_image_file_id: asText('entry_image_file_id'),
    result_image_file_id: asText('result_image_file_id'),
    entry_image_filename: asText('entry_image_filename'),
    result_image_filename: asText('result_image_filename'),
    updated_at: updatedDate.value,
    updated_at_timestamp: updatedDate.timestamp,
    updated_at_text: updatedDate.text,
    has_memo: asText('memo').length > 0,
    image_count: asText('result_image_file_id') ? 2 : 1
  };
}

function buildRowValues_(map, trade, columnCount) {
  var values = [];
  for (var i = 1; i <= columnCount; i++) {
    values.push('');
  }
  Object.keys(trade).forEach(function(header) {
    if (map[header]) {
      values[map[header] - 1] = trade[header];
    }
  });
  return values;
}

function setTradeRowTextFormats_(sheet, map, rowIndex) {
  TEXT_COLUMNS.forEach(function(header) {
    if (map[header]) {
      sheet.getRange(rowIndex, map[header]).setNumberFormat('@');
    }
  });
}
