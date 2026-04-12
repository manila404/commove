import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { XMarkIcon, CameraIcon } from '../constants';
import { usePermissions } from '../contexts/PermissionContext';

interface QRScannerModalProps {
    onClose: () => void;
    onScanSuccess: (eventId: string) => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ onClose, onScanSuccess }) => {
    const { permissions, requestCamera } = usePermissions();
    const [error, setError] = useState<string | null>(null);
    const [isRequesting, setIsRequesting] = useState(false);

    useEffect(() => {
        if (permissions.camera === 'denied') {
            setError("Camera access denied. Please allow camera permissions in your browser settings to scan QR codes.");
        }
    }, [permissions.camera]);

    const handleScan = (result: any) => {
        if (result && result.length > 0) {
            const text = result[0].rawValue;
            // Support both full URL and short protocol
            if (text.startsWith('commove://event/') || text.includes('/event/')) {
                let eventId = '';
                if (text.startsWith('commove://event/')) {
                    eventId = text.replace('commove://event/', '');
                } else {
                    const parts = text.split('/event/');
                    eventId = parts[parts.length - 1].split('?')[0]; // Remove query params if any
                }
                
                if (eventId && eventId.length > 5) { // Basic validation for Firebase ID
                    onScanSuccess(eventId);
                } else {
                    setError("Invalid QR Code format. Please scan a valid Commove event QR.");
                }
            } else {
                setError("This QR code is not a valid Commove event. Please scan the QR code provided at the event venue.");
            }
        }
    };

    const handleRetryPermission = async () => {
        setIsRequesting(true);
        const success = await requestCamera();
        if (success) {
            setError(null);
        }
        setIsRequesting(false);
    };

    return (
        <div className="fixed inset-0 z-[6000] bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in">
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-white/10 rounded-full transition-colors z-10"
            >
                <XMarkIcon className="w-6 h-6" />
            </button>
            
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 text-center border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Scan Event QR</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Position the QR code within the frame</p>
                </div>
                
                <div className="relative aspect-square bg-black flex items-center justify-center">
                    {permissions.camera === 'granted' ? (
                        <Scanner 
                            onScan={handleScan}
                            onError={(err) => {
                                console.error(err);
                                const errMsg = err instanceof Error ? err.message : String(err);
                                if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('not allowed')) {
                                    setError("Camera access denied. Please allow camera permissions in your browser settings.");
                                } else {
                                    setError("Failed to access camera. Please ensure your device has a working camera.");
                                }
                            }}
                            components={{
                                onOff: true,
                                torch: true,
                                zoom: true,
                                finder: true,
                            }}
                        />
                    ) : (
                        <div className="text-center p-8">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <CameraIcon className="w-8 h-8" />
                            </div>
                            <p className="text-gray-400 text-sm mb-6">Camera access is required to scan QR codes.</p>
                            <button 
                                onClick={handleRetryPermission}
                                disabled={isRequesting}
                                className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors disabled:opacity-50"
                            >
                                {isRequesting ? "Requesting..." : "Enable Camera"}
                            </button>
                        </div>
                    )}
                </div>
                
                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm text-center font-medium border-t border-red-100 dark:border-red-900/50">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QRScannerModal;
