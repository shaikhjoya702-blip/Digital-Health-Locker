import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface NotificationContextType {
  toasts: Toast[];
  showToast: (type: Toast['type'], title: string, message?: string) => void;
  removeToast: (id: string) => void;
  requestBrowserPermission: () => Promise<boolean>;
  sendBrowserNotification: (title: string, options?: NotificationOptions) => void;
  hasBrowserPermission: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hasBrowserPermission, setHasBrowserPermission] = useState<boolean>(false);

  useEffect(() => {
    if ('Notification' in window) {
      setHasBrowserPermission(Notification.permission === 'granted');
    }
  }, []);

  const showToast = (type: Toast['type'], title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const requestBrowserPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      showToast('warning', 'Notifications Unsupported', 'Your browser does not support desktop notifications.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasBrowserPermission(granted);
      if (granted) {
        showToast('success', 'Permission Granted', 'You will now receive medicine reminder alerts.');
      }
      return granted;
    } catch (e) {
      return false;
    }
  };

  const sendBrowserNotification = (title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        ...options,
      });
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
        requestBrowserPermission,
        sendBrowserNotification,
        hasBrowserPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
