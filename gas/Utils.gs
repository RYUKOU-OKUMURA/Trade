function requireConfigured_(value, name) {
  if (!value || String(value).indexOf('PASTE_') === 0) {
    throw new Error(name + 'が未設定です。Config.gsでIDを設定してください。');
  }
}

function now_() {
  return new Date();
}

function generateTradeId(date) {
  var targetDate = date || now_();
  var timestamp = Utilities.formatDate(targetDate, TIMEZONE, 'yyyyMMdd_HHmmss');
  var random = Utilities.getUuid().split('-')[0].slice(0, 4);
  return 'trd_' + timestamp + '_' + random;
}

function formatDate(date, pattern) {
  if (!date) {
    return '';
  }
  return Utilities.formatDate(new Date(date), TIMEZONE, pattern || 'yyyy/MM/dd HH:mm:ss');
}

function getDayOfWeek(date) {
  var weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  var parts = Utilities.formatDate(new Date(date), TIMEZONE, 'yyyy/MM/dd').split('/');
  var utcDate = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
  return weekdays[utcDate.getUTCDay()] || '';
}

function calculateDurationMinutes(startDate, endDate) {
  if (!startDate || !endDate) {
    return '';
  }
  var diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.max(0, Math.round(diffMs / 60000));
}

function sanitizeFileName(fileName) {
  var rawName = String(fileName || 'image').trim();
  var sanitized = rawName.replace(/[\\/:*?"<>|#%{}~&]/g, '_').replace(/\s+/g, '_');
  return sanitized.slice(0, 80) || 'image';
}

function getExtensionFromMimeType(mimeType) {
  if (mimeType === 'image/png') {
    return 'png';
  }
  if (mimeType === 'image/webp') {
    return 'webp';
  }
  return 'jpg';
}

function getMimeTypeFromFileName(fileName) {
  var name = String(fileName || '').toLowerCase();
  if (/\.(png)$/.test(name)) {
    return 'image/png';
  }
  if (/\.(webp)$/.test(name)) {
    return 'image/webp';
  }
  if (/\.(jpe?g)$/.test(name)) {
    return 'image/jpeg';
  }
  return '';
}

function sanitizeEntryField(value, fieldName) {
  var text = value == null ? '' : String(value).trim();
  if (text.length > MAX_ENTRY_FIELD_LENGTH) {
    throw new Error(fieldName + 'は' + MAX_ENTRY_FIELD_LENGTH + '文字以内で入力してください。');
  }
  if (!ENTRY_FIELD_ALLOWED_PATTERN.test(text)) {
    throw new Error(fieldName + 'は英数字、., :, -, _, /, +, 半角スペースのみで入力してください。');
  }
  return text;
}

function sanitizeMemo(value) {
  var text = value == null ? '' : String(value);
  if (text.length > MAX_MEMO_LENGTH) {
    throw new Error('メモは' + MAX_MEMO_LENGTH + '文字以内で入力してください。');
  }
  return text;
}

function validateEntryFields(payload) {
  payload = payload || {};
  return {
    limit_value: sanitizeEntryField(payload.limitValue != null ? payload.limitValue : payload.limit_value, '指し値'),
    stop_value: sanitizeEntryField(payload.stopValue != null ? payload.stopValue : payload.stop_value, '逆指し値'),
    expected_reach_time: sanitizeEntryField(
      payload.expectedReachTime != null ? payload.expectedReachTime : payload.expected_reach_time,
      '到達予想時間'
    ),
    memo: sanitizeMemo(payload.memo)
  };
}

function validateTradeId(tradeId) {
  var text = String(tradeId || '').trim();
  if (!/^trd_\d{8}_\d{6}_[A-Za-z0-9]{4}$/.test(text)) {
    throw new Error('trade_idが不正です。');
  }
  return text;
}

function validateImagePayload(payload) {
  payload = payload || {};
  if (!payload.imageBase64) {
    throw new Error('画像を選択してください。');
  }

  var base64 = String(payload.imageBase64);
  var mimeType = String(payload.mimeType || '').toLowerCase();
  var dataUrlMatch = base64.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    mimeType = String(dataUrlMatch[1]).toLowerCase();
    base64 = dataUrlMatch[2];
  }
  if (!mimeType) {
    mimeType = getMimeTypeFromFileName(payload.fileName);
  }
  if (ALLOWED_MIME_TYPES.indexOf(mimeType) === -1) {
    throw new Error('この画像形式は対応していません。iPhoneスクリーンショットはPNGまたはJPEG形式で選択してください。');
  }
  if (base64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 128) {
    throw new Error('画像サイズが大きすぎます。1枚あたり' + Math.round(MAX_IMAGE_BYTES / 1024 / 1024) + 'MB以内にしてください。');
  }

  return {
    base64: base64,
    mimeType: mimeType,
    fileName: sanitizeFileName(payload.fileName)
  };
}

function validateImagePayloads(payload) {
  payload = payload || {};
  var images = Array.isArray(payload.images) ? payload.images : null;
  if (!images) {
    images = payload.imageBase64 ? [payload] : [];
  }
  if (!images.length) {
    throw new Error('画像を選択してください。');
  }
  if (images.length > MAX_IMAGES_PER_TRADE) {
    throw new Error('画像は1回につき' + MAX_IMAGES_PER_TRADE + '枚まで選択できます。');
  }
  return images.map(function(imagePayload) {
    return validateImagePayload(imagePayload);
  });
}

function serializeList_(values) {
  return JSON.stringify((values || []).filter(function(value) {
    return value !== null && typeof value !== 'undefined' && String(value) !== '';
  }).map(function(value) {
    return String(value);
  }));
}

function withDocumentLock_(callback) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) {
    throw new Error('他の保存処理が続いています。少し待ってからもう一度お試しください。');
  }
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function sortTradesNewestFirst_(trades) {
  return trades.sort(function(a, b) {
    return (b.entry_saved_at_timestamp || 0) - (a.entry_saved_at_timestamp || 0);
  });
}

function getCacheJson_(key) {
  try {
    var cached = CacheService.getScriptCache().get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    return null;
  }
}

function putCacheJson_(key, value, ttlSeconds) {
  try {
    CacheService.getScriptCache().put(key, JSON.stringify(value), ttlSeconds || CACHE_TTL_SECONDS);
  } catch (e) {
    // キャッシュ容量超過時も通常処理を優先する。
  }
}

function getOrSetCacheJson_(key, builder, ttlSeconds) {
  var cached = getCacheJson_(key);
  if (cached !== null) {
    return cached;
  }
  var value = builder();
  putCacheJson_(key, value, ttlSeconds);
  return value;
}

function invalidateTradeCaches_() {
  try {
    CacheService.getScriptCache().removeAll([
      'trade_waiting_v2',
      'trade_history_v2'
    ]);
  } catch (e) {
    // キャッシュ削除に失敗しても保存結果を優先する。
  }
}
