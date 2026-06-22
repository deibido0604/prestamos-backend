require('dotenv').config();
const { sendEmail } = require('./services/emailService');

async function test() {
  try {
    const result = await sendEmail(
      process.env.TEST_EMAIL,
      'Test - Sistema de Préstamos',
      '<h2>Prueba de correo</h2><p>Si ves esto, Resend funciona correctamente.</p>'
    );
    console.log('✅ Correo enviado:', result);
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
  process.exit(0);
}

test();
