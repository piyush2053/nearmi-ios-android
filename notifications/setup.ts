import * as Notifications from 'expo-notifications';

// How notifications behave when received in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,   // iOS notification banner
    shouldShowList: true,     // show in notification center
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

