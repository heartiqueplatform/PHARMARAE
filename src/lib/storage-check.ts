// lib/storage-check.ts - NEW FILE
import { db, hasLocalData } from './db';

export async function checkStorageStatus(pharmacyName: string): Promise<{
    hasData: boolean;
    isPersistent: boolean;
    recordCount: number;
}> {
    try {
        const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();

        // Check if storage is persistent
        let isPersistent = false;
        if ('storage' in navigator && 'persisted' in navigator.storage) {
            isPersistent = await navigator.storage.persisted();
        }

        // Count records
        const count = await db.products.where('pharmacy_name').equals(normalized).count();

        return {
            hasData: count > 0,
            isPersistent,
            recordCount: count
        };
    } catch {
        return { hasData: false, isPersistent: false, recordCount: 0 };
    }
}

// Simple backup of critical data to localStorage (tiny fallback)
export async function backupCriticalData(pharmacyName: string): Promise<void> {
    try {
        const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();

        // Only backup small tables
        const [categories, units] = await Promise.all([
            db.categories.where('pharmacy_name').equals(normalized).toArray(),
            db.units.where('pharmacy_name').equals(normalized).toArray(),
        ]);

        // Only store if small enough (< 100KB)
        const data = { categories, units, timestamp: Date.now() };
        const json = JSON.stringify(data);
        if (json.length < 100000) {
            localStorage.setItem(`medp_backup_${normalized}`, json);
        }
    } catch {
        // Silent fail
    }
}

// Restore from backup if needed
export async function restoreFromBackup(pharmacyName: string): Promise<boolean> {
    try {
        const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();
        const backup = localStorage.getItem(`medp_backup_${normalized}`);
        if (!backup) return false;

        const data = JSON.parse(backup);
        let restored = 0;

        if (data.categories && data.categories.length > 0) {
            await db.categories.bulkPut(data.categories);
            restored += data.categories.length;
        }
        if (data.units && data.units.length > 0) {
            await db.units.bulkPut(data.units);
            restored += data.units.length;
        }

        return restored > 0;
    } catch {
        return false;
    }
}