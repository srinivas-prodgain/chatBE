import multer from 'multer';
import path from 'path';
import { MAX_FILE_SIZE, ALLOWED_FILE_EXTENSIONS } from '../types/file';
import fs from 'fs';


const uploadsDir = 'uploads/';

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const file_filter = (req: Express.Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
    const file_extension = path.extname(file.originalname).toLowerCase();
    const allowed_extensions = Object.values(ALLOWED_FILE_EXTENSIONS).flat();

    if (allowed_extensions.includes(file_extension)) {
        callback(null, true);
    } else {
        callback(new Error('File type not supported. Supported formats: PDF, TXT, DOCX, MD'));
    }
};


export const upload_middleware = multer({
    storage: storage,
    fileFilter: file_filter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1
    }
}); 