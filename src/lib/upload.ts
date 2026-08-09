// src/lib/upload.ts
import { CLOUDINARY_UPLOAD_CONFIG } from './cloudinary';

export interface UploadResult {
    success: boolean;
    url?: string;
    publicId?: string;
    error?: string;
}

/**
 * Upload an image to Cloudinary
 */
export const uploadToCloudinary = async (
    file: File,
    folder: string = 'medp_pharmacy',
    onProgress?: (progress: number) => void
): Promise<UploadResult> => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_CONFIG.uploadPreset);
        formData.append('folder', folder);
        formData.append('cloud_name', CLOUDINARY_UPLOAD_CONFIG.cloudName);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_UPLOAD_CONFIG.cloudName}/image/upload`;

        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Upload failed');
        }

        const data = await response.json();

        return {
            success: true,
            url: data.secure_url,
            publicId: data.public_id,
        };
    } catch (error: any) {
        console.error('Upload error:', error);
        return {
            success: false,
            error: error.message || 'Failed to upload image',
        };
    }
};

/**
 * Get a Cloudinary URL with transformations
 */
export const getCloudinaryUrl = (
    publicId: string,
    options?: {
        width?: number;
        height?: number;
        crop?: string;
        gravity?: string;
        quality?: string;
        format?: string;
    }
): string => {
    const { cloudName } = CLOUDINARY_UPLOAD_CONFIG;

    let transformation = '';
    if (options) {
        const parts = [];
        if (options.width) parts.push(`w_${options.width}`);
        if (options.height) parts.push(`h_${options.height}`);
        if (options.crop) parts.push(`c_${options.crop}`);
        if (options.gravity) parts.push(`g_${options.gravity}`);
        if (options.quality) parts.push(`q_${options.quality}`);
        if (options.format) parts.push(`f_${options.format}`);
        transformation = parts.join(',') + '/';
    }

    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}${publicId}`;
};

/**
 * Helper: Convert File to Base64 (preview)
 */
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};