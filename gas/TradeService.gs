function createEntryTrade(payload) {
  return withDocumentLock_(function() {
    var savedAt = now_();
    var tradeId = generateTradeId(savedAt);
    var images = saveEntryImages(tradeId, payload, savedAt);

    try {
      var entryImageColumns = buildImageColumns_('entry', images);
      var trade = {
        trade_id: tradeId,
        status: STATUS_WAITING,
        entry_saved_at: savedAt,
        result_saved_at: '',
        duration_minutes: '',
        entry_image_url: entryImageColumns.entry_image_url,
        result_image_url: '',
        entry_image_preview: entryImageColumns.entry_image_preview,
        result_image_preview: '',
        entry_image_urls: entryImageColumns.entry_image_urls,
        result_image_urls: '',
        memo: '',
        limit_value: '',
        stop_value: '',
        expected_reach_time: '',
        created_date: formatDate(savedAt, 'yyyy/MM/dd'),
        day_of_week: getDayOfWeek(savedAt),
        entry_image_file_id: entryImageColumns.entry_image_file_id,
        result_image_file_id: '',
        entry_image_file_ids: entryImageColumns.entry_image_file_ids,
        result_image_file_ids: '',
        entry_image_filename: entryImageColumns.entry_image_filename,
        result_image_filename: '',
        entry_image_filenames: entryImageColumns.entry_image_filenames,
        result_image_filenames: '',
        entry_image_count: entryImageColumns.entry_image_count,
        result_image_count: 0,
        updated_at: savedAt
      };
      return appendTradeRow(trade);
    } catch (e) {
      trashDriveFilesQuietly_(images);
      throw e;
    }
  });
}

function updateEntryFields(payload) {
  return withDocumentLock_(function() {
    payload = payload || {};
    var tradeId = validateTradeId(payload.tradeId || payload.trade_id);
    var fields = validateEntryFields(payload);
    var found = findRowByTradeId(tradeId);
    if (!found) {
      throw new Error('対象の記録が見つかりません。');
    }

    return updateTradeRow(found.rowIndex, {
      limit_value: fields.limit_value,
      stop_value: fields.stop_value,
      expected_reach_time: fields.expected_reach_time,
      memo: fields.memo,
      updated_at: now_()
    });
  });
}

function updateMemo(tradeId, memo) {
  var found = findRowByTradeId(validateTradeId(tradeId));
  if (!found) {
    throw new Error('対象の記録が見つかりません。');
  }
  return updateEntryFields({
    tradeId: tradeId,
    limitValue: found.trade.limit_value,
    stopValue: found.trade.stop_value,
    expectedReachTime: found.trade.expected_reach_time,
    memo: memo
  });
}

function completeTrade(payload) {
  return withDocumentLock_(function() {
    payload = payload || {};
    var tradeId = validateTradeId(payload.tradeId || payload.trade_id);
    var found = findRowByTradeId(tradeId);
    if (!found) {
      throw new Error('対象の記録が見つかりません。');
    }
    if (found.trade.status === STATUS_COMPLETED) {
      throw new Error('この記録はすでに完了しています。');
    }
    if (found.trade.status !== STATUS_WAITING) {
      throw new Error('結果待ちではない記録です。');
    }

    var savedAt = now_();
    var images = saveResultImages(tradeId, payload, savedAt);
    try {
      var resultImageColumns = buildImageColumns_('result', images);
      return updateTradeRow(found.rowIndex, {
        status: STATUS_COMPLETED,
        result_saved_at: savedAt,
        duration_minutes: calculateDurationMinutes(found.trade.entry_saved_at, savedAt),
        result_image_url: resultImageColumns.result_image_url,
        result_image_preview: resultImageColumns.result_image_preview,
        result_image_urls: resultImageColumns.result_image_urls,
        result_image_file_id: resultImageColumns.result_image_file_id,
        result_image_file_ids: resultImageColumns.result_image_file_ids,
        result_image_filename: resultImageColumns.result_image_filename,
        result_image_filenames: resultImageColumns.result_image_filenames,
        result_image_count: resultImageColumns.result_image_count,
        updated_at: savedAt
      });
    } catch (e) {
      trashDriveFilesQuietly_(images);
      throw e;
    }
  });
}

function getWaitingTrades() {
  var trades = getAllTrades().filter(function(trade) {
    return trade.status === STATUS_WAITING;
  });
  return sortTradesNewestFirst_(trades);
}

function getHistory() {
  var trades = sortTradesNewestFirst_(getAllTrades());
  return trades.slice(0, MAX_HISTORY_ITEMS);
}

function getTradeById(tradeId) {
  var found = findRowByTradeId(validateTradeId(tradeId));
  if (!found) {
    throw new Error('対象の記録が見つかりません。');
  }
  return found.trade;
}

function buildImageColumns_(kind, images) {
  images = images || [];
  var urls = images.map(function(image) {
    return image.url;
  });
  var fileIds = images.map(function(image) {
    return image.fileId;
  });
  var fileNames = images.map(function(image) {
    return image.fileName;
  });
  var columns = {};
  columns[kind + '_image_url'] = urls[0] || '';
  columns[kind + '_image_preview'] = urls[0] ? buildImagePreviewFormula_(urls[0]) : '';
  columns[kind + '_image_urls'] = serializeList_(urls);
  columns[kind + '_image_file_id'] = fileIds[0] || '';
  columns[kind + '_image_file_ids'] = serializeList_(fileIds);
  columns[kind + '_image_filename'] = fileNames[0] || '';
  columns[kind + '_image_filenames'] = serializeList_(fileNames);
  columns[kind + '_image_count'] = images.length;
  return columns;
}

function repairTradeImagePreviews() {
  return withDocumentLock_(function() {
    var sheet = getTradesSheet_();
    var map = getHeaderMap_(sheet);
    if (sheet.getLastRow() < 2) {
      return {
        ok: true,
        repaired: 0
      };
    }

    var repaired = 0;
    var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    values.forEach(function(row, index) {
      var rowIndex = index + 2;
      var trade = mapRowToTrade(row, map);
      if (!trade.trade_id) {
        return;
      }

      var updates = {};
      mergeImageRepairUpdates_(updates, 'entry', trade.entry_image_file_ids);
      mergeImageRepairUpdates_(updates, 'result', trade.result_image_file_ids);
      if (Object.keys(updates).length) {
        updateTradeRow(rowIndex, updates);
        repaired++;
      }
    });

    return {
      ok: true,
      repaired: repaired
    };
  });
}

function mergeImageRepairUpdates_(updates, kind, fileIds) {
  var images = (fileIds || []).map(function(fileId) {
    return getImageInfoFromFileId_(fileId);
  }).filter(function(image) {
    return image;
  });
  if (!images.length) {
    return;
  }
  var columns = buildImageColumns_(kind, images);
  Object.keys(columns).forEach(function(header) {
    updates[header] = columns[header];
  });
}
