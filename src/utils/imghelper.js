import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';
import dotenv from 'dotenv';
dotenv.config();

// Configuration
const IMAGE_UPLOAD_SERVICE_URL = process.env.IMAGE_UPLOAD_SERVICE_URL || 'http://localhost:3100/upload';

/**
 * Upload a single image to the image upload service
 * @param {Object} file - File object with buffer, originalname, mimetype, and size
 * @returns {Promise<Object>} Response with file URL and metadata
 */
export const uploadSingleImage = async (file) => {
    try {
        if (!file || !file.buffer) {
            throw new Error('Invalid file object provided');
        }

        const formData = new FormData();
        const stream = Readable.from(file.buffer);

        formData.append('image', stream, {
            filename: file.originalname,
            contentType: file.mimetype,
            knownLength: file.size,
        });

        console.log(`Uploading image: ${file} (${file.size} bytes)`);


        const headers = formData.getHeaders();

        const response = await axios.post(
            `${IMAGE_UPLOAD_SERVICE_URL}/upload/upload-single`,
            formData,
            { headers }
        );

        return {
            success: true,
            url: response.data.file.url,
            filename: response.data.file.filename,
            originalname: response.data.file.originalname,
            size: response.data.file.size,
            data: response.data
        };
    } catch (error) {
        console.error('Single image upload failed:', error.response?.data || error.message);
        throw new Error(`Image upload failed: ${error.response?.data?.error || error.message}`);
    }
};

/**
 * Upload multiple images to the image upload service
 * @param {Object} files - Object containing main_image and sub_images arrays
 * @param {Array} files.main_image - Array with single main image file
 * @param {Array} files.sub_images - Array of sub image files (max 10)
 * @returns {Promise<Object>} Response with uploaded files metadata
 */
export const uploadMultipleImages = async (files) => {
    try {
        if (!files || (!files.main_image && !files.sub_images)) {
            throw new Error('No files provided for upload');
        }

        const formData = new FormData();

        // Add main image if provided
        if (files.main_image && files.main_image.length > 0) {
            const mainFile = files.main_image[0];
            const mainStream = Readable.from(mainFile.buffer);
            
            formData.append('main_image', mainStream, {
                filename: mainFile.originalname,
                contentType: mainFile.mimetype,
                knownLength: mainFile.size,
            });
        }

        // Add sub images if provided (max 10)
        if (files.sub_images && files.sub_images.length > 0) {
            const subImagesToUpload = files.sub_images.slice(0, 10); // Limit to 10 images
            
            subImagesToUpload.forEach((file) => {
                const subStream = Readable.from(file.buffer);
                formData.append('sub_images', subStream, {
                    filename: file.originalname,
                    contentType: file.mimetype,
                    knownLength: file.size,
                });
            });
        }

        const headers = formData.getHeaders();

        const response = await axios.post(
            `${IMAGE_UPLOAD_SERVICE_URL}/upload`,
            formData,
            { headers }
        );

        return {
            success: true,
            main_image: response.data.main_image,
            sub_images: response.data.sub_images,
            data: response.data
        };
    } catch (error) {
        console.error('Multiple images upload failed:', error.response?.data || error.message);
        throw new Error(`Multiple images upload failed: ${error.response?.data?.error || error.message}`);
    }
};

/**
 * Delete an image from the upload service
 * @param {string} filename - The filename to delete
 * @returns {Promise<Object>} Deletion result
 */
export const deleteImage = async (filename) => {
    try {
        if (!filename) {
            throw new Error('Filename is required for deletion');
        }

        const response = await axios.delete(`${IMAGE_UPLOAD_SERVICE_URL}/upload/delete/${filename}`);

        return {
            success: response.data.success,
            message: response.data.message
        };
    } catch (error) {
        console.error('Image deletion failed:', error.response?.data || error.message);
        throw new Error(`Image deletion failed: ${error.response?.data?.error || error.message}`);
    }
};

/**
 * Search for an image by filename
 * @param {string} filename - The filename to search for
 * @returns {Promise<Object>} Search result with image info
 */
export const searchImage = async (filename) => {
    try {
        if (!filename) {
            throw new Error('Filename is required for search');
        }

        const response = await axios.get(`${IMAGE_UPLOAD_SERVICE_URL}/images/search/${filename}`);

        return {
            success: response.data.success,
            image: response.data.image
        };
    } catch (error) {
        if (error.response?.status === 404) {
            return {
                success: false,
                message: 'Image not found'
            };
        }
        console.error('Image search failed:', error.response?.data || error.message);
        throw new Error(`Image search failed: ${error.response?.data?.error || error.message}`);
    }
};

/**
 * Get list of all images
 * @returns {Promise<Array>} Array of image URLs
 */
export const getAllImages = async () => {
    try {
        const response = await axios.get(`${IMAGE_UPLOAD_SERVICE_URL}/images`);
        return response.data;
    } catch (error) {
        console.error('Failed to get images list:', error.response?.data || error.message);
        throw new Error(`Failed to get images list: ${error.response?.data?.error || error.message}`);
    }
};

/**
 * Upload image with automatic retry mechanism
 * @param {Object} file - File object
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise<Object>} Upload result
 */
export const uploadImageWithRetry = async (file, maxRetries = 3) => {
    let attempt = 0;
    let lastError;

    while (attempt < maxRetries) {
        try {
            return await uploadSingleImage(file);
        } catch (error) {
            lastError = error;
            attempt++;
            
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                console.log(`Upload attempt ${attempt} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw new Error(`Upload failed after ${maxRetries} attempts: ${lastError.message}`);
};

/**
 * Validate file before upload
 * @param {Object} file - File object to validate
 * @param {Object} options - Validation options
 * @returns {boolean} True if valid, throws error if invalid
 */
export const validateImageFile = (file, options = {}) => {
    const {
        maxSize = 200 * 1024 * 1024, // 200MB default
        allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    } = options;

    if (!file) {
        throw new Error('No file provided');
    }

    if (!file.mimetype || !allowedTypes.includes(file.mimetype.toLowerCase())) {
        throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB`);
    }

    return true;
};

export default {
    uploadSingleImage,
    uploadMultipleImages,
    deleteImage,
    searchImage,
    getAllImages,
    uploadImageWithRetry,
    validateImageFile
};