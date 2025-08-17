import { Router } from 'express'
import { aiAnalyze } from '../controllers/aiAnalysisController.js'

const router = Router()

router.post('/', aiAnalyze)

export default router
