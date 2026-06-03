const express = require('express');
const router = express.Router();
const alertasController = require('../controllers/alertasController');

router.get('/', alertasController.getAll);
router.post('/', alertasController.create);
router.put('/:id', alertasController.update);
router.patch('/:id/toggle', alertasController.toggleActivo);
router.delete('/:id', alertasController.delete);
router.post('/test', alertasController.sendTest);

module.exports = router;