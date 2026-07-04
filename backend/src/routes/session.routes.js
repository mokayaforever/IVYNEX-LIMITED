const express = require('express');
const ctrl = require('../controllers/session.controller');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/check', asyncHandler(ctrl.check));
router.get('/', asyncHandler(ctrl.list));

module.exports = router;
