import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { listStores, getStore, createStore, updateStore, deleteStore } from '../controllers/storesController.js';

const router = express.Router();

/**
 * @openapi
 * /api/stores:
 *   get:
 *     summary: 매장 목록 조회
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 매장 목록
 */
router.get('/', protect, listStores);

/**
 * @openapi
 * /api/stores/{id}:
 *   get:
 *     summary: 매장 상세 조회
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 매장 상세
 */
router.get('/:id', protect, getStore);

/**
 * @openapi
 * /api/stores:
 *   post:
 *     summary: 매장 생성
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: 생성된 매장
 */
router.post('/', protect, createStore);

/**
 * @openapi
 * /api/stores/{id}:
 *   patch:
 *     summary: 매장 수정
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: 수정된 매장
 */
router.patch('/:id', protect, updateStore);

/**
 * @openapi
 * /api/stores/{id}:
 *   delete:
 *     summary: 매장 삭제
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 삭제 결과
 */
router.delete('/:id', protect, deleteStore);

export default router;

