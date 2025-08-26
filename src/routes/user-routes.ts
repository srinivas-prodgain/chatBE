import { authenticate_user } from "../middleware/auth";
import { get_user_details } from "../controllers/user/get-user-details";
import { async_handler } from "../middleware/global-error-handler";
import express from "express";



const router = express.Router();

router.get('/', authenticate_user, async_handler(get_user_details));

export const user_routes = router;