(function (root) {
  "use strict";

  function maxNum(a, b) {
    var x = Number(a);
    var y = Number(b);
    if (!isFinite(x)) x = 0;
    if (!isFinite(y)) y = 0;
    return Math.max(x, y);
  }

  function mergeCountMaps(a, b) {
    a = a && typeof a === "object" ? a : {};
    b = b && typeof b === "object" ? b : {};
    var out = {};
    var keys = Object.keys(a);
    Object.keys(b).forEach(function (k) {
      if (keys.indexOf(k) === -1) keys.push(k);
    });
    keys.forEach(function (k) {
      out[k] = maxNum(a[k], b[k]);
    });
    return out;
  }

  function mergeTestPassed(a, b) {
    return mergeCountMaps(a, b);
  }

  function mergeIntro(a, b) {
    a = a && typeof a === "object" ? a : {};
    b = b && typeof b === "object" ? b : {};
    var out = {};
    var keys = Object.keys(a);
    Object.keys(b).forEach(function (k) {
      if (keys.indexOf(k) === -1) keys.push(k);
    });
    keys.forEach(function (k) {
      out[k] = !!(a[k] || b[k]);
    });
    return out;
  }

  function mergeMeetLock(a, b) {
    var out = [];
    var seen = {};
    function add(list) {
      if (!Array.isArray(list)) return;
      list.forEach(function (id) {
        if (id == null || id === "" || seen[id]) return;
        seen[id] = true;
        out.push(id);
      });
    }
    add(a);
    add(b);
    return out;
  }

  function mergeShallowObjects(a, b) {
    a = a && typeof a === "object" ? a : {};
    b = b && typeof b === "object" ? b : {};
    var out = {};
    Object.keys(a).forEach(function (k) {
      out[k] = a[k];
    });
    Object.keys(b).forEach(function (k) {
      if (out[k] == null) out[k] = b[k];
    });
    return out;
  }

  function pickStartNumber(a, b) {
    var aAt = a && a.lastPlayedAt ? Number(a.lastPlayedAt) : 0;
    var bAt = b && b.lastPlayedAt ? Number(b.lastPlayedAt) : 0;
    var newer = bAt >= aAt ? b : a;
    var older = bAt >= aAt ? a : b;
    var nNew = newer && Number(newer.startNumber) >= 1 ? Number(newer.startNumber) : null;
    var nOld = older && Number(older.startNumber) >= 1 ? Number(older.startNumber) : null;
    return nNew != null ? nNew : nOld;
  }

  function mergeScoreBlock(a, b) {
    if (!a && !b) return null;
    if (!a) return b;
    if (!b) return a;
    var aAt = Number(a.at) || 0;
    var bAt = Number(b.at) || 0;
    return bAt >= aAt ? b : a;
  }

  function mapHasPositive(m) {
    m = m && typeof m === "object" ? m : {};
    var keys = Object.keys(m);
    for (var i = 0; i < keys.length; i++) {
      if (Number(m[keys[i]]) > 0) return true;
    }
    return false;
  }

  function packProgressEmpty(p) {
    if (!p || typeof p !== "object") return true;
    if (mapHasPositive(p.winsA) || mapHasPositive(p.winsB) || mapHasPositive(p.winsC)) {
      return false;
    }
    if (p.intro && Object.keys(p.intro).length) return false;
    if (Array.isArray(p.meetLock) && p.meetLock.length) return false;
    if (p.testPassed && Object.keys(p.testPassed).length) return false;
    if (p.final || p.check) return false;
    return true;
  }

  function mergePack(a, b) {
    if (!a) return b || {};
    if (!b) return a || {};
    return {
      title: b.title || a.title || "",
      winsA: mergeCountMaps(a.winsA, b.winsA),
      winsB: mergeCountMaps(a.winsB, b.winsB),
      winsC: mergeCountMaps(a.winsC, b.winsC),
      intro: mergeIntro(a.intro, b.intro),
      meetLock: mergeMeetLock(a.meetLock, b.meetLock),
      startNumber: pickStartNumber(a, b),
      testPassed: mergeTestPassed(a.testPassed, b.testPassed),
      tapmapKey: b.tapmapKey || a.tapmapKey || "",
      lastPlayedAt: maxNum(a.lastPlayedAt, b.lastPlayedAt),
      srsTrying: !!(a.srsTrying || b.srsTrying),
      srsForever: !!(a.srsForever || b.srsForever),
      srsStage: maxNum(a.srsStage, b.srsStage),
      srsNextAt: a.srsNextAt != null && b.srsNextAt != null
        ? (Number(b.srsNextAt) >= Number(a.srsNextAt) ? b.srsNextAt : a.srsNextAt)
        : (a.srsNextAt != null ? a.srsNextAt : b.srsNextAt),
      final: mergeScoreBlock(a.final, b.final),
      check: mergeScoreBlock(a.check, b.check),
      finalMiss: (Array.isArray(b.finalMiss) && b.finalMiss.length ? b.finalMiss : a.finalMiss) || [],
      roundGames: mergeShallowObjects(a.roundGames, b.roundGames),
      pathHeld: mergeShallowObjects(a.pathHeld, b.pathHeld),
    };
  }

  function mergeProgress(local, remote) {
    local = local && typeof local === "object" ? local : { v: 1, sets: {} };
    remote = remote && typeof remote === "object" ? remote : { v: 1, sets: {} };
    var localSets = local.sets && typeof local.sets === "object" ? local.sets : {};
    var remoteSets = remote.sets && typeof remote.sets === "object" ? remote.sets : {};
    var keys = Object.keys(localSets);
    Object.keys(remoteSets).forEach(function (k) {
      if (keys.indexOf(k) === -1) keys.push(k);
    });
    var sets = {};
    keys.forEach(function (pid) {
      var localP = localSets[pid];
      var remoteP = remoteSets[pid];
      if (packProgressEmpty(remoteP) && !packProgressEmpty(localP)) {
        sets[pid] = mergePack(remoteP, localP);
      } else {
        sets[pid] = mergePack(localP, remoteP);
      }
    });
    var localAt = 0;
    var remoteAt = 0;
    keys.forEach(function (pid) {
      localAt = maxNum(localAt, localSets[pid] && localSets[pid].lastPlayedAt);
      remoteAt = maxNum(remoteAt, remoteSets[pid] && remoteSets[pid].lastPlayedAt);
    });
    var preferRemote = remoteAt >= localAt;
    var base = preferRemote ? remote : local;
    var other = preferRemote ? local : remote;
    var currentPackId = base.currentPackId || other.currentPackId || "";
    if (packProgressEmpty(sets[currentPackId])) {
      for (var pi = 0; pi < keys.length; pi++) {
        if (!packProgressEmpty(sets[keys[pi]])) {
          currentPackId = keys[pi];
          break;
        }
      }
    }
    return {
      v: 1,
      studentId: base.studentId || other.studentId || "",
      voice: base.voice || other.voice || "us_m",
      locale: base.locale || other.locale || "en",
      studySize: base.studySize || other.studySize || 10,
      testKind: base.testKind || other.testKind || "easy",
      currentPackId: currentPackId,
      sets: sets,
    };
  }

  function parseProgressJson(raw) {
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    try {
      var parsed = JSON.parse(String(raw));
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function progressHasPackData(progress) {
    var prog = parseProgressJson(progress);
    if (!prog || !prog.sets || typeof prog.sets !== "object") return false;
    var keys = Object.keys(prog.sets);
    for (var i = 0; i < keys.length; i++) {
      if (!packProgressEmpty(prog.sets[keys[i]])) return true;
    }
    return false;
  }

  function filterProgressToPackIds(progress, packIds) {
    var prog = parseProgressJson(progress);
    if (!prog) return { v: 1, sets: {} };
    var allow = null;
    if (Array.isArray(packIds) && packIds.length) {
      allow = {};
      packIds.forEach(function (pid) {
        if (pid) allow[String(pid)] = true;
      });
    }
    var sets = prog.sets && typeof prog.sets === "object" ? prog.sets : {};
    var outSets = {};
    Object.keys(sets).forEach(function (pid) {
      if (allow && !allow[pid]) return;
      outSets[pid] = sets[pid];
    });
    return {
      v: prog.v || 1,
      studentId: prog.studentId || "",
      voice: prog.voice || "us_m",
      locale: prog.locale || "en",
      studySize: prog.studySize || 10,
      testKind: prog.testKind || "easy",
      currentPackId: prog.currentPackId || "",
      sets: outSets,
    };
  }

  function buildMigratedDay2Progress(serverDay2, legacyDay2, localDay2, packIds, mergeFn) {
    var merge = mergeFn || mergeProgress;
    var ids = packIds || root.DAY2_WORDS_PACK_IDS || [];
    var server = filterProgressToPackIds(serverDay2, ids);
    if (progressHasPackData(server)) {
      return { progress: server, migrated: false };
    }
    var legacy = filterProgressToPackIds(legacyDay2, ids);
    var local = filterProgressToPackIds(localDay2, ids);
    var merged = merge(local, legacy);
    merged = merge(merged, server);
    return { progress: merged, migrated: true };
  }

  root.MRJ_WM_merge = mergeProgress;
  root.MRJ_WM_mergePack = mergePack;
  root.MRJ_WM_packProgressEmpty = packProgressEmpty;
  root.MRJ_WM_parseProgressJson = parseProgressJson;
  root.MRJ_WM_progressHasPackData = progressHasPackData;
  root.MRJ_WM_filterProgressToPackIds = filterProgressToPackIds;
  root.MRJ_WM_buildMigratedDay2Progress = buildMigratedDay2Progress;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      mergeProgress: mergeProgress,
      mergePack: mergePack,
      packProgressEmpty: packProgressEmpty,
      parseProgressJson: parseProgressJson,
      progressHasPackData: progressHasPackData,
      filterProgressToPackIds: filterProgressToPackIds,
      buildMigratedDay2Progress: buildMigratedDay2Progress,
    };
  }
})(typeof window !== "undefined" ? window : global);
