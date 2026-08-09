// src/lib/cloudinary.ts

// Cloudinary configuration
export const CLOUDINARY_CONFIG = {
    cloudName: 'dpj5vprwf', // Your cloud name
    uploadPreset: 'medp_uploads', // We'll create this
    apiKey: 'B1b9NQe866mdE7wxKz9OCp32xe4',
};

// For client-side uploads (using unsigned upload preset)
export const CLOUDINARY_UPLOAD_CONFIG = {
    cloudName: CLOUDINARY_CONFIG.cloudName,
    uploadPreset: 'medp_uploads',
};

// Image transformation options
export const CLOUDINARY_TRANSFORMATIONS = {
    avatar: {
        width: 150,
        height: 150,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        format: 'auto',
    },
    thumbnail: {
        width: 80,
        height: 80,
        crop: 'thumb',
        gravity: 'face',
        quality: 'auto',
        format: 'auto',
    },
    banner: {
        width: 1200,
        height: 400,
        crop: 'fill',
        quality: 'auto',
        format: 'auto',
    },
    product: {
        width: 500,
        height: 500,
        crop: 'fill',
        quality: 'auto',
        format: 'auto',
    },
    small: {
        width: 200,
        height: 200,
        crop: 'fill',
        quality: 'auto',
        format: 'auto',
    },
};