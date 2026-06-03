const { Resend } = require('resend');

let resend = null;

const getResend = () => {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    
    console.log('🔍 DEBUG - Cargando Resend:');
    console.log('   RESEND_API_KEY:', apiKey ? '✅ CARGADO' : '❌ VACÍO');
    
    if (!apiKey) {
      console.warn('⚠️  RESEND_API_KEY no configurado');
      return null;
    }
    
    resend = new Resend(apiKey);
    console.log('✅ Resend inicializado exitosamente');
  }
  return resend;
};

const sendEmail = async (to, subject, html) => {
  try {
    console.log('📧 Intentando enviar email a:', to);
    const resendInstance = getResend();
    if (!resendInstance) {
      throw new Error('Email service no configurado - RESEND_API_KEY faltante');
    }

    // Si FORCE_TEST_EMAIL=true, fuerza el destinatario a TEST_EMAIL (útil para pruebas)
    const forceTest = process.env.FORCE_TEST_EMAIL === 'true';
    const testEmail = process.env.TEST_EMAIL || 'davidjared1104@gmail.com';
    const recipient = forceTest ? testEmail : to;

    const fromEmail = process.env.FROM_EMAIL || 'no-reply@prestamos.com';

    const result = await resendInstance.emails.send({
      from: `Sistema Préstamos <${fromEmail}>`,
      to: recipient,
      subject,
      html: `<p><strong>Para:</strong> ${recipient}</p>${html}`,
    });
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    console.log(`✅ Email enviado a ${recipient} (ID: ${result.data.id})`);
    if (forceTest) console.log(`   (Destinatario original era: ${to})`);
    return result.data;
  } catch (error) {
    console.error('❌ Error enviando email:', error.message);
    throw error;
  }
};

module.exports = { sendEmail };