import mongoose, { Schema } from 'mongoose';

import { TMessage } from '../types/message';

const chatMessageSchema = new Schema<TMessage>({
  message: {
    type: String,
    required: true
  },
  sender: {
    type: String,
    enum: ['user', 'ai'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  }
});

// Create index for better query performance
chatMessageSchema.index({ conversationId: 1, timestamp: 1 });

export const ChatMessage = mongoose.model<TMessage>('ChatMessage', chatMessageSchema);
