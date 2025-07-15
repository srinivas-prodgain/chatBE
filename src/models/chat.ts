import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  message: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  conversationId: mongoose.Types.ObjectId;
}

const chatMessageSchema = new Schema<IChatMessage>({
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

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
