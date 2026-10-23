const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const {
  uploadAndProcessReceipt,
  confirmReceipt,
  getReceipts,
  getReceiptById
} = require('../controllers/receiptController');

router.use(protect);

router.post('/upload', upload.single('receipt'), uploadAndProcessReceipt);
router.post('/:id/confirm', confirmReceipt);
router.get('/', getReceipts);
router.get('/:id', getReceiptById);

module.exports = router;
