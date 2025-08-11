import express, { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';


import { get_all_conversations } from '../controllers/conversation/get-all-conversations';
import { update_conversation } from '../controllers/conversation/update-conversation';
import { delete_conversation } from '../controllers/conversation/delete-conversation';
import { get_conversation_by_id } from '../controllers/conversation/get-conversation-by-id';
import { create_conversation } from '../controllers/conversation/create-conversation';
import { authenticate_user } from '../middleware/auth';




const router: Router = express.Router();

router.post('/',
  authenticate_user,
  asyncHandler(create_conversation)
);
router.get('/user',
  authenticate_user,
  asyncHandler(get_all_conversations)
);
router.get('/:id',
  authenticate_user,
  asyncHandler(get_conversation_by_id)
);
router.put('/:id',
  authenticate_user,
  asyncHandler(update_conversation)
);
router.delete('/:id',
  authenticate_user,
  asyncHandler(delete_conversation)
);




export const conversationRouter = router;