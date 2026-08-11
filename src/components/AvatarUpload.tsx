// src/components/AvatarUpload.tsx
import React, { useState, useRef } from 'react';
import { Camera, Loader2, X, Upload, AlertCircle } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/upload';

interface AvatarUploadProps {
    currentImage?: string | null;
    onUploadSuccess: (url: string, publicId: string) => void;
    onRemove?: () => void;
    size?: 'small' | 'medium' | 'large';
    theme?: 'dark' | 'light';
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
    currentImage,
    onUploadSuccess,
    onRemove,
    size = 'medium',
    theme = 'dark',
}) => {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(currentImage || null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isDark = theme === 'dark';

    const sizeClasses = {
        small: 'w-16 h-16',
        medium: 'w-24 h-24',
        large: 'w-32 h-32',
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
            return;
        }

        setError(null);
        setUploading(true);

        try {
            // Show preview immediately
            const reader = new FileReader();
            reader.onload = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);

            // Upload to Cloudinary
            const result = await uploadToCloudinary(file, 'medp_pharmacy/avatars');

            if (result.success && result.url && result.publicId) {
                //  Pass the URL and publicId to parent
                onUploadSuccess(result.url, result.publicId);
                console.log(' Avatar uploaded successfully:', result.url);
            } else {
                setError(result.error || 'Upload failed');
                setPreview(currentImage || null);
            }
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Upload failed');
            setPreview(currentImage || null);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemove = () => {
        setPreview(null);
        if (onRemove) {
            onRemove();
        }
    };

    const handleClick = () => {
        if (!uploading) {
            fileInputRef.current?.click();
        }
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative">
                {/* Avatar Circle */}
                <div
                    className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 ${isDark ? 'border-[#30363d]' : 'border-[#d0d7de]'
                        } bg-[#0d1117] flex items-center justify-center relative group cursor-pointer`}
                    onClick={handleClick}
                >
                    {preview ? (
                        <img
                            src={preview}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500">
                            <Camera className={`${size === 'small' ? 'w-6 h-6' : 'w-8 h-8'}`} />
                            {size !== 'small' && (
                                <span className="text-[8px] mt-1">Upload</span>
                            )}
                        </div>
                    )}

                    {/* Upload Overlay */}
                    <div
                        className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                    >
                        {uploading ? (
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                        ) : (
                            <Camera className="w-6 h-6 text-white" />
                        )}
                    </div>
                </div>

                {/* Remove Button */}
                {preview && onRemove && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRemove();
                        }}
                        className={`absolute -top-1 -right-1 p-1 rounded-full ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-[#f6f8fa] hover:bg-slate-200'
                            } border ${isDark ? 'border-[#30363d]' : 'border-[#d0d7de]'} transition-colors`}
                        title="Remove avatar"
                    >
                        <X className="w-3 h-3 text-rose-500" />
                    </button>
                )}
            </div>

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
            />

            {/* Error Message */}
            {error && (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{error}</span>
                </p>
            )}

            {/* Upload Button */}
            <button
                onClick={handleClick}
                disabled={uploading}
                className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${isDark
                    ? 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]'
                    : 'bg-[#f6f8fa] hover:bg-slate-200 text-[#1f2328]'
                    } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {uploading ? (
                    <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                    </>
                ) : preview ? (
                    <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Change Photo</span>
                    </>
                ) : (
                    <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                    </>
                )}
            </button>
        </div>
    );
};