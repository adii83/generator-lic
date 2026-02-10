import nodemailer from "nodemailer";
import { requireAdmin } from "./_auth.js";

const DEFAULT_SUBJECT = "GameHub";
const DOWNLOAD_LINK = "https://drive.google.com/drive/folders/1gtKMZ-BgAIBhJKbiRMPWDFPlVKOEB9Jb?usp=drive_link";
const TUTORIAL_LINK = "https://youtu.be/9ODcICeD9ow";
const SUPPORT_SHOPEE = "Chat Toko GameHub di Shopee";
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

function buildEmailText(licenseKey) {
  return [
    "Terima kasih telah berbelanja di GameHub! 🎉",
    "Kami sangat menghargai kepercayaan yang Anda berikan.",
    "",
    "LISENSI KEY :",
    licenseKey,
    "",
    "Sebagai bagian dari pembelian Anda, berikut akses dan panduan penting untuk memulai:",
    "",
    "🔗 Link Download Aplikasi GameHub:",
    DOWNLOAD_LINK,
    "(Silakan klik tautan di atas untuk mengunduh aplikasi)",
    "",
    "🎬 Link Tutorial Penggunaan GameHub:",
    TUTORIAL_LINK,
    "(Tonton panduan ini sampai selesai untuk memastikan proses instalasi dan penggunaan berjalan lancar tanpa kendala)",
    "",
    "📌 Penting:",
    "Untuk pengalaman terbaik dan menghindari masalah, kami menyarankan Anda menonton tutorial tersebut hingga tuntas sebelum instalasi dan penggunaan.",
    "",
    "💬 Butuh Bantuan?",
    "Jika ada pertanyaan atau menemui kendala setelah menonton tutorial, hubungi tim dukungan kami melalui:",
    `💬 ${SUPPORT_SHOPEE}`,
    `📞 WhatsApp Admin: ${SUPPORT_WHATSAPP} (Fast Respon)`,
    "",
    "Kami berharap Anda menikmati pengalaman gaming yang lebih menyenangkan dengan GameHub! 🕹️",
    "",
    "Salam hangat,",
    "Tim GameHub",
    "Game Your Way",
  ].join("\n");
}

function buildEmailHtml(licenseKey) {
  const p = (content) =>
    `<p style="margin:6px 0;line-height:1.5;font-size:14px;">${content}</p>`;
  const link = (url, color = "#6366f1") =>
    `<a href="${url}" style="color:${color};text-decoration:none;">${url}</a>`;
  const waLink = `https://wa.me/${SUPPORT_WHATSAPP.replace(/[^0-9]/g, "")}`;

  return [
    p("Terima kasih telah berbelanja di GameHub! 🎉"),
    p("Kami sangat menghargai kepercayaan yang Anda berikan."),
    `<p style="margin:8px 0;line-height:1.5;font-size:15px;"><strong>LISENSI KEY :</strong><br/><span style="font-size:20px;font-weight:700;letter-spacing:1px;">${licenseKey}</span></p>`,
    p(
      "Sebagai bagian dari pembelian Anda, berikut akses dan panduan penting untuk memulai:"
    ),
    `<p style="margin:8px 0;line-height:1.5;font-size:14px;">🔗 Link Download Aplikasi GameHub:<br/>${link(
      DOWNLOAD_LINK
    )}</p>`,
    p("(Silakan klik tautan di atas untuk mengunduh aplikasi)"),
    `<p style="margin:8px 0;line-height:1.5;font-size:14px;">🎬 Link Tutorial Penggunaan GameHub:<br/>${link(
      TUTORIAL_LINK
    )}</p>`,
    p(
      "(Tonton panduan ini sampai selesai untuk memastikan proses instalasi dan penggunaan berjalan lancar tanpa kendala)"
    ),
    p("📌 Penting:"),
    p(
      "Untuk pengalaman terbaik dan menghindari masalah, kami menyarankan Anda menonton tutorial tersebut hingga tuntas sebelum instalasi dan penggunaan."
    ),
    p("💬 Butuh Bantuan?"),
    p("Jika ada pertanyaan atau menemui kendala setelah menonton tutorial, hubungi tim dukungan kami melalui:"),
    p(`💬 ${SUPPORT_SHOPEE}`),
    `<p style="margin:6px 0;line-height:1.5;font-size:14px;">📞 WhatsApp Admin: <a href="${waLink}" style="color:#10b981;text-decoration:none;">${SUPPORT_WHATSAPP}</a> (Fast Respon)</p>`,
    p("Kami berharap Anda menikmati pengalaman gaming yang lebih menyenangkan dengan GameHub! 🕹️"),
    p("Salam hangat,"),
    p("Tim GameHub"),
    p("Game Your Way"),
  ].join("");
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
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

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
