import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'notification-preferences';

interface NotificationPreferences {
  soundEnabled: boolean;
  toastEnabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  toastEnabled: true,
};

export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading notification preferences:', e);
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPrefs: Partial<NotificationPreferences>) => {
    setPreferences((current) => {
      const updated = { ...current, ...newPrefs };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving notification preferences:', e);
      }
      return updated;
    });
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    savePreferences({ soundEnabled: enabled });
  }, [savePreferences]);

  const setToastEnabled = useCallback((enabled: boolean) => {
    savePreferences({ toastEnabled: enabled });
  }, [savePreferences]);

  return {
    soundEnabled: preferences.soundEnabled,
    toastEnabled: preferences.toastEnabled,
    setSoundEnabled,
    setToastEnabled,
  };
};

// Helper function to check if sound is enabled (for use outside React components)
export const isSoundEnabled = (): boolean => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const prefs = JSON.parse(stored);
      return prefs.soundEnabled !== false;
    }
    return true;
  } catch {
    return true;
  }
};

// Helper function to check if toast is enabled
export const isToastEnabled = (): boolean => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const prefs = JSON.parse(stored);
      return prefs.toastEnabled !== false;
    }
    return true;
  } catch {
    return true;
  }
};
