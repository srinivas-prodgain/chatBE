// import { get_user_profile } from "../controllers/auth/get_user_profile";
import { login } from "../controllers/auth/login";
import { login_with_google } from "../controllers/auth/login-with-google";
import { register } from "../controllers/auth/register";
import { asyncHandler } from "../middleware/errorHandler";
import { authenticate_user } from "../middleware/auth";


import { Router } from "express";

const router = Router();

router.post('/login', authenticate_user, asyncHandler(login));
router.post('/register', authenticate_user, asyncHandler(register));
router.post('/google', authenticate_user, asyncHandler(login_with_google));
// router.get('/user-profile', authenticate_user, asyncHandler(get_user_profile));


export const authRouter = router;