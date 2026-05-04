# Trade

妻用FXトレード練習・エントリー記録アプリのMVPです。スマホブラウザからGoogle Apps Script Web Appを開き、エントリー画像、メモ、指し値、逆指し値、到達予想時間、結果画像を1件のトレード記録として保存します。

画像本体はGoogle Drive、記録データはGoogleスプレッドシートに保存します。MVPではOCR、AI画像解析、外部有料API、勝敗判定、pips計算、損益計算は使いません。

## 運用前提

- 利用端末: iPhone / Android のスマホブラウザ
- 実行基盤: Google Apps Script Web App
- 保存先: Google Drive、Googleスプレッドシート
- 利用者: 妻、必要に応じてBOSS
- 公開範囲: 家族利用に限定し、Web App URLは外部共有しない
- タイムゾーン: `Asia/Tokyo`

## 手動セットアップ

### 1. スプレッドシートを作成

1. Google Driveで `Trade_DB` というスプレッドシートを作成します。
2. シート名を `trades` にします。
3. 1行目に以下のヘッダーを左から順に作成します。

```text
trade_id
status
entry_saved_at
result_saved_at
duration_minutes
entry_image_url
result_image_url
memo
limit_value
stop_value
expected_reach_time
created_date
day_of_week
entry_image_file_id
result_image_file_id
entry_image_filename
result_image_filename
updated_at
```

4. `limit_value`、`stop_value`、`expected_reach_time` はプレーンテキスト形式にします。
5. `entry_saved_at`、`result_saved_at`、`updated_at` は日時形式にします。
6. `duration_minutes` は数値形式にします。
7. スプレッドシートURLからスプレッドシートIDを控えます。

### 2. Driveフォルダを作成

1. Google Driveに親フォルダ `Trade_Images` を作成します。
2. その中に子フォルダ `entry` と `result` を作成します。
3. `entry` フォルダIDを控えます。
4. `result` フォルダIDを控えます。
5. 画像フォルダは原則非公開のままにします。

構成:

```text
Trade_Images/
  entry/
  result/
```

### 3. Apps Scriptプロジェクトを作成

1. Google Apps Scriptで新規プロジェクトを作成します。
2. プロジェクト名を `trade-mvp` などにします。
3. 下記の「GASエディタへ貼り付けるファイル一覧」に沿って、`.gs` と `.html` ファイルを作成します。
4. `Config.gs` にスプレッドシートIDとDriveフォルダIDを設定します。
5. Apps Scriptエディタ上で保存します。
6. Apps Scriptエディタで `setupTradeSheet()` を1回実行し、ヘッダーと文字列書式を初期化します。

## GASエディタへ貼り付けるファイル一覧

GASエディタ中心運用では、ローカルのコードを直接実行するのではなく、以下のファイルをApps Scriptプロジェクトに作成して貼り付けます。

claspで同期する場合は、リポジトリ直下の `.clasp.json` が `gas/` を同期元として既存Apps Scriptプロジェクトに紐づけています。初回は `clasp login` で対象Googleアカウントにログインし、`clasp status` で対象ファイルを確認してから `clasp push` してください。

### サーバー側

- `Code.gs`
  - `doGet`
  - 初期表示
  - HtmlServiceの入口

- `Config.gs`
  - アプリ名
  - タイムゾーン
  - スプレッドシートID
  - シート名
  - DriveフォルダID
  - ステータス値
  - 入力制限値

- `TradeService.gs`
  - `createEntryTrade`
  - `updateEntryFields`
  - `completeTrade`
  - `getWaitingTrades`
  - `getHistory`
  - `getTradeById`

- `DriveService.gs`
  - `saveEntryImage`
  - `saveResultImage`
  - `createImageFile`
  - `getImageUrl`

- `SheetService.gs`
  - `appendTradeRow`
  - `updateTradeRow`
  - `findRowByTradeId`
  - `getAllTrades`
  - `mapRowToTrade`
  - `ensureHeader`
  - `setTextFormats`

- `Utils.gs`
  - `generateTradeId`
  - `formatDate`
  - `calculateDurationMinutes`
  - `getDayOfWeek`
  - `sanitizeFileName`
  - `sanitizeEntryField`
  - `validateEntryFields`

