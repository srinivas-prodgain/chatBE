import { authenticate_user } from "../middleware/auth";
import { get_user_details } from "../controllers/user/get-user-details";
import express from "express";



const router = express.Router();

router.get('/', authenticate_user, get_user_details);

export const user_routes = router;