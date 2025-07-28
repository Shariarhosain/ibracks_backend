// ================================
// USER ROUTES (routes/userRoutes.js)
// ================================

import express from 'express';
import userController from '../controllers/userController.js';
import { uploadSingle, uploadMultipleFields, handleMulterError } from '../utils/multer.js';
import verifyToken from '../middlewares/verifytoken.js';

const router = express.Router();

// Public routes
router.post('/register', uploadSingle, userController.createUser);
router.post('/login', userController.loginUser);
router.put('/update-password', userController.updatePassword);

// Protected routes (require authentication)
router.use(verifyToken); // Apply middleware to all routes below

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', uploadSingle, userController.updateProfile);
router.delete('/profile/image', userController.removeProfileImage);
router.get('/profile/image-status', userController.checkImageStatus); // Check own image upload status
router.get('/profile/:id', userController.getUserById); // View specific user details

// Admin routes (you might want to add role-based middleware)
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.get('/:id/image-status', userController.checkImageStatus); // Check any user's image upload status
router.put('/:id', uploadSingle, userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.delete('/:id/image', userController.removeUserProfileImage);



// Apply multer error handling middleware
router.use(handleMulterError);

export default router;
