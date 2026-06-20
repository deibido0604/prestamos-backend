const express = require('express');
const ctrl = require('../controllers/rolesController');

const router = express.Router();

// Rutas estáticas primero (antes de /:id)
router.get('/user/:userId', ctrl.getUserRoles);
router.post('/user/:userId', ctrl.assignToUser);

router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.delete);

module.exports = router;
