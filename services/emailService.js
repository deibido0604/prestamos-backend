const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    const user = process.env.MAILTRAP_USER;
    const pass = process.env.MAILTRAP_PASS;
    
    console.log('🔍 DEBUG - Cargando Mailtrap:');
    console.log('   MAILTRAP_USER:', user ? '✅ CARGADO' : '❌ VACÍO');
    console.log('   MAILTRAP_PASS:', pass ? '✅ CARGADO' : '❌ VACÍO');
    
    if (!user || !pass) {
      console.warn('⚠️  MAILTRAP_USER o MAILTRAP_PASS no configurados');
      return null;
    }
    
    transporter = nodemailer.createTransport({
      host: 'sandbox.smtp.mailtrap.io',
      port: 2525,
      auth: { user, pass },
    });
    console.log('✅ Transporter creado exitosamente');
  }
  return transporter;
};

const sendEmail = async (to, subject, html) => {
  try {
    console.log('📧 Intentando enviar email a:', to);
    const transport = getTransporter();
    if (!transport) {
      throw new Error('Email service no configurado - variables MAILTRAP faltantes');
    }
    
    const info = await transport.sendMail({
      from: '"Sistema Préstamos" <noreply@prestamos.com>',
      to,
      subject,
      html,
    });
    console.log(`✅ Email REALMENTE enviado a ${to} (Message ID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error('❌ Error enviando email:', error.message);
    throw error;
  }
};

module.exports = { sendEmail };