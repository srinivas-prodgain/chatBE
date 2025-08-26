import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

type TValidationErrorDetail = {
    field: string;
    message: string;
};

type TErrorResponse = {
    error: string;
    message?: string;
    details?: TValidationErrorDetail[] | null;
    stack?: string;
}

type TCustomError = Error & {
    status_code?: number;
};

type TMongoValidationError = {
    path: string;
    message: string;
};

type TMongoError = Error & {
    code?: number;
    errors?: Record<string, TMongoValidationError>;
};

export const global_error_handler = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let details: TValidationErrorDetail[] | null = null;

    // Handle custom AppError
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        message = error.message;
        console.log("AppError", error.message);
    }

    // Handle errors from throw_error utility
    else if ((error as TCustomError).status_code) {
        statusCode = (error as TCustomError).status_code!;
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
        const mongoError = error as TMongoError;
        if (mongoError.errors) {
            details = Object.values(mongoError.errors).map((err: TMongoValidationError) => ({
                field: err.path,
                message: err.message
            }));
        }
        console.log("ValidationError", error.message);
    }

    else if (error.name === 'MongoError' && (error as TMongoError).code === 11000) {
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

export const async_handler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn({ req, res, next })).catch(next);
    };
};