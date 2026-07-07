const svc = require('../services/abonosService');

const ok  = (res, data) => res.json({ success: true, data });
const err = (res, e, code = 500) => res.status(code).json({ success: false, message: e?.message || e });

exports.getByPrestamo = async (req, res) => {
  try { ok(res, await svc.getByPrestamo(req.params.prestamoId)); } catch (e) { err(res, e); }
};

exports.create = async (req, res) => {
  try {
    const { prestamo_id, monto, nota, fecha } = req.body;
    if (!prestamo_id || !monto) return err(res, 'prestamo_id y monto son requeridos', 400);
    const result = await svc.create({ prestamo_id, monto, nota, fecha });
    if (result.code) return err(res, result.message, result.code);
    ok(res, result);
  } catch (e) { err(res, e); }
};

exports.delete = async (req, res) => {
  try {
    const result = await svc.delete(req.params.id);
    if (result.code) return err(res, result.message, result.code);
    ok(res, result);
  } catch (e) { err(res, e); }
};
