import { Router } from 'express';
import { auth } from '../middleware/auth';
import { createMovement, getMovements } from '../controllers/inventoryMovement.controller';

const router = Router();

router.post('/', auth, createMovement);
router.get('/', auth, getMovements);

export default router; 