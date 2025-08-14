// ================================
// SONG SERVICE (services/songService.js)
// ================================

import { PrismaClient } from "@prisma/client";
import { 
  uploadSingleAudioFile, 
  uploadSingleCoverImage, 
  validateAudioFile, 
  validateCoverImage,
  deleteAudioFile,
  deleteCoverImage 
} from '../utils/audioHelper.js';
import AppError from "../utils/error.js";

const prisma = new PrismaClient();

function timeAgo(date) {
  // Calculate the difference in seconds
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  // Handle the "just now" case
  if (seconds < 29) {
    return "just now";
  }

  // Define time intervals in seconds
  const intervals = {
    year: 31536000,
    month: 2592000,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  // Loop through intervals to find the correct unit
  for (const unit in intervals) {
    const counter = Math.floor(seconds / intervals[unit]);
    if (counter > 0) {
      // Return the formatted string and handle plurals (e.g., "1 minute" vs. "2 minutes")
      return `${counter} ${unit}${counter > 1 ? 's' : ''} ago`;
    }
  }

  // Fallback for seconds (rarely reached)
  return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
}

const songService = {
  // Create a new song
  async createSong(songData, files = {}) {
    try {
      const { 
        title, 
        description, 
        musicTag, 
        pricing, 
        duration, 
        bpm, 
        userId,
        publishAt 
      } = songData;
      
      const { audioFile, coverImage } = files;
      
      if (!audioFile) {
        throw new AppError('Audio file is required', 400);
      }
      
      // Validate files (but don't upload yet)
      validateAudioFile(audioFile);
      if (coverImage) {
        validateCoverImage(coverImage);
      }
      
      // Determine status based on publishAt
      let status = 'DRAFT';
      let publishAtDate = null;
      
      if (publishAt) {
        publishAtDate = new Date(publishAt);
        if (publishAtDate > new Date()) {
          status = 'SCHEDULED';
        } else {
          status = 'PUBLISHED';
        }
      } else {
        // If no schedule date provided, auto-publish
        status = 'PUBLISHED';
        publishAtDate = new Date();
      }
      
      // Create song immediately without waiting for file uploads
      const song = await prisma.song.create({
        data: {
          title,
          description,
          musicTag,
          pricing: pricing ? parseFloat(pricing) : 0.00,
          duration: duration || '00:00',
          bpm: bpm ? parseInt(bpm) : null,
          userId,
          status,
          publishAt: publishAtDate,
          publishedAt: status === 'PUBLISHED' ? new Date() : null,
          // Files will be updated in background
          audioFile: null,
          audioFilename: null,
          coverImage: null,
          coverImageFilename: null
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      // Handle file uploads in background
      setImmediate(() => {
        songService.uploadSongFilesBackground(song.id, { audioFile, coverImage });
      });
      
      return song;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create song', 500);
    }
  },

  // Get all songs with pagination and filters
  async getAllSongs(page = 1, limit = 10, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const { search, musicTag, status, userId } = filters;
      
      let whereClause = {};
      
      if (search) {
        whereClause.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } }
        ];
      }
      
      if (musicTag) {
        whereClause.musicTag = { contains: musicTag, mode: 'insensitive' };
      }
      
      if (status) {
        whereClause.status = status;
      }
      
      if (userId) {
        whereClause.userId = userId;
      }
      
      const [songs, totalSongs] = await Promise.all([
        prisma.song.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.song.count({ where: whereClause })
      ]);
      
      return {
        songs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalSongs / limit),
          totalSongs,
          hasNext: skip + songs.length < totalSongs,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new AppError('Failed to fetch songs', 500);
    }
  },

  // Get published songs only (for public API)
  async getPublishedSongs(page = 1, limit = 10, filters = {}) {
    try {
      const filtersWithPublished = {
        ...filters,
        status: 'PUBLISHED'
      };
      
      return await this.getAllSongs(page, limit, filtersWithPublished);
    } catch (error) {
      throw new AppError('Failed to fetch published songs', 500);
    }
  },

  // Get song by ID
  async getSongById(id) {
    try {
      const song = await prisma.song.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      if (!song) {
        throw new AppError('Song not found', 404);
      }
      
      return song;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch song', 500);
    }
  },

  // Update song
  async updateSong(id, updateData, files = {}) {
    try {
      const existingSong = await prisma.song.findUnique({
        where: { id }
      });
      
      if (!existingSong) {
        throw new AppError('Song not found', 404);
      }
      
      const { audioFile, coverImage } = files;
      
      // Validate files if provided
      if (audioFile) {
        validateAudioFile(audioFile);
      }
      if (coverImage) {
        validateCoverImage(coverImage);
      }
      
      // Handle status and publish date logic
      if (updateData.publishAt) {
        const publishAtDate = new Date(updateData.publishAt);
        updateData.publishAt = publishAtDate;
        
        if (publishAtDate > new Date()) {
          updateData.status = 'SCHEDULED';
          updateData.publishedAt = null;
        } else if (existingSong.status !== 'PUBLISHED') {
          updateData.status = 'PUBLISHED';
          updateData.publishedAt = new Date();
        }
      }
      
      // Convert numeric fields
      if (updateData.pricing) {
        updateData.pricing = parseFloat(updateData.pricing);
      }
      if (updateData.bpm) {
        updateData.bpm = parseInt(updateData.bpm);
      }
      
      // Update song immediately without waiting for file uploads
      const updatedSong = await prisma.song.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      // Handle file uploads in background if files provided
      if (audioFile || coverImage) {
        const oldFiles = {
          audioFilename: existingSong.audioFilename,
          coverImageFilename: existingSong.coverImageFilename
        };
        
        setImmediate(() => {
          songService.uploadSongFilesBackground(id, { audioFile, coverImage }, oldFiles);
        });
      }
      
      return updatedSong;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update song', 500);
    }
  },

  // Delete song
  async deleteSong(id) {
    try {
      const existingSong = await prisma.song.findUnique({
        where: { id }
      });
      
      if (!existingSong) {
        throw new AppError('Song not found', 404);
      }
      
      // Delete files in background
      if (existingSong.audioFilename || existingSong.coverImageFilename) {
        setImmediate(async () => {
          try {
            if (existingSong.audioFilename) {
              await deleteAudioFile(existingSong.audioFilename);
            }
            if (existingSong.coverImageFilename) {
              await deleteCoverImage(existingSong.coverImageFilename);
            }
            console.log(`Successfully deleted files for song: ${existingSong.title}`);
          } catch (deleteError) {
            console.warn('Failed to delete song files:', deleteError.message);
          }
        });
      }
      
      await prisma.song.delete({
        where: { id }
      });
      
      return { message: 'Song deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete song', 500);
    }
  },

  // Publish song immediately
  async publishSong(id) {
    try {
      const song = await prisma.song.findUnique({
        where: { id }
      });
      
      if (!song) {
        throw new AppError('Song not found', 404);
      }
      
      if (song.status === 'PUBLISHED') {
        throw new AppError('Song is already published', 400);
      }
      
      const updatedSong = await prisma.song.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          publishAt: new Date() // Set to now
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      return updatedSong;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to publish song', 500);
    }
  },

  // Get songs ready for publishing (for cron job)
  async getSongsReadyForPublishing() {
    try {
      const now = new Date();
      
      const songs = await prisma.song.findMany({
        where: {
          status: 'SCHEDULED',
          publishAt: {
            lte: now
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      return songs;
    } catch (error) {
      throw new AppError('Failed to fetch songs ready for publishing', 500);
    }
  },

  // Publish scheduled songs (for cron job)
  async publishScheduledSongs() {
    try {
      const songsToPublish = await this.getSongsReadyForPublishing();
      
      if (songsToPublish.length === 0) {
        return { message: 'No songs ready for publishing', count: 0 };
      }
      
      const publishedSongs = [];
      
      for (const song of songsToPublish) {
        try {
          const updatedSong = await prisma.song.update({
            where: { id: song.id },
            data: {
              status: 'PUBLISHED',
              publishedAt: new Date()
            }
          });
          publishedSongs.push(updatedSong);
          console.log(`Published song: ${song.title} by ${song.user.name}`);
        } catch (error) {
          console.error(`Failed to publish song ${song.id}:`, error.message);
        }
      }
      
      return {
        message: `Successfully published ${publishedSongs.length} songs`,
        count: publishedSongs.length,
        songs: publishedSongs
      };
    } catch (error) {
      throw new AppError('Failed to publish scheduled songs', 500);
    }
  },

  // Background file upload method
  async uploadSongFilesBackground(songId, files, oldFiles = {}) {
    try {
      console.log(`Starting background file upload for song ${songId}`);
      
      const { audioFile, coverImage } = files;
      const { audioFilename: oldAudioFilename, coverImageFilename: oldCoverFilename } = oldFiles;
      
      let audioResult = null;
      let coverResult = null;
      
      // Upload audio file
      if (audioFile) {
        audioResult = await uploadSingleAudioFile(audioFile);
        console.log(`Audio uploaded successfully: ${audioResult.url}`);
        
        // Auto-update duration if not provided or if different
        if (audioResult.duration && audioResult.duration !== "00:00") {
          try {
            await prisma.song.update({
              where: { id: songId },
              data: { duration: audioResult.duration }
            });
            console.log(`Updated song duration to: ${audioResult.duration}`);
          } catch (durationUpdateError) {
            console.warn('Failed to update duration:', durationUpdateError.message);
          }
        }
      }
      
      // Upload cover image
      if (coverImage) {
        coverResult = await uploadSingleCoverImage(coverImage);
        console.log(`Cover image uploaded successfully: ${coverResult.url}`);
      }
      
      // Update song with new file data
      const updateData = {};
      if (audioResult) {
        updateData.audioFile = audioResult.url;
        updateData.audioFilename = audioResult.filename;
      }
      if (coverResult) {
        updateData.coverImage = coverResult.url;
        updateData.coverImageFilename = coverResult.filename;
      }
      
      if (Object.keys(updateData).length > 0) {
        await prisma.song.update({
          where: { id: songId },
          data: updateData
        });
      }
      
      // Delete old files only if new files were successfully uploaded
      if (audioResult && oldAudioFilename && oldAudioFilename !== audioResult.filename) {
        try {
          await deleteAudioFile(oldAudioFilename);
          console.log(`Successfully deleted old audio: ${oldAudioFilename}`);
        } catch (deleteError) {
          console.warn(`Failed to delete old audio ${oldAudioFilename}:`, deleteError.message);
        }
      }
      
      if (coverResult && oldCoverFilename && oldCoverFilename !== coverResult.filename) {
        try {
          await deleteCoverImage(oldCoverFilename);
          console.log(`Successfully deleted old cover: ${oldCoverFilename}`);
        } catch (deleteError) {
          console.warn(`Failed to delete old cover ${oldCoverFilename}:`, deleteError.message);
        }
      }
      
      console.log(`Background file upload completed for song ${songId}`);
    } catch (error) {
      console.error(`Background file upload failed for song ${songId}:`, error.message);
      
      // Update song with upload failure status if needed
      try {
        await prisma.song.update({
          where: { id: songId },
          data: {
            // Could add uploadStatus: 'failed' field if you want to track this
          }
        });
      } catch (dbError) {
        console.error(`Failed to update upload status for song ${songId}:`, dbError.message);
      }
    }
  },

  // Check file upload status
  async checkFileUploadStatus(songId) {
    try {
      const song = await prisma.song.findUnique({
        where: { id: songId },
        select: {
          id: true,
          audioFile: true,
          audioFilename: true,
          coverImage: true,
          coverImageFilename: true
        }
      });
      
      if (!song) {
        throw new AppError('Song not found', 404);
      }
      
      return {
        hasAudio: !!song.audioFile,
        audioUrl: song.audioFile,
        audioFilename: song.audioFilename,
        hasCover: !!song.coverImage,
        coverUrl: song.coverImage,
        coverFilename: song.coverImageFilename
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to check file upload status', 500);
    }
  },
  // Add these methods to your songService object

// Increment play count
async incrementPlayCount(songId) {
  try {
    const song = await prisma.song.update({
      where: { id: songId },
      data: {
        playCount: {
          increment: 1
        }
      },
      select: {
        id: true,
        playCount: true
      }
    });
    
    return song;
  } catch (error) {
    throw new AppError('Failed to increment play count', 500);
  }
},

// Like a song
async likeSong(songId, userId) {
  try {
    // Check if song exists
    const song = await prisma.song.findUnique({
      where: { id: songId }
    });
    
    if (!song) {
      throw new AppError('Song not found', 404);
    }
    
    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_songId: {
          userId,
          songId
        }
      }
    });
    
    if (existingLike) {
      throw new AppError('Song already liked', 400);
    }
    
    // Create like and increment count in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create like
      const like = await tx.like.create({
        data: {
          userId,
          songId
        }
      });
      
      // Increment like count
      const updatedSong = await tx.song.update({
        where: { id: songId },
        data: {
          likeCount: {
            increment: 1
          }
        },
        select: {
          id: true,
          likeCount: true
        }
      });
      
      return {
        liked: true,
        likeCount: updatedSong.likeCount
      };
    });
    
    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to like song', 500);
  }
},

// Unlike a song
async unlikeSong(songId, userId) {
  try {
    // Check if like exists
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_songId: {
          userId,
          songId
        }
      }
    });
    
    if (!existingLike) {
      throw new AppError('Song not liked yet', 400);
    }
    
    // Delete like and decrement count in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete like
      await tx.like.delete({
        where: {
          userId_songId: {
            userId,
            songId
          }
        }
      });
      
      // Decrement like count
      const updatedSong = await tx.song.update({
        where: { id: songId },
        data: {
          likeCount: {
            decrement: 1
          }
        },
        select: {
          id: true,
          likeCount: true
        }
      });
      
      return {
        liked: false,
        likeCount: updatedSong.likeCount
      };
    });
    
    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to unlike song', 500);
  }
},

