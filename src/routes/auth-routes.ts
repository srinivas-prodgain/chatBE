import { login } from "../controllers/auth/login";
import { login_with_google } from "../controllers/auth/login-with-google";
import { register } from "../controllers/auth/register";
import { async_handler } from "../middleware/global-error-handler";
import { authenticate_user } from "../middleware/auth";


import { Router } from "express";

const router = Router();

router.post('/register', async_handler(register));

router.use(authenticate_user);

router.post('/login', async_handler(login));
router.post('/google', async_handler(login_with_google));


export const auth_routes = router;