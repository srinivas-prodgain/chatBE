import { mg } from "../../config/mg";
import { TAuthenticatedRequest } from "../../types/shared";
import { Response } from "express";


export const get_user_details = async (req: TAuthenticatedRequest, res: Response) => {
    const user_id = req.user?.user_id;
    const user = await mg.User.findOne({ _id: user_id });
    res.json(user);
}