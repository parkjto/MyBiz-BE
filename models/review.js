// 리뷰 모델 예시 (MongoDB)
const mongoose = require('mongoose');
const reviewSchema = new mongoose.Schema({
  content: String,
  sentiment: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
module.exports = mongoose.model('Review', reviewSchema);
