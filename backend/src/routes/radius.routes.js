const express = require('express');
const ctrl = require('../controllers/radius.controller');
const { requireRadiusSecret } = require('../middleware/radiusAuth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/authorize', requireRadiusSecret, asyncHandler(ctrl.authorize));
router.post('/accounting', requireRadiusSecret, asyncHandler(ctrl.accounting));

module.exports = router;
