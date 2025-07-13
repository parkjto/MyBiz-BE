// 매출 모델 예시 (MongoDB)
const mongoose = require('mongoose');
const salesSchema = new mongoose.Schema({
  amount: Number,
  date: Date,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
module.exports = mongoose.model('Sales', salesSchema);
