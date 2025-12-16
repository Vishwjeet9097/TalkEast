import { db } from './storage';

// Generate TE logo as data URL (indigo to purple gradient)
const generateTELogo = (): string => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 192;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 192, 192);
    gradient.addColorStop(0, '#6366f1'); // indigo-500
    gradient.addColorStop(1, '#9333ea'); // purple-600
    
    // Draw rounded square background
    ctx.fillStyle = gradient;
    const radius = 32;
    ctx.beginPath();
    ctx.moveTo(radius, 16);
    ctx.lineTo(192 - radius, 16);
    ctx.quadraticCurveTo(192 - 16, 16, 192 - 16, radius);
    ctx.lineTo(192 - 16, 192 - radius);
    ctx.quadraticCurveTo(192 - 16, 192 - 16, 192 - radius, 192 - 16);
    ctx.lineTo(radius, 192 - 16);
    ctx.quadraticCurveTo(16, 192 - 16, 16, 192 - radius);
    ctx.lineTo(16, radius);
    ctx.quadraticCurveTo(16, 16, radius, 16);
    ctx.closePath();
    ctx.fill();
    
    // Draw TE text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 96px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TE', 96, 96);
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.warn('Failed to generate TE logo:', error);
    return '';
  }
};

// Lazy load logo when needed
let TE_LOGO = '';
const getTELogo = (): string => {
  if (!TE_LOGO && typeof document !== 'undefined') {
    TE_LOGO = generateTELogo();
  }
  return TE_LOGO;
};

// Motivational messages for daily review
const DAILY_REMINDER_MESSAGES = [
  "Time for your daily review! 🎯 Keep your streak alive!",
  "Your daily practice is waiting! ⚡ 10 words, 2 minutes!",
  "Don't break the chain! 🔥 Complete your daily review now!",
  "Quick reminder: Daily review time! 💪 Stay consistent!",
  "Your language journey continues! 🌟 Complete today's review!",
  "Build your streak! 📈 Daily review is ready!",
  "Consistency is key! 🎓 Time for your daily practice!",
  "Keep learning! 📚 Your daily review awaits!",
];

let hourlyReminderInterval: NodeJS.Timeout | null = null;
let lastNotificationTime = 0;

export const NotificationService = {
  requestPermission: async () => {
    if (!("Notification" in window)) return false;
    
    if (Notification.permission === "granted") return true;
    
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  },

  sendNotification: (title: string, body: string, icon?: string) => {
    if (Notification.permission === "granted") {
      try {
        const logo = icon || getTELogo();
        const notification = new Notification(title, {
          body: body,
          icon: logo,
          image: logo,
          badge: logo,
          vibrate: [200, 100, 200],
          tag: 'talkeast-daily-reminder',
          requireInteraction: false,
          silent: false,
          renotify: true,
          data: {
            url: window.location.origin + '/#/practice',
            timestamp: Date.now()
          }
        } as any);

        // Handle notification click
        notification.onclick = () => {
          window.focus();
          window.location.href = '/#/practice';
          notification.close();
        };

        return notification;
      } catch (e) {
        console.warn("Notification failed", e);
        return null;
      }
    }
    return null;
  },

  scheduleReminder: (title: string, body: string, delayMs: number) => {
    setTimeout(() => {
      NotificationService.sendNotification(title, body);
    }, delayMs);
  },

  // Check if daily review is completed
  checkDailyReviewStatus: async (): Promise<boolean> => {
    try {
      const stats = await db.getStats();
      return stats?.dailyReviewCompleted || false;
    } catch (error) {
      console.error('Error checking daily review status:', error);
      return false;
    }
  },

  // Start hourly reminders for daily review
  startHourlyReminders: async () => {
    // Clear existing interval
    if (hourlyReminderInterval) {
      clearInterval(hourlyReminderInterval);
    }

    // Request permission first
    const hasPermission = await NotificationService.requestPermission();
    if (!hasPermission) {
      console.warn('Notification permission not granted');
      return;
    }

    // Check immediately on start
    const isCompleted = await NotificationService.checkDailyReviewStatus();
    if (isCompleted) {
      console.log('Daily review already completed, skipping reminders');
      return;
    }

    // Send first notification if needed (after 1 minute to avoid immediate popup)
    setTimeout(async () => {
      const completed = await NotificationService.checkDailyReviewStatus();
      if (!completed) {
        const message = DAILY_REMINDER_MESSAGES[Math.floor(Math.random() * DAILY_REMINDER_MESSAGES.length)];
        NotificationService.sendNotification(
          "Daily Review Reminder 🦉",
          message
        );
        lastNotificationTime = Date.now();
      }
    }, 60000); // 1 minute delay

    // Set up hourly interval (3600000 ms = 1 hour)
    hourlyReminderInterval = setInterval(async () => {
      try {
        // Check if daily review is completed
        const isCompleted = await NotificationService.checkDailyReviewStatus();
        
        if (isCompleted) {
          console.log('Daily review completed, stopping hourly reminders');
          NotificationService.stopHourlyReminders();
          return;
        }

        // Check if we should send notification (avoid spam - at least 30 min between)
        const timeSinceLastNotification = Date.now() - lastNotificationTime;
        if (timeSinceLastNotification < 30 * 60 * 1000) {
          return; // Skip if less than 30 minutes since last notification
        }

        // Send notification
        const message = DAILY_REMINDER_MESSAGES[Math.floor(Math.random() * DAILY_REMINDER_MESSAGES.length)];
        NotificationService.sendNotification(
          "Daily Review Reminder 🦉",
          message
        );
        lastNotificationTime = Date.now();
      } catch (error) {
        console.error('Error in hourly reminder:', error);
      }
    }, 3600000); // 1 hour = 3600000 ms

    console.log('Hourly reminders started');
  },

  // Stop hourly reminders
  stopHourlyReminders: () => {
    if (hourlyReminderInterval) {
      clearInterval(hourlyReminderInterval);
      hourlyReminderInterval = null;
      console.log('Hourly reminders stopped');
    }
  },

  // Restart reminders (call when app becomes active or new day starts)
  restartHourlyReminders: async () => {
    NotificationService.stopHourlyReminders();
    await NotificationService.startHourlyReminders();
  },

  // Check and reset daily status if new day
  checkAndResetDailyStatus: async () => {
    try {
      const stats = await db.getStats();
      if (!stats) return;
      
      const today = new Date().toISOString().split('T')[0];
      const lastReviewDate = stats.lastReviewDate;
      
      // If it's a new day and review was completed yesterday, reset
      if (lastReviewDate && lastReviewDate !== today && stats.dailyReviewCompleted) {
        stats.dailyReviewCompleted = false;
        await db.saveStats(stats);
        // Restart reminders for new day
        await NotificationService.startHourlyReminders();
      }
    } catch (error) {
      console.error('Error checking daily status:', error);
    }
  }
};