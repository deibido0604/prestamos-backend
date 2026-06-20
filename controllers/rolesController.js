const rolesService = require('../services/rolesService');

exports.getAll = async (req, res) => {
  try {
    const data = await rolesService.getAll();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await rolesService.getById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Rol no encontrado' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, type, permissions } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'El nombre es requerido' });
    const result = await rolesService.create({ name, type, permissions });
    if (result.code) return res.status(result.code).json({ success: false, message: result.message });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const result = await rolesService.update(req.params.id, req.body);
    if (result.code) return res.status(result.code).json({ success: false, message: result.message });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const result = await rolesService.delete(req.params.id);
    if (result.code) return res.status(result.code).json({ success: false, message: result.message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.assignToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleIds } = req.body;
    if (!Array.isArray(roleIds)) return res.status(400).json({ success: false, message: 'roleIds debe ser un array' });
    await rolesService.assignToUser(userId, roleIds);
    const roles = await rolesService.getUserRoles(userId);
    res.json({ success: true, data: roles });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getUserRoles = async (req, res) => {
  try {
    const data = await rolesService.getUserRoles(req.params.userId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
