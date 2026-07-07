const pool = require('../config/dbConnection');

const abonosService = {
  async getByPrestamo(prestamo_id) {
    const result = await pool.query(
      'SELECT * FROM abonos WHERE prestamo_id = $1 ORDER BY fecha DESC, id DESC',
      [prestamo_id]
    );
    return result.rows;
  },

  async create({ prestamo_id, monto, nota, fecha }) {
    const p = await pool.query('SELECT id, estado FROM prestamos WHERE id = $1', [prestamo_id]);
    if (!p.rows.length) return { code: 404, message: 'Préstamo no encontrado' };
    if (p.rows[0].estado !== 'activo') return { code: 400, message: 'Solo se pueden abonar a préstamos activos' };

    const result = await pool.query(
      `INSERT INTO abonos (prestamo_id, monto, nota, fecha) VALUES ($1, $2, $3, $4) RETURNING *`,
      [prestamo_id, monto, nota || null, fecha || new Date().toISOString().split('T')[0]]
    );
    return result.rows[0];
  },

  async delete(id) {
    const result = await pool.query('DELETE FROM abonos WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return { code: 404, message: 'Abono no encontrado' };
    return { success: true };
  },
};

module.exports = abonosService;
