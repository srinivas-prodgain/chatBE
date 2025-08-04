import mongoose, { Schema } from 'mongoose';

import { TMessage } from '../types/message';

const chatMessageSchema = new Schema<TMessage>({
  message: {
    type: String,
    required: true,
    trim: true
  },
  sender: {
    type: String,
    enum: ['user', 'ai'],
    required: true
  },
  conversation_id: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export const ChatMessage = mongoose.model<TMessage>('ChatMessage', chatMessageSchema);
