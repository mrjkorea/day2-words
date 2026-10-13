#!/usr/bin/env node
/**
 * Headless check: legacy play.html (no ?pack= redirect) opens correct units from home tiles.
 * Usage: node scripts/play_pack_links_playwright.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BASE = process.argv[2] || "http://127.0.0.1:8765";

const PACK_IDS = ["basic_a_u1", "basic_a_u2", "basic_b_u5", "int2b_u3", "int3c_u8"];

function packExpect(pid) {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, "packs", pid + ".json"), "utf8"));
  const words = raw.words || [];
  const first = words[0] && (words[0].en || words[0].word);
  if (!first) throw new Error("no words in " + pid);
  return { id: pid, first: String(first).trim(), title: String(raw.title || pid) };
}

async function signInGuest(page) {
  await page.evaluate(() => {
    window.MRJ_AUTH = {
      student: () => "",
      token: () => "",
      signOut: () => {},
    };
    window.dispatchEvent(new CustomEvent("mrj-auth-ready", { detail: { id: "" } }));
    const gate = document.getElementById("mrj-auth-gate");
    if (gate) gate.hidden = true;
    if (document.documentElement) {
      document.documentElement.classList.remove("mrj-auth-locked");
    }
  });
}

async function readSetScreen(page) {
  return page.evaluate(() => {
    const title = document.querySelector("#set-title");
    const chips = document.querySelectorAll("#word-chips .word-row .en");
    const first =
      chips.length && chips[0].textContent ? chips[0].textContent.trim() : "";
    return { title: title ? title.textContent.trim() : "", first };
  });
}

async function bootToHome(page) {
  const url = BASE.replace(/\/$/, "") + "/play.html";
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await signInGuest(page);
  const tap = await page.$("#btn-tap-start");
  if (tap) await tap.click();
  await page.waitForSelector("#screen-home.active", { timeout: 30000 });
}

async function openPackFromHome(page, pid) {
  const onSet = await page.$("#screen-set.active");
  if (onSet) {
    await page.click("#btn-back");
    await page.waitForSelector("#screen-home.active");
  }
  await page.click("#btn-pack-" + pid);
  await page.waitForSelector("#screen-set.active", { timeout: 30000 });
  return readSetScreen(page);
}

async function main() {
  const expects = PACK_IDS.map(packExpect);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await bootToHome(page);
  const failures = [];

  for (const exp of expects) {
    const got = await openPackFromHome(page, exp.id);
    if (got.first !== exp.first) {
      failures.push(
        exp.id + ": first word expected " + exp.first + " got " + JSON.stringify(got)
      );
    }
  }

  await browser.close();
  if (failures.length) {
    console.error("PLAY_PACK_LINKS_FAIL");
    failures.forEach((f) => console.error(f));
    process.exit(1);
  }
  console.log("PLAY_PACK_LINKS_OK", PACK_IDS.length, "packs");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
