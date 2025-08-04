import express, { Router } from 'express';

import { handle_upload } from '../controllers/files/upload-file';
import { upload_middleware } from '../middleware/file-upload';
import { asyncHandler } from '../middleware/errorHandler';
import { get_all_files_meta_data } from '../controllers/files/get-all-files-meta-data';
import { delete_file_from_vector_db } from '../controllers/files/delete-file-from-vector-db';

const router: Router = express.Router();

// Get all uploaded files
router.get('/', asyncHandler(get_all_files_meta_data));

// Delete file from vector db
router.delete('/delete/:file_id', asyncHandler(delete_file_from_vector_db));


// Single upload endpoint that handles file upload with SSE streaming
router.post('/upload/:uploadId',
    upload_middleware.single('file'), // Handle single file upload with field name 'file'
    asyncHandler(handle_upload)
);

export const fileRouter = router; 
