import express, { Router } from 'express';
import { async_handler } from '../middleware/global-error-handler';


import { get_all_conversations } from '../controllers/conversation/get-all-conversations';
import { update_conversation } from '../controllers/conversation/update-conversation';
import { delete_conversation } from '../controllers/conversation/delete-conversation';
import { get_conversation_by_id } from '../controllers/conversation/get-conversation-by-id';
import { create_conversation } from '../controllers/conversation/create-conversation';
import { authenticate_user } from '../middleware/auth';




const router: Router = express.Router();

router.use(authenticate_user);


router.post('/',
  async_handler(create_conversation)
);

router.get('/user',
  async_handler(get_all_conversations)
);
router.get('/:id',
  async_handler(get_conversation_by_id)
);
router.put('/:id',
  async_handler(update_conversation)
);
router.delete('/:id',
  async_handler(delete_conversation)
);




export const conversation_routes = router;