import mongoose, { Schema } from 'mongoose';
import { TConversation } from '../types/conversation';

const conversationSchema = new Schema<TConversation>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  user_id: {
    type: String,
    required: false,
    index: true
  },
  summary: {
    type: String,
    required: false,
    default: "",
  },
  summary_version: {
    type: Number,
    required: false,
    default: 0,
  },
  last_summarized_message_index: {
    type: Number,
    default: 0,
    required: false,
  },
  last_token_count: {
    type: Number,
    default: 0,
    required: false,
  },

}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export const Conversation = mongoose.model<TConversation>('Conversation', conversationSchema);
