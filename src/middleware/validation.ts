import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

export const validateRequest = (schema: AnyZodObject) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        return next();
    };
};

export const validateBody = (schema: AnyZodObject) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        await schema.parseAsync(req.body);
        return next();
    };
};

export const validateParams = (schema: AnyZodObject) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        await schema.parseAsync(req.params);
        return next();
    };
};
