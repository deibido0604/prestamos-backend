const express = require('express');
const router = express.Router();
const clientsController = require('../controllers/clientsController');

router.get('/list', clientsController.getAll);
router.get('/:id', clientsController.getById);
router.post('/', clientsController.create);
router.put('/:id', clientsController.update);
router.delete('/:id', clientsController.remove);

module.exports = router;