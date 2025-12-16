import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.talkeast.lingoflow',
  appName: 'TalkEast',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
    // Android Permissions
    permissions: [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
    ]
  },
  ios: {
    // iOS Permissions
    permissions: [
      'Notifications',
      'Microphone',
      'PhotoLibrary',
      'Camera',
    ],
    // Info.plist entries
    infoPlist: {
      NSMicrophoneUsageDescription: 'TalkEast needs microphone access for voice practice and audio transcription.',
      NSPhotoLibraryUsageDescription: 'TalkEast needs photo library access to upload PDF files for learning.',
      NSPhotoLibraryAddUsageDescription: 'TalkEast needs permission to save files to your photo library.',
      NSCameraUsageDescription: 'TalkEast needs camera access to capture images for learning materials.',
      NSUserNotificationsUsageDescription: 'TalkEast needs notification permission to send you daily review reminders.',
      UIBackgroundModes: ['remote-notification'],
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#6366f1",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#ffffff",
      splashFullScreen: true,
      splashImmersive: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#6366f1',
      sound: 'beep.wav',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  }
};

export default config;

