const express = require('express');
const router = express.Router();
const {
  getBudget,
  setBudget,
  getBudgetHistory
} = require('../controllers/budgetController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/history', getBudgetHistory);

router.route('/')
  .get(getBudget)
  .post(setBudget);

module.exports = router;
