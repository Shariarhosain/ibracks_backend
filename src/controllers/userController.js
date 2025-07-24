// ================================
// USER CONTROLLER (controllers/userController.js)
// ================================

import userService from '../services/userService.js';
import AppError from '../utils/error.js';

const userController = {
  // Create user
  async createUser(req, res) {
    try {
      // Handle single file upload (profileImage)
      const profileImage = req.file || null;
      
      const user = await userService.createUser(req.body, profileImage);
      
      // Add image upload status to response
      const response = {
        success: true,
        message: 'User created successfully',
        data: user
      };
      
      if (profileImage) {
        response.imageUpload = {
          status: 'processing',
          message: 'Profile image is being uploaded in the background',
          originalName: profileImage.originalname,
          size: profileImage.size
        };
      }
      
      res.status(201).json(response);
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get all users
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const result = await userService.getAllUsers(page, limit, search);
      
      res.status(200).json({
        success: true,
        message: 'Users fetched successfully',
        data: result.users,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get user by ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      
      res.status(200).json({
        success: true,
        message: 'User fetched successfully',
        data: user
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Update user
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const profileImage = req.file || null;
      const user = await userService.updateUser(id, req.body, profileImage);
      
      // Add image upload status to response
      const response = {
        success: true,
        message: 'User updated successfully',
        data: user
      };
      
      if (profileImage) {
        response.imageUpload = {
          status: 'processing',
          message: 'Profile image is being uploaded in the background',
          originalName: profileImage.originalname,
          size: profileImage.size
        };
      }
      
      res.status(200).json(response);
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Delete user
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const result = await userService.deleteUser(id);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Login user
  async loginUser(req, res) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }
      
      const result = await userService.loginUser(email, password);
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get current user details (profile)
  async getProfile(req, res) {
    try {
      const user = await userService.getUserById(req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Profile fetched successfully',
        data: user
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Update current user's profile
  async updateProfile(req, res) {
    try {
      const profileImage = req.file || null;
      const user = await userService.updateUser(req.user.id, req.body, profileImage);
      
      // Add image upload status to response
      const response = {
        success: true,
        message: 'Profile updated successfully',
        data: user
      };
      
      if (profileImage) {
        response.imageUpload = {
          status: 'processing',
          message: 'Profile image is being uploaded in the background',
          originalName: profileImage.originalname,
          size: profileImage.size
        };
      }
      
      res.status(200).json(response);
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Check image upload status
  async checkImageStatus(req, res) {
    try {
      const { id } = req.params || req.user; // Allow checking own status or specific user (admin)
      const userId = id || req.user.id;
      
      const status = await userService.checkImageUploadStatus(userId);
      
      res.status(200).json({
        success: true,
        message: 'Image status retrieved successfully',
        data: status
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Remove current user's profile image
  async removeProfileImage(req, res) {
    try {
      const user = await userService.removeProfileImage(req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Profile image removed successfully',
        data: user
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Remove any user's profile image (admin only)
  async removeUserProfileImage(req, res) {
    try {
      const { id } = req.params;
      const user = await userService.removeProfileImage(id);
      
      res.status(200).json({
        success: true,
        message: 'User profile image removed successfully',
        data: user
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Update user password
  async updatePassword(req, res) {
    try {
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password is required'
        });
      }

      const user = await userService.updatePassword(req.user.id, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password updated successfully',
        data: user
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  }
};

export default userController;