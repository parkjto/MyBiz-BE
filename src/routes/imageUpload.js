const express = require('express');
const router = express.Router();
const imageUploadController = require('../controllers/imageUploadController');
const imageUploadService = require('../services/imageUploadService');

/**
 * @swagger
 * /api/upload/scroll-captures:
 *   post:
 *     summary: 스크롤 캡처 이미지 업로드
 *     description: 다중 이미지 파일을 업로드하여 스크롤 캡처 분석을 위한 데이터를 수집합니다.
 *     tags: [Image Upload]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: images
 *         type: file
 *         required: true
 *         description: 업로드할 이미지 파일들 (최대 10장, 각 10MB 이하)
 *     responses:
 *       200:
 *         description: 이미지 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 이미지 업로드가 완료되었습니다.
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadedFiles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           originalName:
 *                             type: string
 *                             example: screenshot1.jpg
 *                           savedName:
 *                             type: string
 *                             example: 1703123456789-uuid123.jpg
 *                           path:
 *                             type: string
 *                             example: ./uploads/scroll_captures/1703123456789-uuid123.jpg
 *                           size:
 *                             type: number
 *                             example: 1024000
 *                           mimetype:
 *                             type: string
 *                             example: image/jpeg
 *                           uploadDate:
 *                             type: string
 *                             example: 2023-12-21T10:30:56.789Z
 *                     totalCount:
 *                       type: number
 *                       example: 3
 *                     uploadDate:
 *                       type: string
 *                       example: 2023-12-21T10:30:56.789Z
 *       400:
 *         description: 잘못된 요청 (파일 없음, 잘못된 형식, 용량 초과)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: 최소 1장 이상의 이미지 파일이 필요합니다.
 *                 code:
 *                   type: string
 *                   example: NO_FILES_UPLOADED
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: 이미지 업로드 처리 중 오류가 발생했습니다.
 *                 code:
 *                   type: string
 *                   example: UPLOAD_PROCESSING_ERROR
 */
router.post('/scroll-captures', 
  imageUploadService.getUploadMiddleware(),
  imageUploadController.uploadScrollCaptures
);

/**
 * @swagger
 * /api/upload/scroll-captures:
 *   get:
 *     summary: 업로드된 이미지 목록 조회
 *     description: 현재까지 업로드된 모든 스크롤 캡처 이미지 목록을 조회합니다.
 *     tags: [Image Upload]
 *     responses:
 *       200:
 *         description: 이미지 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           filename:
 *                             type: string
 *                           path:
 *                             type: string
 *                           size:
 *                             type: number
 *                           uploadDate:
 *                             type: string
 *                     totalCount:
 *                       type: number
 */
router.get('/scroll-captures', imageUploadController.getUploadedImages);

/**
 * @swagger
 * /api/upload/scroll-captures/{filename}:
 *   delete:
 *     summary: 특정 이미지 삭제
 *     description: 지정된 파일명의 이미지를 삭제합니다.
 *     tags: [Image Upload]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: 삭제할 이미지 파일명
 *     responses:
 *       200:
 *         description: 이미지 삭제 성공
 *       404:
 *         description: 파일을 찾을 수 없음
 */
router.delete('/scroll-captures/:filename', imageUploadController.deleteImage);

/**
 * @swagger
 * /api/upload/scroll-captures/stats:
 *   get:
 *     summary: 업로드 통계 정보
 *     description: 업로드된 이미지들의 통계 정보를 조회합니다.
 *     tags: [Image Upload]
 *     responses:
 *       200:
 *         description: 통계 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalFiles:
 *                       type: number
 *                       example: 15
 *                     totalSize:
 *                       type: number
 *                       example: 52428800
 *                     totalSizeMB:
 *                       type: string
 *                       example: "50.00"
 *                     fileTypes:
 *                       type: object
 *                       example: {".jpg": 10, ".png": 5}
 *                     uploadDirectory:
 *                       type: string
 *                       example: "./uploads/scroll_captures"
 */
router.get('/scroll-captures/stats', imageUploadController.getUploadStats);

module.exports = router;
