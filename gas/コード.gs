function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getAppConfig() {
  return {
    appName: APP_NAME,
    timezone: TIMEZONE,
    statusWaiting: STATUS_WAITING,
    statusCompleted: STATUS_COMPLETED,
    autoSaveDelayMs: AUTO_SAVE_DELAY_MS,
    maxEntryFieldLength: MAX_ENTRY_FIELD_LENGTH,
    maxMemoLength: MAX_MEMO_LENGTH,
    maxImagesPerTrade: MAX_IMAGES_PER_TRADE,
    allowedMimeTypes: ALLOWED_MIME_TYPES
  };
}

function setupTradeSheet() {
  return withDocumentLock_(function() {
    var sheet = getTradesSheet_();
    ensureHeader(sheet);
    setTextFormats(sheet);
    return {
      ok: true,
      sheetName: sheet.getName(),
      headers: TRADE_HEADERS
    };
  });
}
