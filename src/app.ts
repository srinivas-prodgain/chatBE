import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';

dotenv.config();

// Validate environment variables early
import { env } from './config/env';


import { connect_to_db } from './config/db';
import { conversation_routes } from './routes/conversation-routes';
import { chat_routes } from './routes/chat-routes';
import { file_routes } from './routes/file-routes';
import { global_error_handler } from './middleware/global-error-handler';
import { auth_routes } from './routes/auth-routes';
import { admin_routes } from './routes/admin-routes';
import { user_routes } from './routes/user-routes';

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
app.use('/api/v1/conversations', conversation_routes);
app.use('/api/v1/stream', chat_routes);
app.use('/api/v1/files', file_routes);
app.use('/api/v1/auth', auth_routes);
app.use('/api/v1/admin', admin_routes);
app.use('/api/v1/user', user_routes);
// Global error handler (must be last)
app.use(global_error_handler);

const PORT = env.PORT;

app.listen(PORT, async () => {
    await connect_to_db();
    console.log('Connected to database');
    console.log(`Server is running on port ${PORT}`);
});
