const permissionsService = require('../services/permissionsService');

exports.getAll = async (req, res) => {
  try {
    res.json({ success: true, data: await permissionsService.getAll() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await permissionsService.getById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Permiso no encontrado' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { resource, label, actions } = req.body;
    if (!resource || !label) return res.status(400).json({ success: false, message: 'resource y label son requeridos' });
    const result = await permissionsService.create({ resource, label, actions });
    if (result.code) return res.status(result.code).json({ success: false, message: result.message });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const result = await permissionsService.update(req.params.id, req.body);
    if (result.code) return res.status(result.code).json({ success: false, message: result.message });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const result = await permissionsService.delete(req.params.id);
    if (result.code) return res.status(result.code).json({ success: false, message: result.message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
