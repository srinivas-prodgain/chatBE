import express, { Router } from 'express';

import { handle_upload } from '../controllers/files/upload-file';
import { upload_middleware } from '../middleware/file-upload';
import { async_handler } from '../middleware/global-error-handler';
import { get_all_files_meta_data } from '../controllers/files/get-all-files-meta-data';
import { delete_file_from_vector_db } from '../controllers/files/delete-file-from-vector-db';
import { get_file_status } from '../controllers/files/get-file-status';
import { authenticate_user } from '../middleware/auth';

const router: Router = express.Router();

router.use(authenticate_user);

router.get('/', async_handler(get_all_files_meta_data));

router.get('/status/:file_id', async_handler(get_file_status));

router.delete('/delete/:file_id', async_handler(delete_file_from_vector_db));

router.post('/upload',
    upload_middleware.single('file'),
    async_handler(handle_upload)
);

export const file_routes = router; 
