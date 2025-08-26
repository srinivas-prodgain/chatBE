import { mg } from "../../config/mg";
import { TResponseRequest } from "../../types/shared";
import { z } from "zod";


const z_get_all_users_req_query = z.object({
  page: z.preprocess(
    (val) => Number(val),
    z.number().min(1).default(1)
  ),
  limit: z.preprocess(
    (val) => Number(val),
    z.number().min(1).default(20)
  )
});


const get_all_users = async ({ req, res }: TResponseRequest) => {
  const { page, limit } = z_get_all_users_req_query.parse(req.query);
  const skip = (page - 1) * limit;

  const get_users = mg.User.find()
    .select('-permissions')
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const get_total = mg.User.countDocuments({});

  const [users, total] = await Promise.all([
    get_users,
    get_total
  ]);

  const total_pages = Math.ceil(total / limit);

  res.status(200).json({
    message: "Users retrieved successfully",
    data: users,
    pagination: {
      page,
      limit,
      total_pages,
      total_items: total
    }
  });
}

export default get_all_users;