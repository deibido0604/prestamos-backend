const svc = require('../services/prestamosService');

const ok  = (res, data) => res.json({ success: true, data });
const err = (res, e, code = 500) => res.status(code).json({ success: false, message: e?.message || e });

exports.getAll = async (req, res) => {
  try { ok(res, await svc.getAll(req.query)); } catch (e) { err(res, e); }
};

exports.getById = async (req, res) => {
  try {
    const data = await svc.getById(req.params.id);
    if (!data) return err(res, 'Préstamo no encontrado', 404);
    ok(res, data);
  } catch (e) { err(res, e); }
};

exports.create = async (req, res) => {
  try {
    const { cliente_id, monto, tasa_interes, concepto, fecha_inicio, frecuencia } = req.body;
    if (!cliente_id || !monto || !tasa_interes || !fecha_inicio)
      return err(res, 'cliente_id, monto, tasa_interes y fecha_inicio son requeridos', 400);
    ok(res, await svc.create({ cliente_id, monto, tasa_interes, concepto, fecha_inicio, frecuencia }));
  } catch (e) { err(res, e); }
};

exports.update = async (req, res) => {
  try {
    const result = await svc.update(req.params.id, req.body);
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

exports.renovar = async (req, res) => {
  try {
    const { tasa_interes, concepto, fecha_inicio, frecuencia } = req.body;
    const result = await svc.renovar(req.params.id, { tasa_interes, concepto, fecha_inicio, frecuencia });
    if (result.code) return err(res, result.message, result.code);
    ok(res, result);
  } catch (e) { err(res, e); }
};
