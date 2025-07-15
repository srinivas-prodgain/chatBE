import express, { Request, Response } from 'express';
import { Conversation } from '../models/conversation';
import { ChatMessage } from '../models/chat';
import { validateRequest, validateParams, validateBody } from '../middleware/validation';
import { ChatRequestSchema, UidParamSchema } from '../validations/schemas';

import { streamText } from 'ai';
import { openaiModel, mistralModel, geminiModel } from '../lib/ai';
import { fetchConversationHistory } from '../lib/tools/mongoDb';
import { generateQRCode } from '../lib/tools/qr-code-tool';


const chatRouter = express.Router();

// Stream chat completion with validation
chatRouter.post('/:uid',
  validateParams(UidParamSchema),
  validateBody(ChatRequestSchema),
  async (req: Request, res: Response) => {

    const abortController = new AbortController();
    let aiResponse = '';
    let conversation: any = null;

    try {
      const { uid } = req.params;
      const { messages, userId, model = 'openai' } = req.body;


      async function handleSaveMessage(aiResponse: string) {
        if (!conversation) {
          console.log('Conversation not found');
          return;
        }
        const aiMessage = new ChatMessage({
          message: aiResponse,
          sender: 'ai',
          conversationId: conversation?._id
        });
        await aiMessage.save();
        await Conversation.findByIdAndUpdate(conversation?._id, { updatedAt: new Date() });
      }

      res.on('close', async () => {
        console.log('Client disconnected, aborting stream');
        abortController.abort();
        if (aiResponse.trim()) {
          console.log("Saving AI response to database");
          await handleSaveMessage(aiResponse);
        }
      });

      // Select model based on user choice
      let selectedModel;
      switch (model) {
        case 'mistral':
          selectedModel = mistralModel('mistral-large-latest');
          break;
        case 'gemini':
          // Gemini is disabled for now, fallback to OpenAI
          console.log('Gemini requested but disabled, falling back to OpenAI');
          selectedModel = openaiModel;
          break;
        case 'openai':
        default:
          selectedModel = openaiModel;
          break;
      }

      // Find existing conversation by uid or create new one
      conversation = await Conversation.findOne({ uid });
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

      // Set headers for streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      async function handleStreaming(model: any) {

        const systemMessage = {
          role: 'system',
          content: `You are a helpful AI assistant with access to multiple tools. You can:
          
          1. **Fetch conversation history** using fetchConversationHistory tool to reference previous messages
          2. **Generate QR codes** using generateQRCode tool to create QR codes for any data
          
          Use fetchConversationHistory when users ask about:
          - Previous messages in this conversation
          - What was discussed earlier
          - References to earlier parts of the conversation
          - "What did I say before" or "What did we talk about"
          
          Use generateQRCode when users ask about:
          - Creating QR codes for websites, URLs, text, contact info, etc.
          - "Generate QR code for..." or "Create QR code for..."
          - Converting text/URLs to QR codes
          - QR code generation in different formats (PNG, SVG, data URL)
          
          Current conversation ID: ${conversation._id}`
        };

        const result = streamText({
          model,
          messages: [systemMessage, ...messages],
          abortSignal: abortController.signal,
          tools: {
            fetchConversationHistory,
            generateQRCode,
          },
          toolChoice: 'auto',
          maxSteps: 10,
        });



        for await (const textPart of result.textStream) {
          if (abortController.signal.aborted) {
            console.log('Stream aborted by client - stopping iteration');
            break;
          }
          aiResponse += textPart;
          res.write(`data: ${JSON.stringify({ content: textPart, conversationId: conversation?._id })}\n\n`);
          // console.log("textPart", textPart);
        }
      }


      try {
        console.log("Starting stream with model:", model);
        await handleStreaming(selectedModel);

        // Only send [DONE] if not aborted
        if (!abortController.signal.aborted) {
          res.write('data: [DONE]\n\n');
        }
        res.end();

        console.log("Stream completed. AI response length:", aiResponse.length);
      } catch (streamError: any) {
        // Handle AbortError specifically - this is expected behavior when client cancels
        if (streamError.name === 'AbortError' || abortController.signal.aborted) {
          console.log('Stream was cancelled by client - this is normal behavior');
          if (!res.headersSent) {
            res.status(200).end(); // 200 because cancellation is not an error
          } else {
            res.end();
          }
          return;
        }

        // Handle actual errors
        console.error('Unexpected error in chat stream:', streamError);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          res.write('data: [ERROR]\n\n');
          res.end();
        }
      }

    } catch (error: any) {
      // Handle AbortError at the top level too
      if (error.name === 'AbortError' || abortController.signal.aborted) {
        console.log('Request was cancelled by client - this is normal behavior');
        if (!res.headersSent) {
          res.status(200).end();
        }
        return;
      }

      console.error('Unexpected error in chat endpoint:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.write('data: [ERROR]\n\n');
        res.end();
      }
    }
  }
);

export default chatRouter;