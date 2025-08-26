import { NextFunction, Response } from "express";
import { throw_error } from "../utils/throw-error";

import { TAuthMiddleware } from "./auth";



export const rbac = (req: TAuthMiddleware, res: Response, next: NextFunction) => {
    const { user } = req;

    if (user?.role !== "admin") {
        return throw_error({
            message: 'Insufficient permissions to access this resource',
            status_code: 403,
        });
    }

    next();
}