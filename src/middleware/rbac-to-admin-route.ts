import { NextFunction, Response } from "express";
import { TAuthenticatedRequest } from "../types/shared";
import { throw_error } from "../utils/throw-error";

export const rbac = (req: TAuthenticatedRequest, res: Response, next: NextFunction) => {
    const { user } = req;

    if (user?.role !== "admin") {
        console.log("user", user)
        return throw_error({
            message: 'Insufficient permissions to access this resource',
            status_code: 403,
        });
    }

    next();
}