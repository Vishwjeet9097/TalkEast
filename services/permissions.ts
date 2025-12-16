// Permission service for Android and iOS apps
// Handles both native (Capacitor) and web permissions

export const PermissionService = {
  // Check if running on native platform
  isNative: async (): Promise<boolean> => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  },

  // Request notification permission
  requestNotificationPermission: async (): Promise<boolean> => {
    try {
      const isNative = await PermissionService.isNative();
      
      if (isNative) {
        // For native apps, use Capacitor LocalNotifications plugin
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const result = await LocalNotifications.requestPermissions();
          return result.display === 'granted';
        } catch (error) {
          console.warn('LocalNotifications plugin not available, falling back to web API');
        }
      }
      
      // For web, use browser Notification API
      if (!('Notification' in window)) {
        return false;
      }
      if (Notification.permission === 'granted') {
        return true;
      }
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    } catch (error) {
      console.warn('Notification permission error:', error);
      return false;
    }
  },

  // Request microphone permission
  requestMicrophonePermission: async (): Promise<boolean> => {
    try {
      const isNative = await PermissionService.isNative();
      
      if (isNative) {
        // For native Android/iOS, use getUserMedia which triggers native permission dialog
        // This is the standard way for Capacitor apps
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the stream immediately after getting permission
            stream.getTracks().forEach(track => track.stop());
            return true;
          } catch (error: any) {
            console.warn('Microphone permission denied or error:', error);
            // Check if it's a permission error
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
              return false;
            }
            // For other errors, still return false but log
            return false;
          }
        }
        return false;
      }
      
      // For web, use getUserMedia
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          return true;
        } catch (error: any) {
          console.warn('Microphone permission error:', error);
          return false;
        }
      }
      return false;
    } catch (error) {
      console.warn('Microphone permission error:', error);
      return false;
    }
  },

  // Request storage permission (for file uploads)
  requestStoragePermission: async (): Promise<boolean> => {
    try {
      // Storage permissions are typically granted at install time for Android
      // For iOS, they're handled through Info.plist
      // For web, file access is handled through file input
      return true;
    } catch (error) {
      console.warn('Storage permission error:', error);
      return false;
    }
  },

  // Request all required permissions
  requestAllPermissions: async (): Promise<{
    notifications: boolean;
    microphone: boolean;
    storage: boolean;
  }> => {
    const [notifications, microphone, storage] = await Promise.all([
      PermissionService.requestNotificationPermission(),
      PermissionService.requestMicrophonePermission(),
      PermissionService.requestStoragePermission(),
    ]);

    return {
      notifications,
      microphone,
      storage,
    };
  },

  // Check current permission status
  checkPermissions: async (): Promise<{
    notifications: string;
    microphone: string;
  }> => {
    let notificationStatus = 'default';
    let microphoneStatus = 'default';

    try {
      const isNative = await PermissionService.isNative();
      
      if (isNative) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const result = await LocalNotifications.checkPermissions();
          notificationStatus = result.display || 'default';
        } catch {
          // Fallback to web
          notificationStatus = Notification.permission || 'default';
        }
      } else {
        notificationStatus = Notification.permission || 'default';
      }
    } catch (error) {
      console.warn('Error checking notification permission:', error);
    }

    try {
      const isNative = await PermissionService.isNative();
      
      if (isNative) {
        // For native apps, try to query microphone permission
        // We can't directly check Android permissions from JS, so we try a test access
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            // Try to get user media with a very short timeout to check permission
            const stream = await Promise.race([
              navigator.mediaDevices.getUserMedia({ audio: true }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 100))
            ]) as MediaStream;
            // If successful, stop immediately
            stream.getTracks().forEach(track => track.stop());
            microphoneStatus = 'granted';
          } catch (error: any) {
            // Check error type
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
              microphoneStatus = 'denied';
            } else if (error.name === 'NotFoundError' || error.message === 'timeout') {
              // Device not found or timeout - assume prompt (not yet asked)
              microphoneStatus = 'prompt';
            } else {
              microphoneStatus = 'prompt';
            }
          }
        } else {
          microphoneStatus = 'prompt';
        }
      } else {
        // For web, check by enumerating devices
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasAudioInput = devices.some(device => device.kind === 'audioinput' && device.deviceId !== 'default');
          // If deviceId is not 'default', permission was granted
          microphoneStatus = hasAudioInput ? 'granted' : 'prompt';
        }
      }
    } catch (error) {
      console.warn('Error checking microphone permission:', error);
      microphoneStatus = 'prompt'; // Default to prompt on error
    }

    return {
      notifications: notificationStatus,
      microphone: microphoneStatus,
    };
  },
};
