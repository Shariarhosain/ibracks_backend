// ================================
// SONG ROUTES (routes/songRoutes.js)
// ================================

import express from 'express';
import songController from '../controllers/songController.js';
import { uploadSongFiles, handleAudioMulterError } from '../utils/audioHelper.js';
import verifyToken from '../middlewares/verifytoken.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/published', songController.getPublishedSongs); // Get published songs for public
router.get('/published/:id', songController.getSongById); // Get specific published song

//new relize song
router.get('/new-releases', songController.getNewReleases); // Get new releases

// Protected routes (require authentication)
router.use(verifyToken); // Apply middleware to all routes below

// User song management routes
router.post('/', uploadSongFiles, songController.createSong); // Create new song
router.get('/my-songs', songController.getMySongs); // Get user's own songs
router.get('/:id', songController.getSongById); // Get specific song
router.put('/:id', uploadSongFiles, songController.updateSong); // Update song
router.delete('/:id', songController.deleteSong); // Delete song
router.patch('/:id/publish', songController.publishSong); // Publish song immediately
router.get('/:id/upload-status', songController.checkFileUploadStatus); // Check upload status

// Admin/Management routes (you might want to add role-based middleware)
router.get('/', songController.getAllSongs); // Get all songs (admin)
router.get('/scheduled/ready', songController.getSongsReadyForPublishing); // Get songs ready to publish
router.post('/scheduled/publish', songController.publishScheduledSongs); // Publish scheduled songs (cron endpoint)

// Add these routes after your existing routes (before the error handler)

// Song interaction routes
router.post('/:id/play', songController.incrementPlayCount); // Track song play
router.post('/:id/like', songController.likeSong); // Like a song
router.delete('/:id/like', songController.unlikeSong); // Unlike a song
router.get('/:id/stats', songController.getSongStats); // Get play count and like status

// Apply multer error handling middleware
router.use(handleAudioMulterError);

export default router;

// ================================
// ADDITIONAL ADMIN ROUTES (routes/adminRoutes.js) - Optional separate file
// ================================

// import express from 'express';
// import songController from '../controllers/songController.js';
// import verifyToken from '../middlewares/verifytoken.js';
// import verifyAdmin from '../middlewares/verifyAdmin.js'; // If you have admin middleware

// const router = express.Router();

// // Apply authentication and admin middlewares
// router.use(verifyToken);
// router.use(verifyAdmin); // Uncomment if you have admin role checking

// // Admin-only song management
// router.get('/songs', songController.getAllSongs);
// router.get('/songs/scheduled/ready', songController.getSongsReadyForPublishing);
// router.post('/songs/scheduled/publish', songController.publishScheduledSongs);
// router.delete('/songs/:id', songController.deleteSong); // Force delete any song
// router.patch('/songs/:id/publish', songController.publishSong); // Force publish any song

// export default router;