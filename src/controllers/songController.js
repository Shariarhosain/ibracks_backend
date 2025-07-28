// ================================
// SONG CONTROLLER (controllers/songController.js)
// ================================

import songService from '../services/songService.js';
import AppError from '../utils/error.js';

const songController = {
  // Create song
  async createSong(req, res) {
    try {
      const files = {
        audioFile: req.files?.audioFile?.[0] || null,
        coverImage: req.files?.coverImage?.[0] || null
      };
      
      // Add userId to the body (from authenticated user)
      const songData = {
        ...req.body,
        userId: req.user?.id
      };
      
      const song = await songService.createSong(songData, files);
      
      const response = {
        success: true,
        message: 'Song created successfully',
        data: song
      };
      
      // Add file upload status to response
      if (files.audioFile || files.coverImage) {
        response.fileUpload = {
          status: 'processing',
          message: 'Song files are being uploaded in the background',
          files: {
            audio: files.audioFile ? {
              originalName: files.audioFile.originalname,
              size: files.audioFile.size
            } : null,
            cover: files.coverImage ? {
              originalName: files.coverImage.originalname,
              size: files.coverImage.size
            } : null
          }
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

  // Get all songs (admin/public)
  async getAllSongs(req, res) {
    try {
      const { page = 1, limit = 10, search = '', musicTag = '', status = '', userId = '' } = req.query;
      
      const filters = {
        search: search || undefined,
        musicTag: musicTag || undefined,
        status: status || undefined,
        userId: userId || undefined
      };
      
      const result = await songService.getAllSongs(page, limit, filters);
      
      res.status(200).json({
        success: true,
        message: 'Songs fetched successfully',
        data: result.songs,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get published songs only (public API)
  async getPublishedSongs(req, res) {
    try {
      const { page = 1, limit = 10, search = '', musicTag = '' } = req.query;
      
      const filters = {
        search: search || undefined,
        musicTag: musicTag || undefined
      };
      
      const result = await songService.getPublishedSongs(page, limit, filters);
      
      res.status(200).json({
        success: true,
        message: 'Published songs fetched successfully',
        data: result.songs,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get song by ID
  async getSongById(req, res) {
    try {
      const { id } = req.params;
      const song = await songService.getSongById(id);
      
      res.status(200).json({
        success: true,
        message: 'Song fetched successfully',
        data: song
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Update song
  async updateSong(req, res) {
    try {
      const { id } = req.params;
      const files = {
        audioFile: req.files?.audioFile?.[0] || null,
        coverImage: req.files?.coverImage?.[0] || null
      };
      
      const song = await songService.updateSong(id, req.body, files);
      
      const response = {
        success: true,
        message: 'Song updated successfully',
        data: song
      };
      
      // Add file upload status to response
      if (files.audioFile || files.coverImage) {
        response.fileUpload = {
          status: 'processing',
          message: 'Song files are being uploaded in the background',
          files: {
            audio: files.audioFile ? {
              originalName: files.audioFile.originalname,
              size: files.audioFile.size
            } : null,
            cover: files.coverImage ? {
              originalName: files.coverImage.originalname,
              size: files.coverImage.size
            } : null
          }
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

  // Delete song
  async deleteSong(req, res) {
    try {
      const { id } = req.params;
      const result = await songService.deleteSong(id);
      
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

  // Publish song immediately
  async publishSong(req, res) {
    try {
      const { id } = req.params;
      const song = await songService.publishSong(id);
      
      res.status(200).json({
        success: true,
        message: 'Song published successfully',
        data: song
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get user's songs
  async getMySongs(req, res) {
    try {
      const { page = 1, limit = 10, search = '', musicTag = '', status = '' } = req.query;
      
      const filters = {
        search: search || undefined,
        musicTag: musicTag || undefined,
        status: status || undefined,
        userId: req.user.id
      };
      
      const result = await songService.getAllSongs(page, limit, filters);
      
      res.status(200).json({
        success: true,
        message: 'Your songs fetched successfully',
        data: result.songs,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Check file upload status
  async checkFileUploadStatus(req, res) {
    try {
      const { id } = req.params;
      const status = await songService.checkFileUploadStatus(id);
      
      res.status(200).json({
        success: true,
        message: 'File upload status retrieved successfully',
        data: status
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get songs ready for publishing (admin/cron)
  async getSongsReadyForPublishing(req, res) {
    try {
      const songs = await songService.getSongsReadyForPublishing();
      
      res.status(200).json({
        success: true,
        message: 'Songs ready for publishing fetched successfully',
        data: songs,
        count: songs.length
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Publish scheduled songs (admin/cron)
  async publishScheduledSongs(req, res) {
    try {
      const result = await songService.publishScheduledSongs();
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          count: result.count,
          songs: result.songs || []
        }
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },
  // Add these methods to your songController object

// Increment play count
async incrementPlayCount(req, res) {
  try {
    const { id } = req.params;
    const result = await songService.incrementPlayCount(id);
    
    res.status(200).json({
      success: true,
      message: 'Play count incremented',
      data: {
        playCount: result.playCount
      }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
},

// Like a song
async likeSong(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await songService.likeSong(id, userId);
    
    res.status(200).json({
      success: true,
      message: 'Song liked successfully',
      data: result
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
},

// Unlike a song
async unlikeSong(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await songService.unlikeSong(id, userId);
    
    res.status(200).json({
      success: true,
      message: 'Song unliked successfully',
      data: result
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
},

// Get song stats
async getSongStats(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // Optional if you want to check if user liked it
    
    const stats = await songService.getSongStats(id, userId);
    
    res.status(200).json({
      success: true,
      message: 'Song stats fetched successfully',
      data: stats
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
},
async getNewReleases(req, res) {
  try {
    const { page = 1, limit = 100 } = req.query;
    
    const result = await songService.getNewReleases(page, limit);
    
    res.status(200).json({
      success: true,
      message: 'New releases fetched successfully',
      data: result.songs,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
}
};

export default songController;