function saveEntryImage(tradeId, payload, savedAt) {
  requireConfigured_(ENTRY_FOLDER_ID, 'ENTRY_FOLDER_ID');
  return createImageFile(ENTRY_FOLDER_ID, 'entry', tradeId, payload, savedAt);
}

function saveResultImage(tradeId, payload, savedAt) {
  requireConfigured_(RESULT_FOLDER_ID, 'RESULT_FOLDER_ID');
  return createImageFile(RESULT_FOLDER_ID, 'result', tradeId, payload, savedAt);
}

function saveEntryImages(tradeId, payload, savedAt) {
  requireConfigured_(ENTRY_FOLDER_ID, 'ENTRY_FOLDER_ID');
  return createImageFiles(ENTRY_FOLDER_ID, 'entry', tradeId, payload, savedAt);
}

function saveResultImages(tradeId, payload, savedAt) {
  requireConfigured_(RESULT_FOLDER_ID, 'RESULT_FOLDER_ID');
  return createImageFiles(RESULT_FOLDER_ID, 'result', tradeId, payload, savedAt);
}

function createImageFile(folderId, kind, tradeId, payload, savedAt) {
  var image = validateImagePayload(payload);
  return createValidatedImageFile_(folderId, kind, tradeId, image, savedAt, 1);
}

function createImageFiles(folderId, kind, tradeId, payload, savedAt) {
  var images = validateImagePayloads(payload);
  var savedImages = [];
  try {
    images.forEach(function(image, index) {
      savedImages.push(createValidatedImageFile_(folderId, kind, tradeId, image, savedAt, index + 1));
    });
    return savedImages;
  } catch (e) {
    trashDriveFilesQuietly_(savedImages);
    throw e;
  }
}

function createValidatedImageFile_(folderId, kind, tradeId, image, savedAt, index) {
  var extension = getExtensionFromMimeType(image.mimeType);
  var timestamp = Utilities.formatDate(savedAt || now_(), TIMEZONE, 'yyyyMMdd_HHmmss');
  var paddedIndex = ('0' + (index || 1)).slice(-2);
  var fileName = kind + '_' + timestamp + '_' + tradeId + '_' + paddedIndex + '.' + extension;
  var bytes = Utilities.base64Decode(image.base64);
  var blob = Utilities.newBlob(bytes, image.mimeType, fileName);
  var folder = DriveApp.getFolderById(folderId);
  var file = folder.createFile(blob);
  configureImageFileForPreview_(file);

  return {
    fileId: file.getId(),
    url: getImageUrl(file),
    fileName: fileName,
    originalFileName: image.fileName,
    mimeType: image.mimeType
  };
}

function getImageUrl(file) {
  return 'https://drive.google.com/uc?export=view&id=' + encodeURIComponent(file.getId());
}

function getImagePreviewFormula(file) {
  return buildImagePreviewFormula_(getImageUrl(file));
}

function buildImagePreviewFormula_(url) {
  if (!url) {
    return '';
  }
  return '=IMAGE("' + String(url).replace(/"/g, '""') + '", 4, 120, 160)';
}

function configureImageFileForPreview_(file) {
  if (!SHARE_IMAGE_FILES_FOR_PREVIEW) {
    return;
  }
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
}

function getImageInfoFromFileId_(fileId) {
  if (!fileId) {
    return null;
  }
  var file = DriveApp.getFileById(fileId);
  configureImageFileForPreview_(file);
  return {
    fileId: file.getId(),
    url: getImageUrl(file),
    fileName: file.getName(),
    originalFileName: file.getName(),
    mimeType: file.getMimeType()
  };
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

function trashDriveFilesQuietly_(images) {
  (images || []).forEach(function(image) {
    trashDriveFileQuietly_(image && image.fileId);
  });
}
