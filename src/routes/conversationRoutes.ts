import express, { Request, Response, Router } from 'express';
import { Conversation } from '../models/conversation';
import { ChatMessage } from '../models/chat';
import { validateParams, validateBody } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError } from '../utils/errors';
import {
  UpdateConversationSchema,
  UidParamSchema,
  UserIdParamSchema,
  IdParamSchema,
} from '../validations/schemas';

import mongoose from 'mongoose';

const conversationRouter: Router = express.Router();



// Get all conversations for a user
conversationRouter.get('/user/:userId',
  validateParams(UserIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const conversations = await Conversation.find({ userId })
      .sort({ updatedAt: -1 })
      .select('title createdAt updatedAt uid');

    res.json(conversations);
  })
);

// Update conversation title
conversationRouter.put('/:uid',
  validateParams(UidParamSchema),
  validateBody(UpdateConversationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { uid } = req.params;
    const { title } = req.body;
    const conversation = await Conversation.findOneAndUpdate(
      { uid },
      { title },
      { new: true }
    );

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    res.json(conversation);
  })
);

// Delete a conversation and all its messages
conversationRouter.delete('/:id',
  validateParams(IdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;


    


    const session = await mongoose.startSession();
    session.startTransaction();

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }


    console.log('Started transaction at:', new Date());

    await ChatMessage.deleteMany({ conversationId: conversation._id }, { session });

    // await new Promise(resolve => setTimeout(resolve, 70000)); // 70 sec

    await Conversation.findByIdAndDelete(conversation._id, { session });

    await session.commitTransaction();
    console.log('Committed at:', new Date());

    session.endSession();

    res.json({ message: 'Conversation deleted successfully' });
  })
);

// Get a specific conversation with its messages
conversationRouter.get('/:uid',
  validateParams(UidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { uid } = req.params;
    const conversation = await Conversation.findOne({ uid });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    const messages = await ChatMessage.find({ conversationId: conversation._id })
      .sort({ timestamp: 1 })
      .select('message sender timestamp');

    res.json({
      conversation,
      messages
    });
  })
);

export default conversationRouter;