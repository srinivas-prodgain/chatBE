import express, { Router } from 'express';

import { handle_upload } from '../controllers/files/upload-file';
import { upload_middleware } from '../middleware/file-upload';
import { asyncHandler } from '../middleware/errorHandler';
import { get_all_files_meta_data } from '../controllers/files/get-all-files-meta-data';
import { delete_file_from_vector_db } from '../controllers/files/delete-file-from-vector-db';
import { get_file_status } from '../controllers/files/get-file-status';

const router: Router = express.Router();

// Get all uploaded files
router.get('/', asyncHandler(get_all_files_meta_data));

// Get file processing status
router.get('/status/:file_id', asyncHandler(get_file_status));

// Delete file from vector db
router.delete('/delete/:file_id', asyncHandler(delete_file_from_vector_db));

// File upload endpoint with asynchronous processing
router.post('/upload',
    upload_middleware.single('file'), // Handle single file upload with field name 'file'
    asyncHandler(handle_upload)
);

export const fileRouter = router; 
