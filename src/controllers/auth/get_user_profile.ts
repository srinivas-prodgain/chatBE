// import { Response } from 'express';
// import { mg } from '../../config/mg';
// import { throw_error } from '../../utils/throw-error';
// import { TAuthenticatedRequest } from '../../types/shared';

// export const get_user_profile = async ({ req, res }: { req: TAuthenticatedRequest, res: Response }) => {
//     const firebase_user = req.user;

//     // Fetch user from database
//     const db_user = await mg.User.findOne({ firebase_uid: firebase_user?.uid }).lean();

//     if (!db_user) {
//         throw_error({ message: 'User profile does not exist in database', status_code: 404 });
//         return;
//     }

//     res.status(200).json({
//         message: 'User profile retrieved successfully',
//         data: {
//             _id: db_user._id,
//             email: db_user.email,
//             name: db_user.name,
//             role: db_user.role,
//             firebase_uid: db_user.firebase_uid,
//             last_login: db_user.last_login,
//             created_at: db_user.created_at,
//             updated_at: db_user.updated_at
//         }
//     });
// }