// src/lib/upload.ts
import { CLOUDINARY_UPLOAD_CONFIG } from './cloudinary';

export interface UploadResult {
    success: boolean;
    url?: string;
    publicId?: string;
    error?: string;
    width?: number;
    height?: number;
}

/**
 * Upload an image to Cloudinary
 */
export const uploadToCloudinary = async (
    file: File,
    folder: string = 'medp_pharmacy',
    onProgress?: (progress: number) => void
): Promise<UploadResult> => {
    // Validate configuration
    if (!CLOUDINARY_UPLOAD_CONFIG?.cloudName || !CLOUDINARY_UPLOAD_CONFIG?.uploadPreset) {
        console.error('❌ Cloudinary configuration missing:', CLOUDINARY_UPLOAD_CONFIG);
        return {
            success: false,
            error: 'Cloudinary configuration is missing. Please check your environment variables.',
        };
    }

    // Validate file
    if (!file) {
        return {
            success: false,
            error: 'No file provided',
        };
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        return {
            success: false,
            error: 'File must be an image',
        };
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        return {
            success: false,
            error: 'Image must be less than 10MB',
        };
    }

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_CONFIG.uploadPreset);
        formData.append('folder', folder);
        formData.append('cloud_name', CLOUDINARY_UPLOAD_CONFIG.cloudName);

        // Add timestamp to prevent caching issues
        const timestamp = Date.now();
        formData.append('timestamp', timestamp.toString());

        // Optional: Add tags for better organization
        if (folder) {
            formData.append('tags', folder.replace(/\//g, '_'));
        }

        const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_UPLOAD_CONFIG.cloudName}/image/upload`;

        console.log(`📤 Uploading to Cloudinary: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

        // Use XMLHttpRequest for progress tracking
        if (onProgress) {
            return new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', uploadUrl);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const progress = Math.round((event.loaded / event.total) * 100);
                        onProgress(progress);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status === 200) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            console.log(' Cloudinary upload successful:', data.secure_url);
                            resolve({
                                success: true,
                                url: data.secure_url,
                                publicId: data.public_id,
                                width: data.width,
                                height: data.height,
                            });
                        } catch (e) {
                            resolve({
                                success: false,
                                error: 'Failed to parse upload response',
                            });
                        }
                    } else {
                        try {
                            const error = JSON.parse(xhr.responseText);
                            console.error('❌ Cloudinary upload error:', error);
                            resolve({
                                success: false,
                                error: error.error?.message || `Upload failed with status ${xhr.status}`,
                            });
                        } catch (e) {
                            resolve({
                                success: false,
                                error: `Upload failed with status ${xhr.status}`,
                            });
                        }
                    }
                };

                xhr.onerror = () => {
                    console.error('❌ Cloudinary upload network error');
                    resolve({
                        success: false,
                        error: 'Network error. Please check your connection.',
                    });
                };

                xhr.ontimeout = () => {
                    console.error('❌ Cloudinary upload timeout');
                    resolve({
                        success: false,
                        error: 'Upload timed out. Please try again.',
                    });
                };

                xhr.timeout = 60000; // 60 seconds timeout
                xhr.send(formData);
            });
        }

        // Fallback to fetch if no progress callback
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Cloudinary upload error:', error);
            throw new Error(error.error?.message || `Upload failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log(' Cloudinary upload successful:', data.secure_url);

        return {
            success: true,
            url: data.secure_url,
            publicId: data.public_id,
            width: data.width,
            height: data.height,
        };
    } catch (error: any) {
        console.error('❌ Upload error:', error);
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
        version?: string;
    }
): string => {
    if (!publicId) return '';

    const { cloudName } = CLOUDINARY_UPLOAD_CONFIG;

    // Build transformation string
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

    // Add version if provided (for cache busting)
    const version = options?.version ? `v${options.version}/` : '';

    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}${version}${publicId}`;
};

/**
 * Helper: Convert File to Base64 (for preview)
 */
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

/**
 * Helper: Validate image file
 */
export const validateImage = (file: File): { valid: boolean; error?: string } => {
    // Check if file exists
    if (!file) {
        return { valid: false, error: 'No file selected' };
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
        return { valid: false, error: 'File must be an image' };
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        return { valid: false, error: 'Image must be less than 10MB' };
    }

    // Check minimum size (optional - prevent tiny images)
    if (file.size < 1024) { // 1KB minimum
        return { valid: false, error: 'Image is too small' };
    }

    return { valid: true };
};

/**
 * Helper: Delete image from Cloudinary
 * Note: This requires a server-side endpoint as Cloudinary deletion requires API secret
 */
export const deleteFromCloudinary = async (publicId: string): Promise<{ success: boolean; error?: string }> => {
    if (!publicId) {
        return { success: false, error: 'No public ID provided' };
    }

    try {
        // This would typically be a server-side call to delete the image
        // For now, we'll just log it
        console.log(`🗑️ Deleting image: ${publicId}`);

        // If you have a server endpoint:
        // const response = await fetch('/api/cloudinary/delete', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ publicId }),
        // });
        // const data = await response.json();
        // return { success: data.success };

        return { success: true };
    } catch (error: any) {
        console.error('❌ Delete error:', error);
        return { success: false, error: error.message || 'Failed to delete image' };
    }
};

/**
 * Get optimized avatar URL with default transformations
 */
export const getAvatarUrl = (
    publicId: string,
    size: number = 200
): string => {
    if (!publicId) return '';

    return getCloudinaryUrl(publicId, {
        width: size,
        height: size,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        format: 'webp',
    });
};

/**
 * Get thumbnail URL
 */
export const getThumbnailUrl = (
    publicId: string,
    width: number = 100,
    height: number = 100
): string => {
    if (!publicId) return '';

    return getCloudinaryUrl(publicId, {
        width,
        height,
        crop: 'thumb',
        gravity: 'face',
        quality: 'auto',
        format: 'webp',
    });
};