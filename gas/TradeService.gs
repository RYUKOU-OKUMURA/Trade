function createEntryTrade(payload) {
  return withDocumentLock_(function() {
    var savedAt = now_();
    var tradeId = generateTradeId(savedAt);
    var image = saveEntryImage(tradeId, payload, savedAt);

    try {
      var trade = {
        trade_id: tradeId,
        status: STATUS_WAITING,
        entry_saved_at: savedAt,
        result_saved_at: '',
        duration_minutes: '',
        entry_image_url: image.url,
        result_image_url: '',
        memo: '',
        limit_value: '',
        stop_value: '',
        expected_reach_time: '',
        created_date: formatDate(savedAt, 'yyyy/MM/dd'),
        day_of_week: getDayOfWeek(savedAt),
        entry_image_file_id: image.fileId,
        result_image_file_id: '',
        entry_image_filename: image.fileName,
        result_image_filename: '',
        updated_at: savedAt
      };
      return appendTradeRow(trade);
    } catch (e) {
      trashDriveFileQuietly_(image.fileId);
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
    var image = saveResultImage(tradeId, payload, savedAt);
    try {
      return updateTradeRow(found.rowIndex, {
        status: STATUS_COMPLETED,
        result_saved_at: savedAt,
        duration_minutes: calculateDurationMinutes(found.trade.entry_saved_at, savedAt),
        result_image_url: image.url,
        result_image_file_id: image.fileId,
        result_image_filename: image.fileName,
        updated_at: savedAt
      });
    } catch (e) {
      trashDriveFileQuietly_(image.fileId);
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
