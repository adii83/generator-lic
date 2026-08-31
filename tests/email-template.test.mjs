import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

async function loadEmailModule() {
  const source = await readFile(new URL("../api/email.js", import.meta.url), "utf8");
  const context = vm.createContext({ process });
  const module = new vm.SourceTextModule(source, { context });

  await module.link(async (specifier) => {
    if (specifier === "nodemailer") {
      return new vm.SyntheticModule(["default"], function () {
        this.setExport("default", {});
      }, { context });
    }
    if (specifier === "./_auth.js") {
      return new vm.SyntheticModule(["requireAdmin"], function () {
        this.setExport("requireAdmin", () => {});
      }, { context });
    }
    throw new Error(`Unexpected import: ${specifier}`);
  });

  await module.evaluate();
  return module.namespace;
}

const email = await loadEmailModule();

test("template email memakai emoji Unicode tanpa mojibake", () => {
  assert.equal(typeof email.buildEmailText, "function");
  const text = email.buildEmailText("NXP-TEST");
  assert.match(text, /🎉/u);
  assert.match(text, /🔗/u);
  assert.doesNotMatch(text, /ðŸ|ï¸/u);
});

test("template HTML punya struktur dan tombol tindakan utama", () => {
  assert.equal(typeof email.buildEmailHtml, "function");
  const html = email.buildEmailHtml("NXP-TEST");
  assert.match(html, /max-width:\s*600px/i);
  assert.match(html, />Download NexaPlay</);
  assert.match(html, />Lihat Tutorial</);
  assert.match(html, />Gabung Discord</);
  assert.match(html, />Hubungi WhatsApp</);
});

test("license key di-escape sebelum masuk HTML", () => {
  const html = email.buildEmailHtml('NXP-<script>&"');
  assert.doesNotMatch(html, /<script>/i);
  assert.match(html, /NXP-&lt;script&gt;&amp;&quot;/);
});

test("subject default menjelaskan isi email", () => {
  assert.equal(email.DEFAULT_SUBJECT, "License Key NexaPlay Anda");
});

test("tombol WhatsApp memakai nomor internasional", () => {
  const html = email.buildEmailHtml("NXP-TEST");
  assert.match(html, /https:\/\/wa\.me\/6281511181559/);
  assert.doesNotMatch(html, /https:\/\/wa\.me\/081511181559/);
});
