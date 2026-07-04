const express = require('express');
const ctrl = require('../controllers/admin.controller');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/stats', asyncHandler(ctrl.stats));
router.get('/transactions', asyncHandler(ctrl.transactions));

module.exports = router;
