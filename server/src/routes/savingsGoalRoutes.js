const express = require('express');
const router = express.Router();
const {
  getSavingsGoals,
  createSavingsGoal,
  addContribution,
  updateSavingsGoal,
  deleteSavingsGoal
} = require('../controllers/savingsGoalController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getSavingsGoals)
  .post(createSavingsGoal);

router.route('/:id')
  .put(updateSavingsGoal)
  .delete(deleteSavingsGoal);

router.post('/:id/contributions', addContribution);

module.exports = router;
