const pool = require('../config/dbConnection');

exports.getAll = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients ORDER BY id DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (!result.rows || result.rows.length === 0) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  const {
    nombreCompleto,
    cedula,
    correo,
    telefono,
    telefonoSecundario,
    direccion,
    profesion,
    lugarTrabajo,
    antiguedad,
    referencias,
    estado,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO clients (nombrecompleto, cedula, correo, telefono, telefonosecundario, direccion, profesion, lugartrabajo, antiguedad, referencias, estado, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW()) RETURNING *`,
      [
        nombreCompleto,
        cedula,
        correo || null,
        telefono,
        telefonoSecundario || null,
        direccion,
        profesion || null,
        lugarTrabajo || null,
        antiguedad || null,
        referencias || null,
        estado || 'activo',
      ]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  try {
    // Build dynamic set clause
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = keys.map(k => fields[k] === '' ? null : fields[k]);
    values.push(id);

    const sql = `UPDATE clients SET ${sets}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`;
    const result = await pool.query(sql, values);
    if (!result.rows || result.rows.length === 0) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM clients WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};