// Get song stats
async getSongStats(songId, userId = null) {
  try {
    const song = await prisma.song.findUnique({
      where: { id: songId },
      select: {
        id: true,
        playCount: true,
        likeCount: true
      }
    });
    
    if (!song) {
      throw new AppError('Song not found', 404);
    }
    
    let isLikedByUser = false;
    
    // Check if user has liked this song
    if (userId) {
      const userLike = await prisma.like.findUnique({
        where: {
          userId_songId: {
            userId,
            songId
          }
        }
      });
      
      isLikedByUser = !!userLike;
    }
    
    return {
      playCount: song.playCount,
      likeCount: song.likeCount,
      isLikedByUser
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch song stats', 500);
  }
},

// getNewReleases function using the custom timeAgo helper
async  getNewReleases(page = 1, limit = 10) {
  try {
    const skip = (page - 1) * limit;

    // 1. Get the total count for accurate pagination (this is a corrected implementation)
    const totalSongsCount = await prisma.song.count({
      where: {
        status: 'PUBLISHED'
      },
    });

    // 2. Fetch the songs for the current page
    const newReleases = await prisma.song.findMany({
      where: {
        status: 'PUBLISHED'
      },
      orderBy: {
        publishedAt: 'desc'
      },
      skip,
      take: parseInt(limit),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // 3. Add the 'publishedAgo' field using our custom helper function
    const songsWithTimeAgo = newReleases.map(song => ({
      ...song,
      publishedAgo: timeAgo(song.publishedAt)
    }));

    // 4. Return the results with corrected pagination
    return {
      songs: songsWithTimeAgo,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalSongsCount / limit),
        totalSongs: totalSongsCount,
        hasNext: skip + newReleases.length < totalSongsCount,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error(error); // It's good practice to log the actual error for debugging
    throw new AppError('Failed to fetch new releases', 500);
  }
}
};

export default songService;