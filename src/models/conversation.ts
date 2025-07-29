import mongoose, { Schema } from 'mongoose';
import { TConversation } from '../types/conversation';



const conversationSchema = new Schema<TConversation>({
  uid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: String,
    required: false,
    index: true
  },
  summary: {
    type: String,
    required: false,
    default: "",
  },
  summaryVersion: {
    type: Number,
    required: false,
    default: 0,
  },
  lastSummarizedMessageIndex: {
    type: Number,
    default: 0,
    required: false,
  },
  lastTokenCount: {
    type: Number,
    default: 0,
    required: false,
  },

}, {
  timestamps: true
});




export const Conversation = mongoose.model<TConversation>('Conversation', conversationSchema);
