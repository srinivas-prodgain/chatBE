import express, { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';


import { get_all_conversations } from '../controllers/conversation/get-all-conversations';
import { update_conversation } from '../controllers/conversation/update-conversation';
import { delete_conversation } from '../controllers/conversation/delete-conversation';
import { get_conversation_by_id } from '../controllers/conversation/get-conversation-by-id';
import { create_conversation } from '../controllers/conversation/create-conversation';


const router: Router = express.Router();

router.post('/',
  asyncHandler(create_conversation)
);
router.get('/user/:user_id',
  asyncHandler(get_all_conversations)
);
router.get('/:id',
  asyncHandler(get_conversation_by_id)
);
router.put('/:id',
  asyncHandler(update_conversation)
);
router.delete('/:id',
  asyncHandler(delete_conversation)
);




export const conversationRouter = router;