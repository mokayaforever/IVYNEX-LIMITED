const express = require('express');
const ctrl = require('../controllers/package.controller');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(ctrl.listActive));
router.get('/all', asyncHandler(ctrl.listAll));
router.post('/', asyncHandler(ctrl.create));
router.patch('/:id', asyncHandler(ctrl.update));
router.delete('/:id', asyncHandler(ctrl.deactivate));

module.exports = router;
