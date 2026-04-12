
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import AlertModal from '../components/AlertModal';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';
type AlertType = 'alert' | 'confirm';

interface AlertState {
  isOpen: boolean;
  type: AlertType;
  variant: AlertVariant;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface AlertContextType {
  showAlert: (title: string, message: string, variant?: AlertVariant, onConfirm?: () => void) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, variant?: AlertVariant) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    type: 'alert',
    variant: 'info',
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const showAlert = useCallback((title: string, message: string, variant: AlertVariant = 'info', onConfirm?: () => void) => {
    setAlertState({
      isOpen: true,
      type: 'alert',
      variant,
      title,
      message,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        closeAlert();
      },
      onCancel: closeAlert,
    });
  }, [closeAlert]);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, variant: AlertVariant = 'warning') => {
    setAlertState({
      isOpen: true,
      type: 'confirm',
      variant,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        closeAlert();
      },
      onCancel: closeAlert,
    });
  }, [closeAlert]);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AlertModal
        isOpen={alertState.isOpen}
        type={alertState.type}
        variant={alertState.variant}
        title={alertState.title}
        message={alertState.message}
        onConfirm={alertState.onConfirm}
        onCancel={alertState.onCancel}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
