"use strict";

const fs = require("fs");
const vm = require("vm");
const path = require("path");

const TEST_STUDENT = "zz_test_mrjmetrics";
const BUILD = JSON.parse(fs.readFileSync("version.json", "utf8")).build;

function assert(cond, msg) {
  if (!cond) {
    console.error(msg);
    process.exit(1);
  }
}

function bootProgress(studentId) {
  const g = global;
  g.window = g;
  g.DAY2_WORDS_PROGRAM = "day2-words";
  g.localStorage = {
    _data: {},
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null;
    },
    setItem(k, v) {
      this._data[k] = String(v);
    },
  };
  const noteScores = [];
  const posts = [];
  let student = studentId;
  g.MRJ_AUTH = {
    student() {
      return student;
    },
    token() {
      return student ? "tok" : "";
    },
    noteScore(args) {
      noteScores.push(args);
      return Promise.resolve({ ok: true });
    },
  };
  g.MRJ_SCORES = {
    localDate() {
      return "2026-10-11";
    },
    post(args) {
      posts.push(args);
      return Promise.resolve({ ok: true });
    },
  };
  g.fetch = function () {
    return Promise.reject(new Error("network disabled in tests"));
  };
  const code = fs.readFileSync(path.join("js", "progress.js"), "utf8");
  vm.runInContext(code, vm.createContext(g));
  return {
    progress: g.MRJ_WM_progress,
    noteScores,
    posts,
    setStudent(id) {
      student = id;
    },
  };
}

function assertCacheBust() {
  const htmlFiles = ["play.html", "songs/play.html"];
  const mustMatch = ["progress.js", "app.js", "mrj-scores.js", "version-watch.js"];
  htmlFiles.forEach(function (file) {
    const html = fs.readFileSync(file, "utf8");
    const wm = html.match(/WM_BUILD_ID="([^"]+)"/);
    assert(wm && wm[1] === BUILD, file + " WM_BUILD_ID must match version.json");
    mustMatch.forEach(function (asset) {
      if (asset === "app.js" && file.indexOf("songs/") >= 0) return;
      const re = new RegExp(asset.replace(".", "\\.") + "\\?v=([^\"']+)");
      const m = html.match(re);
      assert(m && m[1] === BUILD, file + " " + asset + " ?v= must match build " + BUILD);
    });
  });
  const indexHtml = fs.readFileSync("index.html", "utf8");
  const vers = indexHtml.match(/\?v=([^"']+)/g) || [];
  vers.forEach(function (tag) {
    const v = tag.replace("?v=", "");
    assert(v === BUILD, "index.html ?v= " + v + " must match build " + BUILD);
  });
}

function runAsync() {
  const ctx = bootProgress(TEST_STUDENT);
  const pack = "day2_basic_a_u1";

  return ctx.progress
    .logResult({
      packId: pack,
      packTitle: "Basic A U1",
      kind: "test_easy",
      score: 8,
      total: 10,
      meta: { passed: true },
    })
    .then(function () {
      assert(ctx.noteScores.length === 1, "quiz pass: one noteScore");
      const n = ctx.noteScores[0];
      assert(n.program === "day2-words", "program day2-words");
      assert(n.itemId === pack + ":test_easy", "itemId test_easy");
      assert(n.scoreValue === 8 && n.scoreMax === 10 && n.scorePct === 80, "8/10 scores");
      assert(n.localDate === "2026-10-11", "localDate");
      assert(ctx.posts.length === 1, "quiz pass: one CM post");
      assert(ctx.posts[0].itemId === pack + ":test_easy", "post itemId");
      assert(ctx.posts[0].program === "day2-words", "post program");

      ctx.noteScores.length = 0;
      ctx.posts.length = 0;
      return ctx.progress.logResult({
        packId: pack,
        packTitle: "Basic A U1",
        kind: "test_easy",
        score: 5,
        total: 10,
        meta: { passed: false },
      });
    })
    .then(function () {
      assert(ctx.noteScores[0].scoreValue === 5, "fail still sends 5/10");
      ctx.noteScores.length = 0;
      ctx.posts.length = 0;
      return ctx.progress.logResult({
        packId: pack,
        packTitle: "Basic A U1",
        kind: "listen",
        score: 7,
        total: 10,
        meta: {},
      });
    })
    .then(function () {
      assert(ctx.noteScores[0].itemId === pack + ":listen", "listen itemId");
      ctx.noteScores.length = 0;
      ctx.posts.length = 0;
      return ctx.progress.logResult({
        packId: pack,
        packTitle: "Basic A U1",
        kind: "match",
        score: 10,
        total: 10,
        meta: { seconds: 42 },
      });
    })
    .then(function () {
      assert(ctx.noteScores[0].itemId === pack + ":match", "match itemId");
      ctx.noteScores.length = 0;
      ctx.posts.length = 0;
      return ctx.progress.save({
        progress_json: JSON.stringify({ v: 1, sets: {} }),
        pack_id: pack,
      });
    })
    .then(function () {
      assert(ctx.noteScores.length === 0 && ctx.posts.length === 0, "routine save sends no scores");
      ctx.setStudent("");
      return ctx.progress.logResult({
        packId: pack,
        kind: "test_easy",
        score: 8,
        total: 10,
      });
    })
    .then(function () {
      assert(ctx.noteScores.length === 0 && ctx.posts.length === 0, "signed out sends nothing");
      const all = JSON.stringify(ctx.noteScores) + JSON.stringify(ctx.posts);
      assert(all.indexOf("word-master") === -1, "program never word-master");
    });
}

assertCacheBust();

runAsync()
  .then(function () {
    console.log("SCORE_LOG_OK");
    process.exit(0);
  })
  .catch(function (err) {
    console.error(err);
    process.exit(1);
  });
