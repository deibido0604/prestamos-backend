const express = require('express');
const systemUserController = require('../controllers/systemUserController');

const router = express.Router();

router.get('/', systemUserController.getAllSystemUsers);
router.post('/create', systemUserController.createSystemUser);
router.post('/login', systemUserController.login);
router.put('/:id', systemUserController.updateSystemUser);
router.delete('/:id', systemUserController.deleteSystemUser);

// Reset de contraseña
router.post('/reset-token/:id', systemUserController.generateResetToken);
router.get('/reset-validate/:token', systemUserController.validateResetToken);
router.post('/reset-password/:token', systemUserController.resetPassword);

module.exports = router;
