
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
    if (Notification.permission === "granted" && document.hidden) {
      try {
        new Notification(title, {
          body: body,
          icon: icon || '/icon.png', // Fallback icon
          vibrate: [200, 100, 200], // Vibration pattern for Android
          badge: '/badge.png',
          tag: 'lingoflow-app' // Group notifications
        } as any);
      } catch (e) {
        console.warn("Notification failed", e);
      }
    }
  },

  scheduleReminder: (title: string, body: string, delayMs: number) => {
    setTimeout(() => {
      NotificationService.sendNotification(title, body);
    }, delayMs);
  }
};