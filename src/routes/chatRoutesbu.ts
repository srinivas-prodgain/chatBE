import express, { Request, Response } from 'express';
import { OpenAI } from 'openai';
import { Conversation } from '../models/conversation';
import { ChatMessage } from '../models/chat';
import { validateRequest, validateParams, validateBody } from '../middleware/validation';
import { ChatRequestSchema, UidParamSchema } from '../validations/schemas';


import { streamText } from 'ai';
import { openaiModel, geminiModel } from '../lib/ai';


const chatRouter = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Stream chat completion with validation
chatRouter.post('/:uid',
  validateParams(UidParamSchema),
  validateBody(ChatRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const { uid } = req.params;
      const { messages, userId, provider = 'openai' } = req.body;

      const model = provider === 'openai' ? openaiModel : geminiModel;

      // Find existing conversation by uid or create new one
      let conversation = await Conversation.findOne({ uid });

      if (!conversation) {
        // Create new conversation with first message as title
        const title = messages[messages.length - 1]?.content?.substring(0, 50) || 'New Chat';
        conversation = new Conversation({
          uid,
          title,
          userId
        });
        await conversation.save();
      }

      // Save user message
      const userMessage = new ChatMessage({
        message: messages[messages.length - 1].content,
        sender: 'user',
        conversationId: conversation._id
      });
      await userMessage.save();

      // Create OpenAI stream
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
        stream: true,
      });

      // const stream = streamText({
      //   model,
      //   messages,
      //   onFinish: async (message) => {
      //     console.log('message', message);
      //   },
      //   onError: (error) => {
      //     console.error('Error in stream:', error);
      //   },
      //   onChunk: (chunk) => {
      //     console.log('chunk', chunk);
      //   }
      // });

      // Set headers for streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      let aiResponse = '';

      // Process the stream
      for await (const chunk of stream) {
        // Check if connection was closed
        if (res.destroyed) {
          // Save partial response and exit
          if (aiResponse.trim()) {
            const aiMessage = new ChatMessage({
              message: aiResponse,
              sender: 'ai',
              conversationId: conversation._id
            });
            await aiMessage.save();
          }
          return;
        }

        const content = chunk.choices[0]?.delta.content || "";
        if (content) {
          console.log("content", content);
          aiResponse += content;
          res.write(`data: ${JSON.stringify({ content, conversationId: conversation._id })}\n\n`);
        }
      }

      // Save AI response (only if we have content)
      if (aiResponse.trim()) {
        const aiMessage = new ChatMessage({
          message: aiResponse,
          sender: 'ai',
          conversationId: conversation._id
        });
        await aiMessage.save();

        // Update conversation timestamp
        await Conversation.findByIdAndUpdate(conversation._id, { updatedAt: new Date() });
      }

      res.write('data: [DONE]\n\n');
      res.end();

    } catch (error) {
      console.error('Error in chat stream:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

export default chatRouter;