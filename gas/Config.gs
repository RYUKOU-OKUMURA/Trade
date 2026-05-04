var APP_NAME = 'Trade';
var TIMEZONE = 'Asia/Tokyo';

// GASエディタへ貼り付け後、実際のIDに差し替えてください。
var SPREADSHEET_ID = '1lL_FyDxjWXLQFP-gmw-QLLqYXP0ZUSZVCGBeJf-cwPE';
var TRADES_SHEET_NAME = 'trades';
var ENTRY_FOLDER_ID = '1h6JN4IWUZoZGepK79M5O2z_PWd-z5MYT';
var RESULT_FOLDER_ID = '1PDVT4cTv2q7jXz7XGx3nB-4r_5bLoZMg';

var STATUS_WAITING = 'waiting';
var STATUS_COMPLETED = 'completed';

var AUTO_SAVE_DELAY_MS = 1000;
var MAX_HISTORY_ITEMS = 300;
var MAX_ENTRY_FIELD_LENGTH = 32;
var MAX_MEMO_LENGTH = 1000;
var MAX_IMAGES_PER_TRADE = 6;
var LOCK_WAIT_MS = 30000;
var SHARE_IMAGE_FILES_FOR_PREVIEW = true;

var ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

var ENTRY_FIELD_ALLOWED_PATTERN = /^[A-Za-z0-9.:_\-\/+ ]{0,32}$/;

var TRADE_HEADERS = [
  'trade_id',
  'status',
  'entry_saved_at',
  'result_saved_at',
  'duration_minutes',
  'entry_image_url',
  'result_image_url',
  'entry_image_preview',
  'result_image_preview',
  'entry_image_urls',
  'result_image_urls',
  'memo',
  'limit_value',
  'stop_value',
  'expected_reach_time',
  'created_date',
  'day_of_week',
  'entry_image_file_id',
  'result_image_file_id',
  'entry_image_file_ids',
  'result_image_file_ids',
  'entry_image_filename',
  'result_image_filename',
  'entry_image_filenames',
  'result_image_filenames',
  'entry_image_count',
  'result_image_count',
  'updated_at'
];

var TEXT_COLUMNS = [
  'trade_id',
  'status',
  'entry_image_url',
  'result_image_url',
  'entry_image_urls',
  'result_image_urls',
  'memo',
  'limit_value',
  'stop_value',
  'expected_reach_time',
  'created_date',
  'day_of_week',
  'entry_image_file_id',
  'result_image_file_id',
  'entry_image_file_ids',
  'result_image_file_ids',
  'entry_image_filename',
  'result_image_filename',
  'entry_image_filenames',
  'result_image_filenames'
];

var DATETIME_COLUMNS = [
  'entry_saved_at',
  'result_saved_at',
  'updated_at'
];
