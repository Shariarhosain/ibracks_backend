// ================================
// REMOTE-ONLY AUDIO HELPER (utils/audioHelper.js)
// ================================

import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs'; // Add this import for file streams
import { fileURLToPath } from 'url';
import axios from 'axios';
import FormData from 'form-data';
import { parseFile } from 'music-metadata'; // NEW: For accurate duration reading
import AppError from './error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Remote upload server URL
const REMOTE_UPLOAD_URL = process.env.REMOTE_UPLOAD_URL || 'http://localhost:3100';

// Configure axios instance for remote uploads
const uploadClient = axios.create({
  baseURL: REMOTE_UPLOAD_URL,
  timeout: 300000, // 5 minutes timeout for large files
  headers: {
    'User-Agent': 'AudioHelper-Remote/1.0.0',
    'Accept': 'application/json'
  }
});

// Add request interceptor for logging
uploadClient.interceptors.request.use((config) => {
  console.log(`🚀 Uploading to remote: ${config.baseURL}${config.url}`);
  return config;
});

// Add response interceptor for error handling
uploadClient.interceptors.response.use(
  (response) => {
    console.log(`✅ Remote upload successful: ${response.status}`);
    return response;
  },
  (error) => {
    console.error(`❌ Remote upload failed: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    return Promise.reject(error);
  }
);

// Configure temporary storage for processing before remote upload
const tempStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const tempDir = path.join(__dirname, '../temp');
    try {
      await fs.mkdir(tempDir, { recursive: true });
      cb(null, tempDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const prefix = file.mimetype.startsWith('audio/') ? 'temp-audio' : 'temp-image';
    cb(null, `${prefix}-${uniqueSuffix}${extension}`);
  }
});

// File filter for audio files
const audioFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/m4a',
    'audio/aac'
  ];
  
  const allowedExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new AppError('Only audio files (MP3, WAV, OGG, M4A, AAC) are allowed', 400), false);
  }
};

// File filter for cover images
const imageFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files (JPEG, PNG, WebP, GIF) are allowed', 400), false);
  }
};

// Multer configuration for audio uploads (temp storage)
export const uploadAudio = multer({
  storage: tempStorage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for audio
  }
});

// Multer configuration for image uploads (temp storage)
export const uploadImage = multer({
  storage: tempStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit for images
  }
});

// Combined upload for song creation (audio + cover)
export const uploadSongFiles = multer({
  storage: tempStorage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audioFile') {
      audioFileFilter(req, file, cb);
    } else if (file.fieldname === 'coverImage') {
      imageFileFilter(req, file, cb);
    } else {
      cb(new AppError('Unexpected field name', 400), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
    files: 2 // Max 2 files (audio + cover)
  }
}).fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]);

// Upload single audio file middleware
export const uploadSingleAudio = uploadAudio.single('audioFile');

// Upload single cover image middleware
export const uploadSingleCover = uploadImage.single('coverImage');

// Validate audio file
export const validateAudioFile = (file) => {
  if (!file) {
    throw new AppError('No audio file provided', 400);
  }
  
  const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'];
  const allowedExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!allowedMimes.includes(file.mimetype) || !allowedExtensions.includes(fileExtension)) {
    throw new AppError('Invalid audio file format', 400);
  }
  
  // Check file size (100MB)
  if (file.size > 100 * 1024 * 1024) {
    throw new AppError('Audio file too large. Maximum size is 100MB', 400);
  }
  
  return true;
};

// Validate cover image
export const validateCoverImage = (file) => {
  if (!file) return true; // Cover is optional
  
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!allowedMimes.includes(file.mimetype) || !allowedExtensions.includes(fileExtension)) {
    throw new AppError('Invalid image file format', 400);
  }
  
  // Check file size (20MB)
  if (file.size > 20 * 1024 * 1024) {
    throw new AppError('Cover image too large. Maximum size is 20MB', 400);
  }
  
  return true;
};

// Upload file to remote server - FIXED VERSION
export const uploadToRemoteServer = async (file, endpoint, fieldName = 'file') => {
  try {
    if (!file || !file.path) {
      throw new AppError('Invalid file provided for upload', 400);
    }

    const formData = new FormData();
    // FIXED: Use the imported createReadStream function
    const fileStream = createReadStream(file.path);
    
    formData.append(fieldName, fileStream, {
      filename: file.originalname,
      contentType: file.mimetype,
      knownLength: file.size // Add the known file size
    });
    
    console.log(`📤 Uploading ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB) to ${endpoint}...`);
    
    // Remove the Content-Length header to let FormData handle it
    const response = await uploadClient.post(endpoint, formData, {
      headers: {
        ...formData.getHeaders()
        // Remove Content-Length - let axios calculate it
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (percentCompleted % 25 === 0) { // Log every 25%
          console.log(`📊 Upload progress: ${percentCompleted}%`);
        }
      }
    });
    
    console.log(`✅ Remote upload completed successfully`);
    return response.data;
  } catch (error) {
    console.error(`❌ Remote upload failed:`, error.message);
    
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      throw new AppError(`Remote server error (${status}): ${message}`, status);
    } else if (error.code === 'ECONNREFUSED') {
      throw new AppError('Cannot connect to remote server. Server may be down.', 503);
    } else if (error.code === 'ETIMEDOUT') {
      throw new AppError('Upload timeout. File may be too large or connection is slow.', 408);
    } else {
      throw new AppError(`Remote upload failed: ${error.message}`, 500);
    }
  }
};

// Clean up temporary file
const cleanupTempFile = async (filePath) => {
  try {
    if (filePath && await fs.access(filePath).then(() => true).catch(() => false)) {
      await fs.unlink(filePath);
      console.log(`🗑️ Cleaned up temp file: ${path.basename(filePath)}`);
    }
  } catch (error) {
    console.warn(`⚠️ Failed to cleanup temp file: ${error.message}`);
  }
};

// ========================================
// IMPROVED DURATION FUNCTIONS
// ========================================

// ACCURATE: Get actual audio duration from file metadata
export const getAudioDurationAccurate = async (filePath) => {
  try {
    console.log(`🎵 Reading audio metadata from: ${path.basename(filePath)}`);
    
    // Parse the audio file to get metadata
    const metadata = await parseFile(filePath);
    
    if (metadata.format && metadata.format.duration) {
      const totalSeconds = Math.floor(metadata.format.duration);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      const formattedDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      console.log(`✅ Actual duration: ${formattedDuration}`);
      return formattedDuration;
    } else {
      console.warn(`⚠️ No duration found in metadata`);
      return "00:00";
    }
  } catch (error) {
    console.warn(`⚠️ Failed to read audio metadata: ${error.message}`);
    return "00:00";
  }
};

// ENHANCED: Better filename duration extraction
export const extractDurationFromFilename = (filename) => {
  try {
    const patterns = [
      /(\d{1,2})[:\-\.](\d{2})/,          // "3:45", "3-45", "3.45"
      /(\d+)[m:min]+(\d+)[s:sec]*/i,      // "3m45s", "3min45sec"
      /(\d+)m(\d+)/i,                     // "3m45"
      /\[(\d{1,2}):(\d{2})\]/,           // "[3:45]"
      /\((\d{1,2}):(\d{2})\)/,           // "(3:45)"
      /_(\d{1,2})_(\d{2})_/,             // "_3_45_"
    ];
    
    for (const pattern of patterns) {
      const match = filename.match(pattern);
      if (match) {
        const minutes = parseInt(match[1]) || 0;
        const seconds = parseInt(match[2]) || 0;
        
        // Validate the extracted time
        if (minutes >= 0 && minutes < 60 && seconds >= 0 && seconds < 60) {
          const duration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          console.log(`📝 Found duration in filename: ${duration}`);
          return duration;
        }
      }
    }
    
    return "00:00";
  } catch (error) {
    console.warn('Filename duration extraction failed:', error.message);
    return "00:00";
  }
};

// IMPROVED: Better file size estimation with more accurate bitrates
export const estimateDurationFromFileSize = (filePath, fileSize) => {
  try {
    const extension = path.extname(filePath).toLowerCase();
    
    // More realistic bitrate estimates based on common encoding settings
    let estimatedBitrate = 128; // Default bitrate in kbps
    let overhead = 0.95; // Account for metadata and container overhead
    
    switch (extension) {
      case '.mp3':
        estimatedBitrate = 192; // More common modern bitrate
        overhead = 0.93; // MP3 has ID3 tags
        break;
      case '.wav':
        estimatedBitrate = 1411; // 16-bit 44.1kHz stereo
        overhead = 0.99; // WAV has minimal overhead
        break;
      case '.m4a':
        estimatedBitrate = 256; // AAC in M4A container
        overhead = 0.94; // M4A has metadata
        break;
      case '.ogg':
        estimatedBitrate = 192; // Common Vorbis bitrate
        overhead = 0.95;
        break;
      case '.aac':
        estimatedBitrate = 192; // Modern AAC bitrate
        overhead = 0.96;
        break;
      case '.flac':
        // FLAC compression ratio varies, estimate based on file size
        estimatedBitrate = Math.max(400, Math.min(1000, (fileSize * 8) / 300)); // 300 second max estimate
        overhead = 0.98;
        break;
    }
    
    // Calculate with overhead consideration
    const effectiveFileSize = fileSize * overhead;
    const estimatedSeconds = Math.floor((effectiveFileSize * 8) / (estimatedBitrate * 1000));
    
    // Sanity check - audio files shouldn't be longer than 2 hours or shorter than 1 second
    if (estimatedSeconds <= 0 || estimatedSeconds > 7200) {
      return "00:00";
    }
    
    const minutes = Math.floor(estimatedSeconds / 60);
    const seconds = estimatedSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } catch (error) {
    console.warn('Duration estimation failed:', error.message);
    return "00:00";
  }
};

// IMPROVED: Get audio duration with multiple fallback methods
export const getAudioDurationSafe = async (filePath, fileSize) => {
  try {
    // Method 1: Try to get actual duration from audio metadata (MOST ACCURATE)
    try {
      const actualDuration = await getAudioDurationAccurate(filePath);
      if (actualDuration !== "00:00") {
        console.log(`✅ Using actual duration from metadata: ${actualDuration}`);
        return actualDuration;
      }
    } catch (metadataError) {
      console.warn(`⚠️ Metadata reading failed: ${metadataError.message}`);
    }
    
    // Method 2: Check if user provided duration in filename
    const filename = path.basename(filePath);
    const durationFromName = extractDurationFromFilename(filename);
    if (durationFromName !== "00:00") {
      console.log(`✅ Using duration from filename: ${durationFromName}`);
      return durationFromName;
    }
    
    // Method 3: Improved estimation based on file size (LAST RESORT)
    const estimatedDuration = estimateDurationFromFileSize(filePath, fileSize);
    console.log(`⚠️ Using estimated duration: ${estimatedDuration}`);
    return estimatedDuration;
    
  } catch (error) {
    console.warn('All duration methods failed:', error.message);
    return "00:00";
  }
};

// ========================================
// UPLOAD FUNCTIONS
// ========================================

// REMOTE: Upload single audio file to img.batteryqk.com - UPDATED WITH ACCURATE DURATION
export const uploadSingleAudioFile = async (file) => {
  let tempFilePath = null;
  
  try {
    validateAudioFile(file);
    tempFilePath = file.path;
    
    console.log(`🎵 Starting remote audio upload: ${file.originalname}`);
    
    // Upload to remote server
    const remoteResponse = await uploadToRemoteServer(file, '/upload/audio', 'audio');
    
    if (!remoteResponse || !remoteResponse.success || !remoteResponse.data) {
      throw new AppError('Invalid response from remote server', 500);
    }
    
    // Get accurate audio duration
    let duration = "00:00";
    try {
      // Use the new accurate duration method
      duration = await getAudioDurationSafe(file.path, file.size);
      console.log(`🕐 Duration detected: ${duration} for ${file.originalname}`);
    } catch (durationError) {
      console.warn(`⚠️ Could not determine duration for ${file.originalname}:`, durationError.message);
      duration = "00:00";
    }
    
    const result = {
      url: remoteResponse.data.url,
      filename: remoteResponse.data.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      duration: duration, // Now this will be accurate!
      uploadedAt: new Date().toISOString(),
      remoteResponse: remoteResponse
    };
    
    console.log(`✅ Audio uploaded successfully: ${result.url} (Duration: ${duration})`);
    return result;
    
  } catch (error) {
    console.error(`❌ Audio upload failed: ${error.message}`);
    throw error;
  } finally {
    // Always clean up temp file
    if (tempFilePath) {
      await cleanupTempFile(tempFilePath);
    }
  }
};

// REMOTE: Upload single cover image to img.batteryqk.com
export const uploadSingleCoverImage = async (file) => {
  let tempFilePath = null;
  
  try {
    validateCoverImage(file);
    tempFilePath = file.path;
    
    console.log(`🖼️ Starting remote image upload: ${file.originalname}`);
    
    // Upload to remote server
    const remoteResponse = await uploadToRemoteServer(file, '/upload/image', 'image');
    
    if (!remoteResponse || !remoteResponse.success || !remoteResponse.data) {
      throw new AppError('Invalid response from remote server', 500);
    }
    
    const result = {
      url: remoteResponse.data.url,
      filename: remoteResponse.data.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date().toISOString(),
      remoteResponse: remoteResponse
    };
    
    console.log(`✅ Image uploaded successfully: ${result.url}`);
    return result;
    
  } catch (error) {
    console.error(`❌ Image upload failed: ${error.message}`);
    throw error;
  } finally {
    // Always clean up temp file
    if (tempFilePath) {
      await cleanupTempFile(tempFilePath);
    }
  }
};

// Delete file from remote server
export const deleteRemoteFile = async (filename, type = 'audio') => {
  try {
    if (!filename) {
      throw new AppError('Filename is required for deletion', 400);
    }
    
    console.log(`🗑️ Deleting remote ${type} file: ${filename}`);
    
    const response = await uploadClient.delete(`/files/${type}/${filename}`);
    
    if (response.data && response.data.success) {
      console.log(`✅ Remote ${type} file deleted successfully: ${filename}`);
      return response.data;
    } else {
      throw new AppError('Failed to delete remote file', 500);
    }
  } catch (error) {
    console.error(`❌ Remote deletion failed: ${error.message}`);
    if (error.response?.status === 404) {
      // Don't throw error for 404 - file might already be deleted
      console.warn(`⚠️ File not found (already deleted?): ${filename}`);
      return { success: true, message: 'File not found (already deleted)', filename };
    }
    throw new AppError(`Failed to delete remote ${type} file: ${error.message}`, error.response?.status || 500);
  }
};

// Delete audio file from remote server
export const deleteAudioFile = async (filename) => {
  return await deleteRemoteFile(filename, 'audio');
};

// Delete cover image from remote server
export const deleteCoverImage = async (filename) => {
  return await deleteRemoteFile(filename, 'image');
};

// Get remote file list
export const getRemoteFileList = async () => {
  try {
    console.log(`📋 Fetching file list from remote server...`);
    
    const response = await uploadClient.get('/files');
    
    if (response.data && response.data.success) {
      console.log(`✅ File list retrieved successfully`);
      return response.data.data;
    } else {
      throw new AppError('Invalid response from remote server', 500);
    }
  } catch (error) {
    console.error(`❌ Failed to fetch remote file list: ${error.message}`);
    throw new AppError(`Failed to fetch remote file list: ${error.message}`, error.response?.status || 500);
  }
};

// Test remote server connection
export const testRemoteConnection = async () => {
  try {
    console.log(`🔍 Testing connection to ${REMOTE_UPLOAD_URL}...`);
    
    const response = await uploadClient.get('/health', { timeout: 10000 });
    
    if (response.status === 200) {
      console.log(`✅ Remote server connection successful`);
      return { 
        success: true, 
        status: response.status,
        data: response.data,
        server: REMOTE_UPLOAD_URL,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error(`Server returned status: ${response.status}`);
    }
  } catch (error) {
    console.error(`❌ Remote server connection failed: ${error.message}`);
    return { 
      success: false, 
      error: error.message,
      server: REMOTE_UPLOAD_URL,
      timestamp: new Date().toISOString()
    };
  }
};

// Get remote server info
export const getRemoteServerInfo = async () => {
  try {
    console.log(`ℹ️ Getting remote server info...`);
    
    const response = await uploadClient.get('/', { timeout: 10000 });
    
    if (response.status === 200) {
      console.log(`✅ Server info retrieved successfully`);
      return { 
        success: true, 
        data: response.data,
        server: REMOTE_UPLOAD_URL
      };
    } else {
      throw new Error(`Server returned status: ${response.status}`);
    }
  } catch (error) {
    console.error(`❌ Failed to get server info: ${error.message}`);
    return { 
      success: false, 
      error: error.message,
      server: REMOTE_UPLOAD_URL
    };
  }
};

// Alternative method using FFprobe (if you have FFmpeg installed)
export const getAudioDurationFFprobe = async (filePath) => {
  try {
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ]);
      
      let output = '';
      let error = '';
      
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ffprobe.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output);
            const duration = parseFloat(info.format.duration);
            
            if (duration && duration > 0) {
              const totalSeconds = Math.floor(duration);
              const minutes = Math.floor(totalSeconds / 60);
              const seconds = totalSeconds % 60;
              
              const formattedDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
              resolve(formattedDuration);
            } else {
              resolve("00:00");
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse FFprobe output: ${parseError.message}`));
          }
        } else {
          reject(new Error(`FFprobe failed with code ${code}: ${error}`));
        }
      });
      
      ffprobe.on('error', (err) => {
        reject(new Error(`FFprobe error: ${err.message}`));
      });
    });
  } catch (error) {
    throw new Error(`FFprobe not available: ${error.message}`);
  }
};

