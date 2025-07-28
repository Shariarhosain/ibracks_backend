
// ================================
// USER SERVICE (services/userService.js)
// ================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { uploadSingleImage, validateImageFile, deleteImage } from '../utils/imghelper.js';
import AppError from "../utils/error.js";
import generateToken from "../middlewares/jwt.js";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

const userService = {
  // Create a new user
  async createUser(userData, profileImageFile = null) {
    try {
      const { name, phoneNumber, email, password, role, uid } = userData;
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        throw new AppError('User with this email already exists', 400);
      }
      // uid check available
      const existingUid = await prisma.user.findUnique({
        where: { uid }
      });
      if (existingUid) {
        throw new AppError('User with this uid already exists', 400);

      } 

      // Hash password if provided
      let hashedPassword = null;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 12);
      }
      
      // Validate image file if provided (but don't upload yet)
      if (profileImageFile) {
        try {
          validateImageFile(profileImageFile);
        } catch (validationError) {
          throw new AppError(`Invalid profile image: ${validationError.message}`, 400);
        }
      }
      
      // Create user immediately without waiting for image upload
      const user = await prisma.user.create({
        data: {
          name,
          phoneNumber,
          email,
          password: hashedPassword,
          role: role || 'user',
          uid,
          // Image will be updated in background
          profileImage: null,
          profileImageFilename: null
        },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          email: true,
          role: true,
          uid: true,
          profileImage: true,
          profileImageFilename: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      // Handle image upload in background if file provided
      if (profileImageFile) {
        setImmediate(() => {
          userService.uploadProfileImageBackground(user.id, profileImageFile);
        });
      }
      
      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create user', 500);
    }
  },

  // Get all users with pagination
  async getAllUsers(page = 1, limit = 10, search = '') {
    try {
      const skip = (page - 1) * limit;
      
      const whereClause = search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search, mode: 'insensitive' } }
        ]
      } : {};
      
      const [users, totalUsers] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
            role: true,
            uid: true,
            profileImage: true,
            profileImageFilename: true,
            createdAt: true,
            updatedAt: true
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where: whereClause })
      ]);
      
      return {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          hasNext: skip + users.length < totalUsers,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new AppError('Failed to fetch users', 500);
    }
  },

 async getUserById(id) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        email: true,
        role: true,
        uid: true,
        profileImage: true,
        profileImageFilename: true,
        createdAt: true,
        updatedAt: true,
        likes: {
          include: {
            song: true  // This includes the full song data
          }
        }
      }
    });
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    return user;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch user', 500);
  }
},

  // Update user
  async updateUser(id, updateData, profileImageFile = null) {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!existingUser) {
        throw new AppError('User not found', 404);
      }
      
      // Check if email is being updated and if it's already taken
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: updateData.email }
        });
        
        if (emailExists) {
          throw new AppError('Email is already taken', 400);
        }
      }
      
      // Hash password if it's being updated
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 12);
      }
      
      // Validate image file if provided (but don't upload yet)
      if (profileImageFile) {
        try {
          validateImageFile(profileImageFile);
        } catch (validationError) {
          throw new AppError(`Invalid profile image: ${validationError.message}`, 400);
        }
      }
      
      // Update user immediately without waiting for image upload
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          email: true,
          role: true,
          uid: true,
          profileImage: true,
          profileImageFilename: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      // Handle image upload in background if file provided
      if (profileImageFile) {
        setImmediate(() => {
          userService.uploadProfileImageBackground(id, profileImageFile, existingUser.profileImageFilename);
        });
      }
      
      return updatedUser;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update user', 500);
    }
  },

  // Delete user
  async deleteUser(id) {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!existingUser) {
        throw new AppError('User not found', 404);
      }
      
      // Delete profile image if exists
      if (existingUser.profileImageFilename) {
        setImmediate(async () => {
          try {
            await deleteImage(existingUser.profileImageFilename);
            console.log(`Successfully deleted profile image: ${existingUser.profileImageFilename}`);
          } catch (deleteError) {
            console.warn('Failed to delete profile image:', deleteError.message);
          }
        });
      }
      
      await prisma.user.delete({
        where: { id }
      });
      
      return { message: 'User deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete user', 500);
    }
  },

  // Login user
  async loginUser(email, password, rememberMe) {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });
      
      if (!user || !user.password) {
        throw new AppError('Invalid credentials', 401);
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }
      
      const token = generateToken(
        user.id,
        user.email,
        user.role,
        rememberMe
      );
      
      return {
        user: {
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber,
          email: user.email,
          role: user.role,
          uid: user.uid,
          profileImage: user.profileImage
        },
        token
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Login failed', 500);
    }
  },

  // Remove profile image
  async removeProfileImage(id) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!existingUser) {
        throw new AppError('User not found', 404);
      }
      
      if (!existingUser.profileImageFilename) {
        throw new AppError('No profile image to remove', 400);
      }
      
      // Delete image from storage in background
      const filenameToDelete = existingUser.profileImageFilename;
      setImmediate(async () => {
        try {
          await deleteImage(filenameToDelete);
          console.log(`Successfully deleted profile image: ${filenameToDelete}`);
        } catch (deleteError) {
          console.warn('Failed to delete image from storage:', deleteError.message);
        }
      });
      
      // Update user record to remove image references immediately
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          profileImage: null,
          profileImageFilename: null
        },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          email: true,
          role: true,
          uid: true,
          profileImage: true,
          profileImageFilename: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      return updatedUser;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to remove profile image', 500);
    }
  },

  // Background image upload method
  async uploadProfileImageBackground(userId, profileImageFile, oldImageFilename = null) {
    try {
      console.log(`Starting background image upload for user ${userId}`)

      console.log("Validating image file:" ,profileImageFile);

      // Upload new image
      const uploadResult = await uploadSingleImage(profileImageFile);
      console.log(`Image uploaded successfully: ${uploadResult.url}`);

      // Update user with new image data
      await prisma.user.update({
        where: { id: userId },
        data: {
          profileImage: uploadResult.url,
          profileImageFilename: uploadResult.filename
        }
      });
      
      // Delete old image if exists
      if (oldImageFilename) {
        try {
          await deleteImage(oldImageFilename);
          console.log(`Successfully deleted old image: ${oldImageFilename}`);
        } catch (deleteError) {
          console.warn(`Failed to delete old image ${oldImageFilename}:`, deleteError.message);
        }
      }
      
      console.log(`Background image upload completed for user ${userId}: ${uploadResult.url}`);
    } catch (error) {
      console.error(`Background image upload failed for user ${userId}:`, error.message);
      // Optionally, you could implement retry logic here or send notification to admin
      
      // You could add a field to track upload status if needed
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            // Could add imageUploadStatus: 'failed' field if you want to track this
          }
        });
      } catch (dbError) {
        console.error(`Failed to update image upload status for user ${userId}:`, dbError.message);
      }
    }
  },

  // Check image upload status (optional utility method)
  async checkImageUploadStatus(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          profileImage: true,
          profileImageFilename: true
        }
      });
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      return {
        hasImage: !!user.profileImage,
        imageUrl: user.profileImage,
        filename: user.profileImageFilename
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to check image upload status', 500);
    }
  },
  // Update user password
  async updatePassword(email, newPassword) {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email }
      });
      
      if (!existingUser) {
        throw new AppError('User not found', 404);
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      // Update user password
      const updatedUser = await prisma.user.update({
        where: { email: email },
        data: { password: hashedPassword },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          email: true,
          role: true,
          uid: true,
          profileImage: true,
          profileImageFilename: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      return updatedUser;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update password', 500);
    }
  }
};

export default userService;