### フロントエンド側

- `Index.html`
  - ホーム画面
  - 履歴画面
  - 詳細画面
  - `Style.html` と `Script.html` のinclude

- `Style.html`
  - スマホファーストCSS
  - 結果待ちカード
  - 履歴リスト
  - 詳細画面
  - Toast表示

- `Script.html`
  - 画像選択
  - FileReaderによるbase64変換
  - `google.script.run` 呼び出し
  - 画面切り替え
  - 自動保存のdebounce
  - エラー表示

- `appsscript.json`
  - タイムゾーン
  - V8ランタイム
  - Spreadsheet / Drive のOAuthスコープ

## Configに入れるIDと定数

`Config.gs` には最低限、以下を設定します。

```javascript
var APP_NAME = 'Trade';
var TIMEZONE = 'Asia/Tokyo';

var SPREADSHEET_ID = 'Trade_DBのスプレッドシートID';
var TRADES_SHEET_NAME = 'trades';

var ENTRY_FOLDER_ID = 'Trade_Images/entryのフォルダID';
var RESULT_FOLDER_ID = 'Trade_Images/resultのフォルダID';

var STATUS_WAITING = 'waiting';
var STATUS_COMPLETED = 'completed';

var AUTO_SAVE_DELAY_MS = 1000;
var MAX_HISTORY_ITEMS = 300;

var ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

var MAX_ENTRY_FIELD_LENGTH = 32;
var MAX_MEMO_LENGTH = 1000;
var ENTRY_FIELD_ALLOWED_PATTERN = /^[A-Za-z0-9.:_\-/+ ]{0,32}$/;
```

注意:

- `SPREADSHEET_ID` はスプレッドシートURL内の `/d/` と `/edit` の間の文字列です。
- DriveフォルダIDはフォルダURL内の `/folders/` 以降の文字列です。
- `limit_value`、`stop_value`、`expected_reach_time` は数値ではなく文字列として保存します。
- `154.000` が `154` に変換されないこと、`21:30` が時刻型に変換されないことを確認します。
- 画像URLはアプリ内表示のためDriveサムネイルURLとして保存されます。利用者が画像を表示できない場合は、対象Googleアカウントに画像フォルダの閲覧権限を付与してください。

## Web Appデプロイ

1. Apps Scriptエディタで「デプロイ」から「新しいデプロイ」を選択します。
2. 種類は「ウェブアプリ」を選択します。
3. 説明に `Trade MVP` などを入力します。
4. 実行ユーザーは原則「自分」にします。
5. アクセスできるユーザーは家族運用に合わせて限定します。
6. 初回デプロイ時に権限承認を行います。
7. 発行されたWeb App URLをスマホで開きます。
8. URLは外部に共有しません。

デプロイ後にコードを変更した場合は、新しいバージョンとして再デプロイします。テスト中に古いURLや古いデプロイを見ていないか注意してください。

## 基本操作

1. スマホでTradeのWeb App URLを開きます。
2. 「エントリー画像を保存」を押してチャートスクショを選びます。
3. 結果待ちカードに、指し値、逆指し値、到達予想時間、メモを入力します。
4. 入力内容は保存ボタンなしで自動保存されます。
5. 結果が出たら、該当カードの「結果画像を保存」から結果スクショを選びます。
6. 完了した記録はホームから消え、履歴画面で確認できます。

## テスト

実機確認は [docs/ACCEPTANCE_CHECKLIST.md](docs/ACCEPTANCE_CHECKLIST.md) に沿って行います。AC-001〜AC-022を1件ずつ確認し、スマホ画面、Drive、スプレッドシートの3点で結果を照合します。

## 注意点

- コードや画像に口座番号、残高などが写る可能性があります。外部APIへ画像を送信しないでください。
- HEIC画像はMVPでは非推奨です。jpg / jpeg / png / webpで確認してください。
- 大きすぎる画像はApps Scriptの制限にかかる可能性があります。
- 二重タップで重複登録しないよう、画像アップロード中はボタンが無効になることを確認してください。
- エラーや途中離脱があった場合は、次回起動時にスプレッドシート上の状態を正として表示できるか確認してください。
