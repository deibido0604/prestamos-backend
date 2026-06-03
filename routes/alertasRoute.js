const express = require('express');
const router = express.Router();
const alertasController = require('../controllers/alertasController');

// Rutas específicas primero
router.post('/test', alertasController.sendTest);

// Rutas genéricas después
router.get('/', alertasController.getAll);
router.post('/', alertasController.create);
router.put('/:id', alertasController.update);
router.patch('/:id/toggle', alertasController.toggleActivo);
router.delete('/:id', alertasController.delete);

module.exports = router;