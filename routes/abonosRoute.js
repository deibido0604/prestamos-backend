const express = require('express');
const ctrl = require('../controllers/abonosController');
const router = express.Router();

router.get('/prestamo/:prestamoId', ctrl.getByPrestamo);
router.post('/',        ctrl.create);
router.delete('/:id',   ctrl.delete);

module.exports = router;
