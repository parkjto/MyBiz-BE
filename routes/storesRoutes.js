import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { listStores, getStore, createStore, updateStore, deleteStore } from '../controllers/storesController.js';

const router = express.Router();

router.get('/', protect, listStores);
router.get('/:id', protect, getStore);
router.post('/', protect, createStore);
router.patch('/:id', protect, updateStore);
router.delete('/:id', protect, deleteStore);

export default router;

