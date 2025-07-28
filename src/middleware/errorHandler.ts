import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

type TErrorResponse = {
    error: string;
    message?: string;
    details?: any;
    stack?: string;
}

export const globalErrorHandler = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let details: any = null;

    // Handle custom AppError
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        message = error.message;
        console.log("AppError", error.message);
    }

    // Handle errors from throw_error utility
    else if ((error as any).status_code) {
        statusCode = (error as any).status_code;
        message = error.message;
        console.log("CustomError", error.message);
    }

    // Handle Zod validation errors
    else if (error instanceof ZodError) {
        statusCode = 400;
        message = 'Validation failed';
        details = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }));
        console.log("ZodError", error.errors);
    }

    // Handle MongoDB errors
    else if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
        console.log("CastError", error.message);
    }

    else if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation failed';
        details = Object.values((error as any).errors).map((err: any) => ({
            field: err.path,
            message: err.message
        }));
        console.log("ValidationError", error.message);
    }

    else if (error.name === 'MongoError' && (error as any).code === 11000) {
        statusCode = 409;
        message = 'Duplicate field value';
        console.log("MongoError", error.message);
    }

    const errorResponse: TErrorResponse = {
        error: message
    };

    if (details) {
        errorResponse.details = details;
    }

    res.status(statusCode).json(errorResponse);
};

export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};