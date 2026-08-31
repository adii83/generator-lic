import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const emailState = {
  sends: [],
  resendApiKeys: [],
  resendResult: { data: { id: "email-id" }, error: null },
};

async function loadEmailModule() {
  const source = await readFile(new URL("../api/email.js", import.meta.url), "utf8");
  const context = vm.createContext({ process });
  const module = new vm.SourceTextModule(source, { context });

  await module.link(async (specifier) => {
    if (specifier === "resend") {
      return new vm.SyntheticModule(["Resend"], function () {
        this.setExport("Resend", class {
          constructor(apiKey) {
            emailState.resendApiKeys.push(apiKey);
            this.emails = {
              send: async (payload) => {
                emailState.sends.push({ provider: "resend", payload });
                return emailState.resendResult;
              },
            };
          }
        });
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

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
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

test("handler mengirim lewat Resend dengan sender dan Reply-To resmi", async () => {
  process.env.RESEND_API_KEY = "re_test";
  emailState.sends.length = 0;
  emailState.resendApiKeys.length = 0;
  emailState.resendResult = { data: { id: "email-id" }, error: null };
  const res = createResponse();

  await email.default({
    method: "POST",
    body: { to: "customer@example.com", license_key: "NXP-TEST" },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(emailState.resendApiKeys.at(-1), "re_test");
  assert.equal(emailState.sends.length, 1);
  assert.equal(emailState.sends[0].provider, "resend");
  assert.equal(emailState.sends[0].payload.from, "NexaPlay <order@nexaplayid.store>");
  assert.equal(emailState.sends[0].payload.to.length, 1);
  assert.equal(emailState.sends[0].payload.to[0], "customer@example.com");
  assert.equal(emailState.sends[0].payload.replyTo, "nexaplayid@gmail.com");
  assert.equal(emailState.sends[0].payload.subject, "License Key NexaPlay Anda");
  assert.match(emailState.sends[0].payload.text, /NXP-TEST/);
  assert.match(emailState.sends[0].payload.html, /NXP-TEST/);
});

test("handler menolak alamat email tidak valid sebelum memanggil Resend", async () => {
  process.env.RESEND_API_KEY = "re_test";
  emailState.sends.length = 0;
  const res = createResponse();

  await email.default({
    method: "POST",
    body: { to: "bukan-email", license_key: "NXP-TEST" },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Invalid recipient email");
  assert.equal(emailState.sends.length, 0);
});

test("handler menolak alamat email terlalu panjang sebelum memanggil Resend", async () => {
  process.env.RESEND_API_KEY = "re_test";
  emailState.sends.length = 0;
  const res = createResponse();

  await email.default({
    method: "POST",
    body: { to: `${"a".repeat(250)}@example.com`, license_key: "NXP-TEST" },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Invalid recipient email");
  assert.equal(emailState.sends.length, 0);
});

test("handler menolak license key non-string sebelum memanggil Resend", async () => {
  process.env.RESEND_API_KEY = "re_test";
  emailState.sends.length = 0;
  const res = createResponse();

  await email.default({
    method: "POST",
    body: { to: "customer@example.com", license_key: { value: "NXP-TEST" } },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Invalid license_key");
  assert.equal(emailState.sends.length, 0);
});

test("handler meneruskan kegagalan Resend sebagai bad gateway", async () => {
  process.env.RESEND_API_KEY = "re_test";
  emailState.resendResult = {
    data: null,
    error: { name: "validation_error", message: "Domain is not verified" },
  };
  const res = createResponse();

  await email.default({
    method: "POST",
    body: { to: "customer@example.com", license_key: "NXP-TEST" },
  }, res);

  assert.equal(res.statusCode, 502);
  assert.equal(res.body.error, "Domain is not verified");
});
