const pool = require('../config/dbConnection');

exports.getAll = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM alertas ORDER BY id');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  const { nombre, evento, destinatarios, activo, plantilla, frecuencia } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO alertas (nombre, evento, destinatarios, activo, plantilla, frecuencia)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nombre, evento, destinatarios, activo !== undefined ? activo : true, plantilla, frecuencia || 'diaria']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { nombre, evento, destinatarios, activo, plantilla, frecuencia } = req.body;
  try {
    const result = await pool.query(
      `UPDATE alertas SET nombre=$1, evento=$2, destinatarios=$3, activo=$4, plantilla=$5, frecuencia=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [nombre, evento, destinatarios, activo, plantilla, frecuencia, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Alerta no encontrada' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleActivo = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;
  try {
    const result = await pool.query(
      `UPDATE alertas SET activo=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [activo, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Alerta no encontrada' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM alertas WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendTest = async (req, res) => {
  const { email, evento } = req.body;
  try {
    const { sendEmail } = require('../services/emailService');
    
    const subject = `Alerta de Prueba - Evento: ${evento}`;
    const html = `
      <h2>Alerta de Prueba</h2>
      <p>Este es un correo de prueba del sistema de alertas.</p>
      <p><strong>Evento:</strong> ${evento}</p>
      <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
    `;
    
    await sendEmail(email, subject, html);
    console.log(`📧 Correo de prueba ENVIADO a ${email} (evento: ${evento})`);
    res.json({ success: true, message: 'Correo de prueba enviado exitosamente' });
  } catch (error) {
    console.error('Error enviando correo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};