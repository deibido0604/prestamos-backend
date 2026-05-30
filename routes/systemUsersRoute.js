const express = require('express');
const systemUserController = require('../controllers/systemUserController');

const router = express.Router();

router.get('/', systemUserController.getAllSystemUsers);
router.post('/create', systemUserController.createSystemUser);
router.post('/login', systemUserController.login);

module.exports = router;
