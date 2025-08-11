import express from 'express';

import { stream_chat_messages } from '../controllers/chat/stream-chat-messages';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate_user } from '../middleware/auth';

const router = express.Router();

router.post('/:id',
  authenticate_user,
  asyncHandler(stream_chat_messages)
);

export const chatRouter = router;
