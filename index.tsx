
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AlertProvider } from './contexts/AlertContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { Toaster } from 'sonner';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Global error handler to catch "Script error." and other runtime issues
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global Error:', { message, source, lineno, colno, error });
  return false;
};

window.onunhandledrejection = function(event) {
  console.error('Unhandled Rejection:', event.reason);
};

const ToasterWrapper = () => {
  const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <Toaster position={isMobile ? "top-center" : "top-right"} duration={3000} />;
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AlertProvider>
      <PermissionProvider>
        <App />
        <ToasterWrapper />
      </PermissionProvider>
    </AlertProvider>
  </React.StrictMode>
);
