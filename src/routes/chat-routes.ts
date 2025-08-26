import express from 'express';

import { stream_chat_messages } from '../controllers/chat/stream-chat-messages';
import { async_handler } from '../middleware/global-error-handler';

import { authenticate_user } from '../middleware/auth';


const router = express.Router();

router.use(authenticate_user);

router.post('/:id',
  async_handler(stream_chat_messages)
);

export const chat_routes = router;
