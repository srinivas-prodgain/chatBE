import { Router } from "express";
import get_all_users from "../controllers/admin/get-all-users";
import { authenticate_user } from "../middleware/auth";
import { rbac } from "../middleware/rbac-to-admin-route";

const router = Router();

router.get('/users', authenticate_user, rbac, get_all_users);

export const admin_routes = router;
