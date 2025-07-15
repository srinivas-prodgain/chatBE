import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();


import connectToDataBase from './config/db';
import conversationRouter from './routes/conversationRoutes';
import chatRouter from './routes/chatRoutes';
import { globalErrorHandler } from './middleware/errorHandler';


const app = express();

app.use(express.json());
app.use(cors());

// Routes
app.use('/api/v1/conversations', conversationRouter);
app.use('/api/v1/stream', chatRouter);

// Global error handler (must be last)
app.use(globalErrorHandler);

const PORT = process.env.PORT || 8000;

app.listen(PORT, async () => {
    await connectToDataBase();
    console.log('Connected to database');
    console.log(`Server is running on port ${PORT}`);
});