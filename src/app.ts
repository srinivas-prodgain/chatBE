import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();


import { connectToDataBase } from './config/db';
import { conversationRouter } from './routes/conversation-routes';
import { chatRouter } from './routes/chat-routes';
import { fileRouter } from './routes/file-routes';
import { globalErrorHandler } from './middleware/errorHandler';


const app = express();

// CORS configuration for SSE and regular requests
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
}));

app.use(express.json());

// Routes
app.use('/api/v1/conversations', conversationRouter);
app.use('/api/v1/stream', chatRouter);
app.use('/api/v1/files', fileRouter);

// Global error handler (must be last)
app.use(globalErrorHandler);

const PORT = process.env.PORT || 8000;

app.listen(PORT, async () => {
    await connectToDataBase();
    console.log('Connected to database');
    console.log(`Server is running on port ${PORT}`);
});