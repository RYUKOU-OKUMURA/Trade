function getTradesSheet_() {
  requireConfigured_(SPREADSHEET_ID, 'SPREADSHEET_ID');
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  ensureSpreadsheetSettings_(spreadsheet);
  var sheet = spreadsheet.getSheetByName(TRADES_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(TRADES_SHEET_NAME);
  }
  ensureHeader(sheet);
  setTextFormats(sheet);
  return sheet;
}

function ensureSpreadsheetSettings_(spreadsheet) {
  if (spreadsheet.getSpreadsheetTimeZone() !== TIMEZONE) {
    spreadsheet.setSpreadsheetTimeZone(TIMEZONE);
  }
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
  ['entry_image_count', 'result_image_count'].forEach(function(header) {
    if (map[header]) {
      sheet.getRange(2, map[header], maxRows, 1).setNumberFormat('0');
    }
  });
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
    if (isImagePreviewColumn_(header) && updates[header]) {
      cell.setFormula(updates[header]);
    } else {
      cell.setValue(updates[header]);
    }
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
  var entryImageUrls = parseListColumn_(asText('entry_image_urls'), asText('entry_image_url'));
  var resultImageUrls = parseListColumn_(asText('result_image_urls'), asText('result_image_url'));
  var entryImageFileIds = parseListColumn_(asText('entry_image_file_ids'), asText('entry_image_file_id'));
  var resultImageFileIds = parseListColumn_(asText('result_image_file_ids'), asText('result_image_file_id'));
  var entryImageFilenames = parseListColumn_(asText('entry_image_filenames'), asText('entry_image_filename'));
  var resultImageFilenames = parseListColumn_(asText('result_image_filenames'), asText('result_image_filename'));
  var entryImageCount = getImageCountFromColumns_(get('entry_image_count'), entryImageUrls, entryImageFileIds);
  var resultImageCount = getImageCountFromColumns_(get('result_image_count'), resultImageUrls, resultImageFileIds);

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
    entry_image_url: entryImageUrls[0] || asText('entry_image_url'),
    result_image_url: resultImageUrls[0] || asText('result_image_url'),
    entry_image_urls: entryImageUrls,
    result_image_urls: resultImageUrls,
    memo: asText('memo'),
    limit_value: asText('limit_value'),
    stop_value: asText('stop_value'),
    expected_reach_time: asText('expected_reach_time'),
    created_date: asText('created_date'),
    day_of_week: asText('day_of_week'),
    entry_image_file_id: entryImageFileIds[0] || asText('entry_image_file_id'),
    result_image_file_id: resultImageFileIds[0] || asText('result_image_file_id'),
    entry_image_file_ids: entryImageFileIds,
    result_image_file_ids: resultImageFileIds,
    entry_image_filename: entryImageFilenames[0] || asText('entry_image_filename'),
    result_image_filename: resultImageFilenames[0] || asText('result_image_filename'),
    entry_image_filenames: entryImageFilenames,
    result_image_filenames: resultImageFilenames,
    entry_image_count: entryImageCount,
    result_image_count: resultImageCount,
    updated_at: updatedDate.value,
    updated_at_timestamp: updatedDate.timestamp,
    updated_at_text: updatedDate.text,
    has_memo: asText('memo').length > 0,
    image_count: entryImageCount + resultImageCount
  };
}

function parseListColumn_(serialized, fallback) {
  var textValue = String(serialized || '').trim();
  if (!textValue) {
    return fallback ? [String(fallback)] : [];
  }
  try {
    var parsed = JSON.parse(textValue);
    if (Array.isArray(parsed)) {
      return parsed.filter(function(value) {
        return value !== null && typeof value !== 'undefined' && String(value) !== '';
      }).map(function(value) {
        return String(value);
      });
    }
  } catch (e) {
    // 旧データや手入力があっても、表示側では1件として扱えるようにする。
  }
  return [textValue];
}

function getImageCountFromColumns_(countValue, urls, fileIds) {
  var count = Number(countValue);
  if (Number.isFinite(count) && count > 0) {
    return count;
  }
  return Math.max((urls || []).length, (fileIds || []).length);
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

function isImagePreviewColumn_(header) {
  return header === 'entry_image_preview' || header === 'result_image_preview';
}
