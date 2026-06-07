const clientsService = require('../services/clientsService');

exports.getAll = async (req, res) => {
  try {
    const rows = await clientsService.getAll();
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  const { id } = req.params;
  try {
    const row = await clientsService.getById(id);
    if (!row) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    res.json({ success: true, data: row });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const created = await clientsService.create(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await clientsService.update(id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    await clientsService.remove(id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};