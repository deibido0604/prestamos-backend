const pool = require('../config/dbConnection');

const mapRow = (r) => ({
  id: r.id,
  nombrecompleto: r.nombrecompleto,
  cedula: r.cedula,
  correo: r.correo,
  telefono: r.telefono,
  telefonosecundario: r.telefonosecundario,
  direccion: r.direccion,
  profesion: r.profesion,
  lugartrabajo: r.lugartrabajo,
  antiguedad: r.antiguedad,
  referencias: r.referencias,
  estado: r.estado,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

const getAll = async () => {
  const result = await pool.query('SELECT * FROM clients ORDER BY id DESC');
  return result.rows.map(mapRow);
};

const getById = async (id) => {
  const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
  if (!result.rows || result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
};

const create = async (payload) => {
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
  } = payload;

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

  return mapRow(result.rows[0]);
};

const update = async (id, fields) => {
  const keys = Object.keys(fields);
  if (keys.length === 0) return null;
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map(k => fields[k] === '' ? null : fields[k]);
  values.push(id);
  const sql = `UPDATE clients SET ${sets}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`;
  const result = await pool.query(sql, values);
  if (!result.rows || result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
};

const remove = async (id) => {
  await pool.query('DELETE FROM clients WHERE id = $1', [id]);
  return true;
};

module.exports = { getAll, getById, create, update, remove };