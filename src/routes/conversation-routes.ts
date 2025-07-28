import express, { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';


import { get_all_conversations } from '../controllers/conversation/get-all-conversations';
import { update_conversation } from '../controllers/conversation/update-conversation';
import { delete_conversation } from '../controllers/conversation/delete-conversation';
import { get_conversation_by_id } from '../controllers/conversation/get-conversation-by-id';


const router: Router = express.Router();

router.get('/user/:userId',
  asyncHandler(get_all_conversations)
);
router.get('/:uid',
  asyncHandler(get_conversation_by_id)
);
router.put('/:uid',
  asyncHandler(update_conversation)
);
router.delete('/:id',
  asyncHandler(delete_conversation)
);




export const conversationRouter = router;