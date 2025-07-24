
// ================================
// CRON JOB HELPER (utils/cronHelper.js)
// ================================

import cron from 'node-cron';
import songService from '../services/songService.js';

class CronJobHelper {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  // Initialize all cron jobs
  init() {
    if (this.isInitialized) {
      console.log('Cron jobs already initialized');
      return;
    }

    console.log('Initializing cron jobs...');
    
    // Schedule song publishing job
    this.scheduleSongPublishing();
    
    // Schedule cleanup jobs
    this.scheduleCleanupJobs();
    
    this.isInitialized = true;
    console.log('All cron jobs initialized successfully');
  }

  // Main job: Publish scheduled songs every minute
  scheduleSongPublishing() {
    const publishJob = cron.schedule('* * * * *', async () => {
      try {
        console.log(`[${new Date().toISOString()}] Running scheduled song publishing check...`);
        
        const result = await songService.publishScheduledSongs();
        
        if (result.count > 0) {
          console.log(`✅ Published ${result.count} scheduled songs`);
          
          // Log each published song
          result.songs.forEach(song => {
            console.log(`  📻 "${song.title}" - ID: ${song.id}`);
          });
        } else {
          console.log('ℹ️  No songs ready for publishing');
        }
      } catch (error) {
        console.error('❌ Error in song publishing cron job:', error.message);
        
        // You could add notification service here
        // await notificationService.sendAlert('Cron job failed', error.message);
      }
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });

    this.jobs.set('publishSongs', publishJob);
    publishJob.start();
    
    console.log('📅 Song publishing cron job scheduled (every minute)');
  }

  // Alternative: More frequent publishing check (every 30 seconds)
  scheduleFrequentPublishing() {
    const frequentJob = cron.schedule('*/30 * * * * *', async () => {
      try {
        const result = await songService.publishScheduledSongs();
        if (result.count > 0) {
          console.log(`🚀 Fast-published ${result.count} songs`);
        }
      } catch (error) {
        console.error('❌ Frequent publishing error:', error.message);
      }
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });

    this.jobs.set('frequentPublish', frequentJob);
    frequentJob.start();
    
    console.log('⚡ Frequent song publishing enabled (every 30 seconds)');
  }

  // Daily cleanup jobs
  scheduleCleanupJobs() {
    // Clean up orphaned files daily at 2 AM
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      try {
        console.log(`[${new Date().toISOString()}] Running daily cleanup...`);
        await this.cleanupOrphanedFiles();
        await this.updateSongStats();
        console.log('✅ Daily cleanup completed');
      } catch (error) {
        console.error('❌ Cleanup job error:', error.message);
      }
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });

    this.jobs.set('dailyCleanup', cleanupJob);
    cleanupJob.start();
    
    console.log('🧹 Daily cleanup job scheduled (2:00 AM)');
  }

  // Weekly statistics job
  scheduleWeeklyStats() {
    const statsJob = cron.schedule('0 0 * * 0', async () => {
      try {
        console.log(`[${new Date().toISOString()}] Generating weekly stats...`);
        await this.generateWeeklyReport();
        console.log('📊 Weekly statistics generated');
      } catch (error) {
        console.error('❌ Weekly stats error:', error.message);
      }
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });

    this.jobs.set('weeklyStats', statsJob);
    statsJob.start();
    
    console.log('📈 Weekly statistics job scheduled (Sundays at midnight)');
  }

  // Clean up orphaned files
  async cleanupOrphanedFiles() {
    try {
      console.log('🔍 Checking for orphaned files...');
      
      // This would need additional implementation
      // - Scan upload directories
      // - Check which files are referenced in database
      // - Remove unreferenced files
      
      const orphanedCount = 0; // Placeholder
      console.log(`🗑️  Removed ${orphanedCount} orphaned files`);
      
    } catch (error) {
      console.error('Error cleaning orphaned files:', error.message);
      throw error;
    }
  }

  // Update song statistics
  async updateSongStats() {
    try {
      console.log('📊 Updating song statistics...');
      
      // Example: Update play counts, download stats, etc.
      // This would connect to your analytics service
      
      console.log('✅ Song statistics updated');
    } catch (error) {
      console.error('Error updating song stats:', error.message);
      throw error;
    }
  }

  // Generate weekly report
  async generateWeeklyReport() {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get weekly statistics
      const stats = await this.getWeeklyStats(startDate, endDate);
      
      console.log('📋 Weekly Report:', {
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        newSongs: stats.newSongs,
        publishedSongs: stats.publishedSongs,
        scheduledSongs: stats.scheduledSongs
      });

      // Could email this report to admins
      // await emailService.sendWeeklyReport(stats);
      
    } catch (error) {
      console.error('Error generating weekly report:', error.message);
      throw error;
    }
  }

  // Get weekly statistics
  async getWeeklyStats(startDate, endDate) {
    try {
      // This would use your Prisma client to get stats
      return {
        newSongs: 0,
        publishedSongs: 0,
        scheduledSongs: 0,
        totalDuration: '00:00',
        averagePrice: 0
      };
    } catch (error) {
      console.error('Error fetching weekly stats:', error.message);
      throw error;
    }
  }

  // Manual trigger for publishing (useful for testing)
  async triggerPublishing() {
    try {
      console.log('🔧 Manual publishing trigger...');
      const result = await songService.publishScheduledSongs();
      console.log(`✅ Manually published ${result.count} songs`);
      return result;
    } catch (error) {
      console.error('❌ Manual publishing failed:', error.message);
      throw error;
    }
  }

  // Get cron job status
  getJobStatus() {
    const status = {};
    
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running,
        scheduled: job.scheduled,
        nextRun: job.nextDate ? job.nextDate().toISOString() : null
      };
    });
    
    return {
      initialized: this.isInitialized,
      totalJobs: this.jobs.size,
      jobs: status
    };
  }

  // Start specific job
  startJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.start();
      console.log(`▶️  Started job: ${jobName}`);
      return true;
    }
    console.warn(`⚠️  Job not found: ${jobName}`);
    return false;
  }

  // Stop specific job
  stopJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      console.log(`⏹️  Stopped job: ${jobName}`);
      return true;
    }
    console.warn(`⚠️  Job not found: ${jobName}`);
    return false;
  }

  // Stop all jobs
  stopAllJobs() {
    console.log('🛑 Stopping all cron jobs...');
    
    this.jobs.forEach((job, name) => {
      job.destroy();
      console.log(`  ❌ Destroyed job: ${name}`);
    });
    
    this.jobs.clear();
    this.isInitialized = false;
    
    console.log('✅ All cron jobs stopped');
  }

  // Graceful shutdown
  shutdown() {
    console.log('🔄 Graceful shutdown of cron jobs...');
    this.stopAllJobs();
    console.log('👋 Cron job helper shutdown complete');
  }
}

// Create singleton instance
const cronHelper = new CronJobHelper();

export default cronHelper;