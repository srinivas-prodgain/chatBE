import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';

dotenv.config();

// Validate environment variables early
import { env } from './config/env';


import { connectToDataBase } from './config/db';
import { conversationRouter } from './routes/conversation-routes';
import { chatRouter } from './routes/chat-routes';
import { fileRouter } from './routes/file-routes';
import { globalErrorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';

const app = express();

app.use(helmet());



// CORS configuration for SSE and regular requests
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://trailchatapp.vercel.app',
        'https://trailchatapp-git-main-teja-reddys-projects-581d80aa.vercel.app',
        /^https:\/\/trailchatapp.*\.vercel\.app$/,  // Allow all Vercel preview deployments
        ...(env.FRONTEND_URL ? [env.FRONTEND_URL] : [])
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
}));

app.use(express.json());

// Routes
app.use('/api/v1/conversations', conversationRouter);
app.use('/api/v1/stream', chatRouter);
app.use('/api/v1/files', fileRouter);
app.use('/api/v1/auth', authRouter);

// Global error handler (must be last)
app.use(globalErrorHandler);

const PORT = env.PORT;

app.listen(PORT, async () => {
    await connectToDataBase();
    console.log('Connected to database');
    console.log(`Server is running on port ${PORT}`);
});
