/**
 * RETIRED 28 Sep 2026 (Jay): this endpoint wrote to the SIDE sheet
 * "MRJ Word Master Progress (web)" (1bmyXV3-...). The ONE score book is
 * MRJ Classroom Metrics, posted by js/mrj-scores.js through the shared receiver.
 * Kept only as history. Do not deploy. Do not point an app at it.
 */
/* --- retired source below ---
/**
 * MRJ Day 2 Words — progress endpoint (Google Apps Script web app).
 * Writes to the "Day2" tab of "MRJ Word Master Progress (web)"
 * (sheet id 1bmyXV3-55wH1p3AEOdC9yUCF3ExulVc6GFJy_Qk0zak), one row per student name.
 * Same columns as Sheet1. Deploy: Deploy > New deployment > Web app,
 * Execute as: Me, Who has access: Anyone. Put the /exec URL in js/progress-config.js.
 */
var SHEET_ID = "1bmyXV3-55wH1p3AEOdC9yUCF3ExulVc6GFJy_Qk0zak";
var TAB = "Day2";
var COLS = ["updated_at","name","pin","pack_id","pack_title","screen","word_id","study_size","locale","student_id","progress_json"];

function tab_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(TAB);
  if (!sh) { sh = ss.insertSheet(TAB); sh.appendRow(COLS); }
  if (sh.getLastRow() === 0) sh.appendRow(COLS);
  return sh;
}
function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() { return out_({ ok: true, service: "mrj-day2-words-progress" }); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var p = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var name = String(p.name || "").trim().slice(0, 24);
    var pin = String(p.pin || "").replace(/\D/g, "").slice(0, 4);
    if (!name || pin.length !== 4) return out_({ ok: false, error: "need_name_pin" });
    var sh = tab_();
    var data = sh.getDataRange().getValues();
    var row = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim().toLowerCase() === name.toLowerCase()) { row = i; break; }
    }
    if (row >= 0 && String(data[row][2]).replace(/\D/g, "") !== pin && String(data[row][2]) !== "") {
      var stored = ("0000" + String(data[row][2]).replace(/\D/g, "")).slice(-4);
      if (stored !== pin) return out_({ ok: false, error: "wrong_pin" });
    }
    if (p.action === "load") {
      if (row < 0) return out_({ ok: true, found: false });
      return out_({ ok: true, found: true, progress_json: String(data[row][10] || "") });
    }
    var now = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm") + " KST";
    var vals = [now, name, "'" + pin, p.pack_id || "", p.pack_title || "", p.screen || "", p.word_id || "",
      p.study_size || "", p.locale || "", p.student_id || "", String(p.progress_json || "").slice(0, 49000)];
    if (row >= 0) sh.getRange(row + 1, 1, 1, vals.length).setValues([vals]);
    else sh.appendRow(vals);
    return out_({ ok: true, saved: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

--- retired source above --- */
