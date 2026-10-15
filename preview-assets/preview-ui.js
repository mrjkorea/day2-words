/* Preview-only: turn the long book list into a book-card picker that shows ONE book's
   unit tiles at a time. All unit links stay exactly as they are (open Word Master). */
(function () {
  "use strict";
  var root = document.documentElement;
  function fam(id) { return /int3/.test(id) ? "red" : /int2/.test(id) ? "blue" : "green"; }
  var ICON = { green: "🌿", blue: "💎", red: "🍎" };
  var nav = document.querySelector(".jump");
  var books = document.querySelectorAll("section.book");
  if (!nav || !books.length) return;
  root.classList.add("pv-picker");
  var picker = document.createElement("div");
  picker.className = "pv-books";
  function show(id, scroll) {
    root.setAttribute("data-book", fam(id));
    books.forEach(function (s) { s.classList.toggle("pv-on", s.id === id); });
    picker.querySelectorAll(".pv-book").forEach(function (c) { var on = c.getAttribute("data-id") === id; c.classList.toggle("is-on", on); c.setAttribute("aria-pressed", String(on)); });
    try { sessionStorage.setItem("pv.day2.book", id); } catch (e) {}
    if (scroll) { var s = document.getElementById(id); if (s) s.scrollIntoView({ behavior: "smooth", block: "start" }); }
  }
  books.forEach(function (s) {
    var h = s.querySelector("h2");
    var name = h ? h.textContent.trim() : s.id;
    var f = fam(s.id);
    s.classList.add("pv-" + f);
    var c = document.createElement("a");
    c.className = "pv-book pv-" + f;
    c.href = "#" + s.id;
    c.setAttribute("data-id", s.id);
    var m = name.match(/^(.*?)\s*([0-9]*[A-C])$/i);
    c.innerHTML = '<span class="pv-book-icon">' + ICON[f] + '</span><span class="pv-book-title"></span><span class="pv-book-level"></span><span class="pv-book-count"></span>';
    c.querySelector(".pv-book-title").textContent = m ? m[1].replace(/^INT$/i, "Int") || name : name;
    c.querySelector(".pv-book-level").textContent = m ? m[2] : "";
    c.querySelector(".pv-book-count").textContent = s.querySelectorAll(".unit").length + " units";
    c.onclick = function (e) { e.preventDefault(); show(s.id, true); history.replaceState(null, "", "#" + s.id); };
    picker.appendChild(c);
  });
  nav.parentNode.insertBefore(picker, nav.nextSibling);
  nav.classList.add("pv-jump");
  var start = (location.hash || "").slice(1);
  var saved; try { saved = sessionStorage.getItem("pv.day2.book"); } catch (e) {}
  var first = document.getElementById(start) && document.getElementById(start).classList.contains("book") ? start : (saved && document.getElementById(saved) ? saved : books[0].id);
  show(first, false);
})();
