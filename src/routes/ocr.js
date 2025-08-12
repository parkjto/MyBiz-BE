const express = require('express');
const router = express.Router();
const { uploadOcrImages } = require('../middlewares/ocrUploadMiddleware');
const ocrErrorMiddleware = require('../middlewares/ocrErrorMiddleware');
const ocrController = require('../controllers/ocrController');

// POST /api/ocr/reviews
router.post('/reviews', uploadOcrImages, (req, res, next) => ocrController.processReviewImages(req, res, next), ocrErrorMiddleware);

// GET /api/ocr/reviews/:id (optional: stub)
router.get('/reviews/:id', (req, res) => ocrController.getResultById(req, res));

module.exports = router;


