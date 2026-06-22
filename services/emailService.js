const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      console.warn('⚠️  GMAIL_USER o GMAIL_APP_PASSWORD no configurados');
      return null;
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    console.log('✅ Nodemailer Gmail inicializado');
  }
  return transporter;
};

const sendEmail = async (to, subject, html) => {
  const transport = getTransporter();
  if (!transport) throw new Error('Email service no configurado');

  const forceTest = process.env.FORCE_TEST_EMAIL === 'true';
  const recipient = forceTest ? (process.env.TEST_EMAIL || to) : to;
  const from = `Sistema Préstamos <${process.env.GMAIL_USER}>`;

  const info = await transport.sendMail({ from, to: recipient, subject, html });
  console.log(`✅ Email enviado a ${recipient} (ID: ${info.messageId})`);
  if (forceTest && recipient !== to) console.log(`   (Original: ${to})`);
  return info;
};

module.exports = { sendEmail };
