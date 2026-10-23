const express = require('express');
const router = express.Router();
const { seedScenario } = require('../controllers/demoSeedController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/seed', seedScenario);

module.exports = router;
