function saveEntryImage(tradeId, payload, savedAt) {
  requireConfigured_(ENTRY_FOLDER_ID, 'ENTRY_FOLDER_ID');
  return createImageFile(ENTRY_FOLDER_ID, 'entry', tradeId, payload, savedAt);
}

function saveResultImage(tradeId, payload, savedAt) {
  requireConfigured_(RESULT_FOLDER_ID, 'RESULT_FOLDER_ID');
  return createImageFile(RESULT_FOLDER_ID, 'result', tradeId, payload, savedAt);
}

function createImageFile(folderId, kind, tradeId, payload, savedAt) {
  var image = validateImagePayload(payload);
  var extension = getExtensionFromMimeType(image.mimeType);
  var timestamp = Utilities.formatDate(savedAt || now_(), TIMEZONE, 'yyyyMMdd_HHmmss');
  var fileName = kind + '_' + timestamp + '_' + tradeId + '.' + extension;
  var bytes = Utilities.base64Decode(image.base64);
  var blob = Utilities.newBlob(bytes, image.mimeType, fileName);
  var folder = DriveApp.getFolderById(folderId);
  var file = folder.createFile(blob);

  return {
    fileId: file.getId(),
    url: getImageUrl(file),
    fileName: fileName,
    originalFileName: image.fileName,
    mimeType: image.mimeType
  };
}

function getImageUrl(file) {
  // Driveの通常URLは<img>で表示しづらいため、アプリ内表示向けのサムネイルURLを保存する。
  return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(file.getId()) + '&sz=w1200';
}

function trashDriveFileQuietly_(fileId) {
  if (!fileId) {
    return;
  }
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
  } catch (e) {
    // シート保存失敗時の後片付けなので、元のエラーを優先する。
  }
}
