const pool = require('../config/dbConnection');

const prestamosService = {
  async getAll({ clienteId, estado } = {}) {
    let where = [];
    const params = [];
    if (clienteId) { params.push(clienteId); where.push(`p.cliente_id = $${params.length}`); }
    if (estado)    { params.push(estado);    where.push(`p.estado = $${params.length}`); }
    const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT p.*,
        c.nombrecompleto AS cliente_nombre,
        COALESCE((SELECT SUM(a.monto) FROM abonos a WHERE a.prestamo_id = p.id), 0) AS total_abonado
      FROM prestamos p
      JOIN clients c ON c.id = p.cliente_id
      ${whereStr}
      ORDER BY p.created_at DESC
    `, params);
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query(`
      SELECT p.*,
        c.nombrecompleto AS cliente_nombre,
        COALESCE((SELECT SUM(a.monto) FROM abonos a WHERE a.prestamo_id = p.id), 0) AS total_abonado
      FROM prestamos p
      JOIN clients c ON c.id = p.cliente_id
      WHERE p.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async create({ cliente_id, monto, tasa_interes, concepto, fecha_inicio, frecuencia = 'mensual' }) {
    const plazo = 3;
    const montoNum       = Number(monto);
    const tasaInteresNum = Number(tasa_interes);
    const interes_total  = parseFloat((montoNum * (tasaInteresNum / 100) * plazo).toFixed(2));
    const total_pagar    = parseFloat((montoNum + interes_total).toFixed(2));
    const cuota_mensual  = parseFloat((total_pagar / plazo).toFixed(2));

    const inicio = new Date(fecha_inicio);
    const vencimiento = new Date(inicio);
    vencimiento.setMonth(vencimiento.getMonth() + plazo);

    const result = await pool.query(`
      INSERT INTO prestamos
        (cliente_id, monto, tasa_interes, plazo_meses, interes_total, total_pagar, cuota_mensual, concepto, estado, fecha_inicio, fecha_vencimiento)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'activo',$9,$10)
      RETURNING *
    `, [cliente_id, montoNum, tasaInteresNum, plazo, interes_total, total_pagar, cuota_mensual, concepto || null,
        inicio.toISOString().split('T')[0], vencimiento.toISOString().split('T')[0]]);

    const prestamo = result.rows[0];

    const fechas = this._calcularFechasAlertas(fecha_inicio, frecuencia, plazo);
    for (let i = 0; i < fechas.length; i++) {
      const f = fechas[i];
      const cuotaNum = i + 1;
      const totalCuotas = fechas.length;
      const eventoCuota = `Cuota ${cuotaNum} de ${totalCuotas}`;
      const nombre = `Pago de ${eventoCuota} - Préstamo #${prestamo.id}`;
      const evento = 'pago_cuota';
      const plantilla = `Recordatorio de pago a {{cliente}}: Cuota ${cuotaNum} de ${totalCuotas} con vencimiento el {{fecha}}.`;
      await pool.query(`
        INSERT INTO alertas (nombre, evento, destinatarios, activo, plantilla, prestamo_id, fecha, cuota, total_cuotas, leido)
        VALUES ($1, $2, $3::text[], TRUE, $4, $5, $6::date, $7, $8, FALSE)
      `, [nombre, evento, [], plantilla, prestamo.id, f, cuotaNum, totalCuotas]);
    }

    return prestamo;
  },

  _calcularFechasAlertas(fechaInicio, frecuencia, plazoMeses) {
    if (!fechaInicio) return [];
    const inicio = new Date(fechaInicio);
    // Cantidad de alertas según la frecuencia
    let total;
    switch ((frecuencia || 'mensual').toLowerCase()) {
      case 'semanal':     total = plazoMeses * 4;  break;
      case 'quincenal':   total = plazoMeses * 2;  break;
      case 'mensual':
      default:            total = plazoMeses;     break;
    }
    // Incremento en días según la frecuencia
    let incDias;
    switch ((frecuencia || 'mensual').toLowerCase()) {
      case 'semanal':     incDias = 7;    break;
      case 'quincenal':   incDias = 15;   break;
      case 'mensual':
      default:            incDias = 30;   break;
    }
    const fechas = [];
    for (let i = 0; i < total; i++) {
      const d = new Date(inicio);
      d.setDate(d.getDate() + (incDias * (i + 1)));
      fechas.push(d.toISOString().split('T')[0]);
    }
    return fechas;
  },

  async update(id, { concepto, estado }) {
    const result = await pool.query(`
      UPDATE prestamos SET
        concepto  = COALESCE($1, concepto),
        estado    = COALESCE($2, estado),
        updated_at = NOW()
      WHERE id = $3 RETURNING *
    `, [concepto ?? null, estado ?? null, id]);
    if (!result.rows.length) return { code: 404, message: 'Préstamo no encontrado' };
    return result.rows[0];
  },

  async delete(id) {
    const result = await pool.query('DELETE FROM prestamos WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return { code: 404, message: 'Préstamo no encontrado' };
    return { success: true };
  },

  // Renovar: cierra el préstamo actual y crea uno nuevo referenciando al anterior
  async renovar(id, { tasa_interes, concepto, fecha_inicio }) {
    const original = await this.getById(id);
    if (!original) return { code: 404, message: 'Préstamo no encontrado' };
    if (original.estado === 'renovado') return { code: 400, message: 'El préstamo ya fue renovado' };

    await pool.query(`UPDATE prestamos SET estado = 'renovado', updated_at = NOW() WHERE id = $1`, [id]);

    const nuevo = await this.create({
      cliente_id: original.cliente_id,
      monto: original.monto,
      tasa_interes: tasa_interes ?? original.tasa_interes,
      concepto: concepto ?? original.concepto,
      fecha_inicio: fecha_inicio ?? new Date().toISOString().split('T')[0],
    });

    // Vincular renovacion_de
    await pool.query(`UPDATE prestamos SET renovacion_de = $1 WHERE id = $2`, [id, nuevo.id]);
    nuevo.renovacion_de = id;

    return nuevo;
  },
};

module.exports = prestamosService;
