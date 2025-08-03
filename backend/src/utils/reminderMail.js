const cron = require('node-cron');
const reminderService = require('../services/reminders/reminderService');

const scheduleReminderJob = () => {
  // Runs every day at 8:00 AM server time
  cron.schedule('0 8 * * *', async () => {
    // console.log('[Reminder Scheduler] Running daily reminder job...');
    try {
      const results = await reminderService.sendReminders({
        daysAhead: 1,
        sendEmail: true,
        sendSMS: true
      });
      // console.log('[Reminder Scheduler] Reminders sent:', results);
    } catch (error) {
      console.error('[Reminder Scheduler] Error sending reminders:', error);
    }
  });
};

module.exports = scheduleReminderJob;
