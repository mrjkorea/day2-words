# Turn on online score saving (one-time, ~2 minutes, Mr. Jay's Google account)

1. Open the sheet "MRJ Word Master Progress (web)" → Extensions → Apps Script.
2. Replace the code with `Code.gs` from this folder. Save.
3. Deploy → New deployment → type **Web app** → Execute as **Me** → Who has access **Anyone** → Deploy → Allow.
4. Copy the Web app URL (ends in `/exec`).
5. Put it in `js/progress-config.js`: `window.WM_PROGRESS_URL = "https://script.google.com/macros/s/.../exec";` and push.

Rows land in a new "Day2" tab (created automatically), same columns as Sheet1, pack_id like `day2_int2b_u3`.
Until then, sign-in and progress still work, saved on each device only.
