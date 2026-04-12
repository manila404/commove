import React, { useState, useRef } from 'react';
import Spinner from './Spinner';
import { Upload, X, ShieldCheck, Image as ImageIcon } from 'lucide-react';

interface KYCVerificationProps {
    onComplete: (idUrl: string) => void;
    onBack: () => void;
}

const KYCVerification: React.FC<KYCVerificationProps> = ({ onComplete, onBack }) => {
    const [idImage, setIdImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            // Simulate upload with a reader
            const reader = new FileReader();
            reader.onloadend = () => {
                setTimeout(() => {
                    setIdImage(reader.result as string);
                    setIsUploading(false);
                }, 1500);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemove = () => {
        setIdImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = () => {
        if (idImage) {
            console.log("KYC: onComplete triggered with ID image length:", idImage.length);
            onComplete(idImage);
        } else {
            console.warn("KYC: No ID image captured yet.");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    To register as a facilitator, please upload your <span className="text-primary-600 font-bold">Bacoor LGU Official ID</span> for verification.
                </p>
                
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                />

                <div 
                    onClick={!idImage && !isUploading ? handleUploadClick : undefined}
                    className={`relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all min-h-[220px] ${
                        idImage 
                            ? 'border-green-500 bg-green-50/30 dark:bg-green-900/10' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary-400 bg-gray-50 dark:bg-gray-800/50 cursor-pointer'
                    }`}
                >
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-3">
                            <Spinner size="lg" />
                            <p className="text-xs font-bold text-primary-600 animate-pulse uppercase tracking-widest">Processing ID...</p>
                        </div>
                    ) : idImage ? (
                        <div className="relative w-full flex flex-col items-center">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                                className="absolute -top-4 -right-4 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-10"
                            >
                                <X size={16} />
                            </button>
                            <img src={idImage} alt="Bacoor LGU ID" className="max-h-[160px] object-contain rounded-xl shadow-md border-2 border-white dark:border-gray-700" />
                            <div className="mt-4 flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow-sm border border-green-100 dark:border-green-900/30">
                                <ShieldCheck className="w-4 h-4 text-green-500" />
                                <span className="text-[10px] font-black text-green-600 uppercase tracking-wider">ID Captured Ready</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-3">
                            <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-sm mx-auto border border-gray-100 dark:border-gray-700">
                                <Upload className="h-8 w-8 text-primary-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Upload Bacoor LGU ID</p>
                                <p className="text-[10px] text-gray-400 font-medium uppercase mt-1 tracking-widest">JPG, PNG up to 10MB</p>
                            </div>
                        </div>
                    )}
                </div>

                {idImage && (
                    <button 
                        onClick={handleUploadClick}
                        className="w-full text-xs font-bold text-primary-600 hover:text-primary-700 py-2 transition-colors uppercase tracking-widest"
                    >
                        Re-upload ID
                    </button>
                )}
            </div>

            <div className="pt-2">
                <button 
                    onClick={handleSubmit}
                    disabled={!idImage || isUploading}
                    className="w-full h-14 flex items-center justify-center bg-primary-600 text-white font-black rounded-2xl hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:shadow-none disabled:cursor-not-allowed text-base active:scale-95 uppercase tracking-widest"
                >
                    Submit for Review
                </button>
                <p className="text-[10px] text-center text-gray-400 font-medium mt-4 leading-relaxed uppercase tracking-widest">
                    By submitting, you agree to the verification terms.<br/>Registration may take 24-48 hours to approve.
                </p>
            </div>
        </div>
    );
};

export default KYCVerification;
