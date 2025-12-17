import nodemailer from "nodemailer";
import { requireAdmin } from "./_auth.js";

const DEFAULT_SUBJECT = "GameHub";
const DOWNLOAD_LINK = "https://drive.google.com/drive/folders/1gtKMZ-BgAIBhJKbiRMPWDFPlVKOEB9Jb?usp=drive_link";
const TUTORIAL_LINK = "https://youtu.be/9ODcICeD9ow";
const SUPPORT_SHOPEE = "Chat Toko GameHub di Shopee";
const SUPPORT_WHATSAPP = "0823-2602-6944";

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

function buildEmailBody(licenseKey) {
  return `Terima kasih telah berbelanja di GameHub! 🎉\nKami sangat menghargai kepercayaan yang Anda berikan.\n\nLISENSI KEY :\n${licenseKey}\n\nSebagai bagian dari pembelian Anda, berikut adalah akses dan panduan penting untuk memulai:\n\n🔗 Link Download Aplikasi GameHub:\n${DOWNLOAD_LINK}\n(Silakan klik tautan di atas untuk mengunduh aplikasi)\n\n🎬 Link Tutorial Penggunaan GameHub:\n${TUTORIAL_LINK}\n(Tonton panduan ini sampai selesai untuk memastikan proses instalasi dan penggunaan berjalan lancar tanpa kendala)\n\n📌 Penting:\nUntuk pengalaman terbaik dan menghindari masalah, kami sangat menyarankan Anda untuk menonton tutorial tersebut hingga tuntas sebelum memulai instalasi dan penggunaan.\n\n💬 Butuh Bantuan?\nJika ada pertanyaan atau menemui kendala setelah menonton tutorial, jangan ragu untuk hubungi tim dukungan kami melalui:\n\n💬 ${SUPPORT_SHOPEE}\n\n📞 WhatsApp Admin: ${SUPPORT_WHATSAPP} (Fast Respon)\n\nKami berharap Anda menikmati pengalaman gaming yang lebih menyenangkan dengan GameHub! 🕹️\n\nSalam hangat,\nTim GameHub\nGame Your Way`;
}

function toHtml(text) {
  return text
    .split("\n")
    .map((line) => line || "&nbsp;")
    .map((line) => `<p>${line}</p>`)
    .join("\n");
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

    const text = buildEmailBody(license_key);
    const html = toHtml(text);
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
