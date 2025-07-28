import express from 'express';

import { stream_chat_messages } from '../controllers/chat/stream-chat-messages';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

router.post('/:uid',
  asyncHandler(stream_chat_messages)
);

export const chatRouter = router;
