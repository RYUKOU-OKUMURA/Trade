function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .addMetaTag('mobile-web-app-capable', 'yes')
    .addMetaTag('apple-mobile-web-app-capable', 'yes')
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
    shareImageFilesForPreview: SHARE_IMAGE_FILES_FOR_PREVIEW,
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
      timezone: sheet.getParent().getSpreadsheetTimeZone(),
      headers: TRADE_HEADERS
    };
  });
}
