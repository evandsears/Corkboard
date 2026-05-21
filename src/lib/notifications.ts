import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const scheduleDailyReminder = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Local notifications are only fully supported on native platforms.');
    // We can still try to request permission for Web if supported
  }

  try {
    let permStatus = await LocalNotifications.checkPermissions();
    
    if (permStatus.display === 'prompt') {
      permStatus = await LocalNotifications.requestPermissions();
    }

    if (permStatus.display !== 'granted') {
      return;
    }

    // Cancel existing reminder if any
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ 
        notifications: pending.notifications.filter(n => n.id === 1) 
      });
    }

    // Schedule new reminder for 24 hours from now
    await LocalNotifications.schedule({
      notifications: [
        {
          title: "Time to reflect ✍️",
          body: "You haven't added an entry today. Take a quick moment for yourself.",
          id: 1,
          schedule: { at: new Date(Date.now() + 1000 * 60 * 60 * 24) }, // 24 hours later
        }
      ]
    });
    
    console.log('Daily reminder scheduled for 24 hours from now.');
  } catch (err) {
    console.error('Error scheduling notification:', err);
  }
};
