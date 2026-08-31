import nodemailer from "nodemailer";
import { requireAdmin } from "./_auth.js";

export const DEFAULT_SUBJECT = "License Key NexaPlay Anda";
const DEFAULT_FROM = "NexaPlay ID <nexaplayid@gmail.com>";
const DOWNLOAD_LINK =
  "https://drive.google.com/file/d/18gwritxgx4QfrU4rmZ1OlOtER6UivAxZ/view?usp=drive_link";
const TUTORIAL_LINK = "https://youtu.be/n76abNihokg";
const DISCORD_CHANNEL = "https://discord.gg/PjYYT6hV";
const SUPPORT_SHOPEE = "Chat Toko NexaPlay di Shopee";
const SUPPORT_WHATSAPP = "0815-1118-1559";

function assertEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} env`);
  return value;
}

function createTransporter() {
  const host = assertEnv("SMTP_HOST");
  const portValue = process.env.SMTP_PORT || "465";
  const port = Number(portValue);
  const secure = port === 465;
  const user = assertEnv("SMTP_USER");
  const pass = assertEnv("SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildEmailText(licenseKey) {
  return [
    "Terima kasih telah berbelanja di NexaPlay! 🎉",
    "Kami sangat menghargai kepercayaan Anda.",
    "",
    "🔑 LICENSE KEY",
    licenseKey,
    "",
    "Simpan license key ini. Jangan bagikan kepada orang lain.",
    "",
    "🔗 DOWNLOAD NEXAPLAY",
    DOWNLOAD_LINK,
    "",
    "🎬 TUTORIAL PENGGUNAAN",
    TUTORIAL_LINK,
    "Tonton tutorial sampai selesai sebelum instalasi dan penggunaan.",
    "",
    "💬 INFO UPDATE TERBARU",
    `Discord: ${DISCORD_CHANNEL}`,
    "",
    "📌 PENTING",
    "Ikuti tutorial hingga tuntas agar proses instalasi dan penggunaan berjalan lancar.",
    "",
    "🛟 BUTUH BANTUAN?",
    SUPPORT_SHOPEE,
    `WhatsApp Admin: ${SUPPORT_WHATSAPP} (Fast Response)`,
    "",
    "Semoga pengalaman gaming Anda bersama NexaPlay makin menyenangkan! 🕹️",
    "",
    "Salam hangat,",
    "Tim NexaPlay",
    "Game Your Way",
  ].join("\n");
}

export function buildEmailHtml(licenseKey) {
  const safeLicenseKey = escapeHtml(licenseKey);
  const waLink = `https://wa.me/62${SUPPORT_WHATSAPP.replace(/[^0-9]/g, "").replace(/^0/, "")}`;
  const button = (label, url, color) =>
    `<a href="${url}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;line-height:20px;padding:12px 18px;border-radius:10px;">${label}</a>`;

  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>NexaPlay</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 22px;background:#111827;color:#ffffff;">
                <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#a78bfa;text-transform:uppercase;">NexaPlay</div>
                <h1 style="margin:8px 0 6px;font-size:24px;line-height:32px;">Pesanan Anda siap 🎉</h1>
                <p style="margin:0;color:#d1d5db;font-size:14px;line-height:22px;">Terima kasih telah berbelanja di NexaPlay.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 18px;font-size:15px;line-height:24px;color:#374151;">Berikut license key dan panduan untuk mulai menggunakan NexaPlay.</p>

                <div style="margin:0 0 24px;padding:18px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;text-align:center;">
                  <div style="margin-bottom:8px;font-size:12px;font-weight:700;letter-spacing:1px;color:#6d28d9;">🔑 LICENSE KEY</div>
                  <div style="font-family:Consolas,Monaco,monospace;font-size:20px;font-weight:700;line-height:28px;letter-spacing:1px;color:#111827;word-break:break-all;">${safeLicenseKey}</div>
                  <div style="margin-top:8px;font-size:12px;line-height:18px;color:#6b7280;">Simpan key ini dan jangan bagikan kepada orang lain.</div>
                </div>

                <h2 style="margin:0 0 10px;font-size:17px;line-height:24px;color:#111827;">🔗 Download aplikasi</h2>
                <p style="margin:0 0 12px;font-size:14px;line-height:22px;color:#4b5563;">Unduh aplikasi NexaPlay melalui tombol berikut.</p>
                <div style="margin:0 0 24px;">${button("Download NexaPlay", DOWNLOAD_LINK, "#7c3aed")}</div>

                <h2 style="margin:0 0 10px;font-size:17px;line-height:24px;color:#111827;">🎬 Tutorial penggunaan</h2>
                <p style="margin:0 0 12px;font-size:14px;line-height:22px;color:#4b5563;">Tonton tutorial sampai selesai agar instalasi dan penggunaan berjalan lancar.</p>
                <div style="margin:0 0 24px;">${button("Lihat Tutorial", TUTORIAL_LINK, "#2563eb")}</div>

                <h2 style="margin:0 0 10px;font-size:17px;line-height:24px;color:#111827;">💬 Info update terbaru</h2>
                <p style="margin:0 0 12px;font-size:14px;line-height:22px;color:#4b5563;">Gabung ke saluran Discord NexaPlay untuk menerima informasi terbaru.</p>
                <div style="margin:0 0 24px;">${button("Gabung Discord", DISCORD_CHANNEL, "#4f46e5")}</div>

                <div style="margin:0 0 24px;padding:16px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;">
                  <div style="margin-bottom:6px;font-size:14px;font-weight:700;color:#92400e;">📌 Penting</div>
                  <p style="margin:0;font-size:13px;line-height:21px;color:#78350f;">Ikuti tutorial hingga tuntas sebelum instalasi dan penggunaan untuk menghindari kendala.</p>
                </div>

                <h2 style="margin:0 0 10px;font-size:17px;line-height:24px;color:#111827;">🛟 Butuh bantuan?</h2>
                <p style="margin:0 0 6px;font-size:14px;line-height:22px;color:#4b5563;">${SUPPORT_SHOPEE}</p>
                <p style="margin:0 0 12px;font-size:14px;line-height:22px;color:#4b5563;">WhatsApp Admin: <strong>${SUPPORT_WHATSAPP}</strong> (Fast Response)</p>
                <div style="margin:0 0 26px;">${button("Hubungi WhatsApp", waLink, "#059669")}</div>

                <p style="margin:0 0 18px;font-size:14px;line-height:22px;color:#374151;">Semoga pengalaman gaming Anda bersama NexaPlay makin menyenangkan! 🕹️</p>
                <p style="margin:0;font-size:14px;line-height:22px;color:#374151;">Salam hangat,<br /><strong>Tim NexaPlay</strong><br /><span style="color:#7c3aed;">Game Your Way</span></p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;line-height:18px;color:#9ca3af;">
                Email ini dikirim terkait pembelian lisensi NexaPlay Anda.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export default async function handler(req, res) {
  try {
    requireAdmin(req);
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { to, license_key } = req.body || {};
    if (!to || !license_key) {
      return res.status(400).json({ error: "Missing to / license_key" });
    }

    const transporter = createTransporter();
    await transporter.verify();

    const text = buildEmailText(license_key);
    const html = buildEmailHtml(license_key);
    const subject = process.env.SMTP_SUBJECT || DEFAULT_SUBJECT;
    const from = process.env.SMTP_FROM || DEFAULT_FROM;

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ error: e.message || String(e) });
  }
}
