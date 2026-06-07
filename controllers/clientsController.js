const clientsService = require('../services/clientsService');

exports.getAll = async (req, res) => {
  try {
    const clients = await clientsService.getAll();
    res.json({ success: true, data: clients });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const client = await clientsService.getById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    res.json({ success: true, data: client });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const newClient = await clientsService.create(req.body);
    res.json({ success: true, data: newClient });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') { // Violación de unicidad (cédula duplicada)
      return res.status(400).json({ success: false, message: 'Ya existe un cliente con esa cédula' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await clientsService.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await clientsService.remove(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};