// Handle multer errors
export const handleAudioMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Audio max: 100MB, Image max: 20MB';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = error.message;
    }
    
    return res.status(400).json({
      success: false,
      message
    });
  }
  
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Clean up temp directory on startup
const cleanupTempDir = async () => {
  try {
    const tempDir = path.join(__dirname, '../temp');
    const files = await fs.readdir(tempDir).catch(() => []);
    
    if (files.length > 0) {
      console.log(`🧹 Cleaning up ${files.length} temp files...`);
      await Promise.all(files.map(file => 
        fs.unlink(path.join(tempDir, file)).catch(console.warn)
      ));
      console.log(`✅ Temp directory cleaned`);
    }
  } catch (error) {
    console.warn('Failed to cleanup temp directory:', error.message);
  }
};

// Initialize helper
const initializeHelper = async () => {
  try {
    // Create temp directory
    await fs.mkdir(path.join(__dirname, '../temp'), { recursive: true });
    
    // Clean up any existing temp files
    await cleanupTempDir();
    
    // Test remote connection
    const connectionTest = await testRemoteConnection();
    if (connectionTest.success) {
      console.log(`🌐 Connected to remote server: ${REMOTE_UPLOAD_URL}`);
    } else {
      console.warn(`⚠️ Cannot connect to remote server: ${connectionTest.error}`);
    }
    
  } catch (error) {
    console.error('Failed to initialize audio helper:', error.message);
  }
};

// Initialize on import
initializeHelper();

export default {
  uploadSongFiles,
  uploadSingleAudio,
  uploadSingleCover,
  validateAudioFile,
  validateCoverImage,
  uploadSingleAudioFile,
  uploadSingleCoverImage,
  deleteAudioFile,
  deleteCoverImage,
  uploadToRemoteServer,
  deleteRemoteFile,
  getRemoteFileList,
  testRemoteConnection,
  getRemoteServerInfo,
  getAudioDurationSafe,
  getAudioDurationAccurate,
  extractDurationFromFilename,
  estimateDurationFromFileSize,
  getAudioDurationFFprobe,
  handleAudioMulterError
};