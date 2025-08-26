import { mg } from "../../config/mg";
import { TResponseRequest } from "../../types/shared";



export const get_user_details = async ({ req, res }: TResponseRequest) => {
    const user_id = req.user.user_id;
    const user = await mg.User.findOne({ _id: user_id });
    res.status(200).json({
        message: "User details fetched successfully",
        data: user
    });
}