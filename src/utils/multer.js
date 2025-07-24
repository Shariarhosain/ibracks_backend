// ================================
// MULTER CONFIGURATION (utils/multer.js)
// ================================

import multer from 'multer';

// Configure multer for memory storage (no file saving)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 250 * 1024 * 1024 // 250MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check if file is an image
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Single image upload middleware
const uploadSingle = upload.single('profileImage');

// Multiple fields upload middleware for general use
const uploadMultipleFields = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 },
    { name: 'heroImage', maxCount: 20 },
    { name: 'images', maxCount: 20 }
]);

// Configure multer for multiple image fields (specific use cases)
const uploadImages = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 250 * 1024 * 1024 // 250MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check if file is an image
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
}).fields([
    { name: 'main_image', maxCount: 1 },
    { name: 'sub_images', maxCount: 10 },
    { name: 'menuImages', maxCount: 10 }
]);

// Any field upload (for flexible use)
const uploadAny = upload.any();

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 250MB.'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files uploaded.'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected file field.'
            });
        }
        return res.status(400).json({
            success: false,
            message: `Upload error: ${error.message}`
        });
    }
    
    if (error.message === 'Only image files are allowed!') {
        return res.status(400).json({
            success: false,
            message: 'Only image files are allowed!'
        });
    }
    
    next(error);
};

export { 
    upload, 
    uploadSingle, 
    uploadMultipleFields, 
    uploadImages, 
    uploadAny,
    handleMulterError 
};