const express = require('express');
const router = express.Router();
const {
  generateReport,
  getReportByMonth,
  getAllReports
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/generate', generateReport);
router.get('/', getAllReports);
router.get('/:month', getReportByMonth);

module.exports = router;
