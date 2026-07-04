const express = require('express');
const ctrl = require('../controllers/payment.controller');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/initiate', asyncHandler(ctrl.initiate));
router.get('/:transactionId/status', asyncHandler(ctrl.status));
router.post('/mpesa/callback', asyncHandler(ctrl.mpesaCallback));

module.exports = router;
