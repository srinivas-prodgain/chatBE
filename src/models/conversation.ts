import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  uid: string;
  title: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>({
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
  }
}, {
  timestamps: true
});




export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
