import { Router } from "express";
import get_all_users from "../controllers/admin/get-all-users";
import { authenticate_user } from "../middleware/auth";
import { rbac } from "../middleware/rbac-to-admin-route";
import { async_handler } from "../middleware/global-error-handler";

const router = Router();

router.use(authenticate_user);

router.get('/users', rbac, async_handler(get_all_users));

export const admin_routes = router;
