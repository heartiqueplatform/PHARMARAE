// utils/loyaltyPoints.ts
import { Product, Customer } from '../types';
import { db } from '../lib/db';

export interface PurchaseContext {
    product: Product;
    quantity: number;
    customerId?: string;
    totalAmount: number;
    prescriptionDuration?: number;
}

export interface PointsAward {
    points: number;
    rule: string;
    description: string;
    category: string;
}

export interface PointsCalculationResult {
    totalPoints: number;
    awards: PointsAward[];
    customerId?: string;
    pharmacyName?: string;
}

// Category detection helpers
const isAntibiotic = (product: Product): boolean => {
    const keywords = ['antibiotic', 'amoxicillin', 'doxycycline', 'ciprofloxacin', 'azithromycin',
        'clindamycin', 'metronidazole', 'cephalexin', 'erythromycin', 'tetracycline'];
    const name = (product.name || '').toLowerCase();
    const generic = (product.generic_name || '').toLowerCase();
    const category = (product.category_name || '').toLowerCase();
    return keywords.some(k => name.includes(k) || generic.includes(k) || category.includes(k));
};

const isHTN = (product: Product): boolean => {
    const keywords = ['amlodipine', 'losartan', 'enalapril', 'lisinopril', 'ramipril',
        'valsartan', 'irbesartan', 'candesartan', 'hydrochlorothiazide', 'atenolol',
        'metoprolol', 'bisoprolol', 'nifedipine', 'diltiazem', 'verapamil'];
    const name = (product.name || '').toLowerCase();
    const generic = (product.generic_name || '').toLowerCase();
    const category = (product.category_name || '').toLowerCase();
    return keywords.some(k => name.includes(k) || generic.includes(k)) ||
        category.includes('htn') || category.includes('hypertension') ||
        category.includes('blood pressure') || category.includes('cardiovascular');
};

const isDiabetes = (product: Product): boolean => {
    const keywords = ['metformin', 'glibenclamide', 'insulin', 'glimepiride', 'gliclazide',
        'pioglitazone', 'rosiglitazone', 'sitagliptin', 'empagliflozin', 'dapagliflozin'];
    const name = (product.name || '').toLowerCase();
    const generic = (product.generic_name || '').toLowerCase();
    const category = (product.category_name || '').toLowerCase();
    return keywords.some(k => name.includes(k) || generic.includes(k)) ||
        category.includes('diabetes') || category.includes('diabetic') ||
        category.includes('glucose');
};

const isDewormer = (product: Product): boolean => {
    const keywords = ['albendazole', 'mebendazole', 'praziquantel', 'ivermectin',
        'piperazine', 'levamisole'];
    const name = (product.name || '').toLowerCase();
    const generic = (product.generic_name || '').toLowerCase();
    const category = (product.category_name || '').toLowerCase();
    return keywords.some(k => name.includes(k) || generic.includes(k)) ||
        category.includes('dewormer') || category.includes('anthelmintic');
};

const isPainManagement = (product: Product): boolean => {
    const keywords = ['pain', 'analgesic', 'paracetamol', 'ibuprofen', 'diclofenac',
        'naproxen', 'tramadol', 'morphine', 'codeine', 'pethidine'];
    const name = (product.name || '').toLowerCase();
    const generic = (product.generic_name || '').toLowerCase();
    const category = (product.category_name || '').toLowerCase();
    return keywords.some(k => name.includes(k) || generic.includes(k)) ||
        category.includes('pain') || category.includes('analgesic');
};

const isMalaria = (product: Product): boolean => {
    const keywords = ['artemether', 'lumefantrine', 'artesunate', 'amodiaquine',
        'chloroquine', 'quinine', 'dihydroartemisinin', 'piperaquine'];
    const name = (product.name || '').toLowerCase();
    const generic = (product.generic_name || '').toLowerCase();
    const category = (product.category_name || '').toLowerCase();
    return keywords.some(k => name.includes(k) || generic.includes(k)) ||
        category.includes('malaria') || category.includes('antimalarial');
};

const isARV = (product: Product): boolean => {
    const keywords = ['tenofovir', 'lamivudine', 'efavirenz', 'dolutegravir',
        'nevirapine', 'abacavir', 'zidovudine', 'emtricitabine', 'rilpivirine'];
    const name = (product.name || '').toLowerCase();
    const generic = (product.generic_name || '').toLowerCase();
    const category = (product.category_name || '').toLowerCase();
    return keywords.some(k => name.includes(k) || generic.includes(k)) ||
        category.includes('arv') || category.includes('hiv') ||
        category.includes('antiretroviral');
};

// Main calculation function
export async function calculateLoyaltyPoints(
    context: PurchaseContext,
    pharmacyName?: string
): Promise<PointsCalculationResult> {
    const awards: PointsAward[] = [];
    const { product, quantity, customerId, totalAmount, prescriptionDuration } = context;

    console.log('=== calculateLoyaltyPoints called ===');
    console.log('Product:', product.name);
    console.log('Quantity:', quantity);
    console.log('Total Amount:', totalAmount);
    console.log('Customer ID:', customerId);

    // =============================================
    // 1. ALWAYS GIVE BASE POINTS (1 point per KSh 100)
    // =============================================
    const basePoints = Math.floor(totalAmount / 100);
    if (basePoints > 0) {
        awards.push({
            points: basePoints,
            rule: 'base_purchase',
            description: `Base points (KSh ${totalAmount.toFixed(0)} spent)`,
            category: 'base'
        });
        console.log('Base points added:', basePoints);
    }

    // =============================================
    // 2. ALWAYS GIVE MINIMUM 1 POINT FOR ANY PURCHASE
    // =============================================
    if (totalAmount > 0 && awards.length === 0) {
        awards.push({
            points: 1,
            rule: 'minimum_purchase',
            description: 'Minimum points for purchase',
            category: 'base'
        });
        console.log('Minimum points added: 1');
    }

    // =============================================
    // 3. HIGH VALUE BONUS (KSh 500+)
    // =============================================
    if (totalAmount >= 500) {
        const bonusPoints = Math.floor(totalAmount / 500);
        awards.push({
            points: bonusPoints,
            rule: 'high_value_bonus',
            description: `High-value bonus (KSh ${totalAmount.toFixed(0)})`,
            category: 'bonus'
        });
        console.log('High value bonus added:', bonusPoints);
    }

    // =============================================
    // 4. BULK PURCHASE BONUS (5+ items)
    // =============================================
    if (quantity >= 5) {
        const qtyBonus = Math.floor(quantity / 5) * 2;
        awards.push({
            points: qtyBonus,
            rule: 'bulk_purchase',
            description: `Bulk purchase bonus (${quantity} items)`,
            category: 'bonus'
        });
        console.log('Bulk purchase bonus added:', qtyBonus);
    }

    // =============================================
    // 5. Welcome bonus for first-time customers
    // =============================================
    if (customerId && pharmacyName) {
        try {
            const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();
            const customer = await db.customers.where('id').equals(customerId).first();

            if (customer && !customer.first_visit_date) {
                // Check if welcome bonus already given
                const existingWelcome = await db.customers_loyalty_transactions
                    .where('[pharmacy_name+customer_id]')
                    .equals([normalized, customerId])
                    .filter(t => t.transaction_type === 'earn_welcome')
                    .toArray();

                if (existingWelcome.length === 0) {
                    awards.push({
                        points: 25,
                        rule: 'welcome_bonus',
                        description: 'Welcome bonus for first purchase',
                        category: 'bonus'
                    });
                    console.log('Welcome bonus added: 25');
                }
            }
        } catch (err) {
            console.error('Welcome bonus check failed:', err);
        }
    }

    // =============================================
    // 6. Antibiotic course (7+ days)
    // =============================================
    if (isAntibiotic(product) && (prescriptionDuration || 0) >= 7) {
        awards.push({
            points: 50,
            rule: 'antibiotic_course',
            description: `Completed antibiotic course (${prescriptionDuration || 7}+ days)`,
            category: 'treatment'
        });
        console.log('Antibiotic course bonus added: 50');
    }

    // =============================================
    // 7. HTN refill (30+ days)
    // =============================================
    if (isHTN(product) && quantity >= 30) {
        awards.push({
            points: 30,
            rule: 'htn_refill',
            description: 'Monthly HTN medication refill (30+ days)',
            category: 'chronic'
        });
        console.log('HTN refill bonus added: 30');
    }

    // =============================================
    // 8. Diabetes refill (30+ days)
    // =============================================
    if (isDiabetes(product) && quantity >= 30) {
        awards.push({
            points: 30,
            rule: 'diabetes_refill',
            description: 'Monthly diabetes medication refill (30+ days)',
            category: 'chronic'
        });
        console.log('Diabetes refill bonus added: 30');
    }

    // =============================================
    // 9. Deworming
    // =============================================
    if (isDewormer(product)) {
        awards.push({
            points: 20,
            rule: 'deworming',
            description: 'Deworming treatment completed',
            category: 'preventive'
        });
        console.log('Deworming bonus added: 20');
    }

    // =============================================
    // 10. Pain management (KSh 500+)
    // =============================================
    if (isPainManagement(product) && totalAmount > 500) {
        awards.push({
            points: 10,
            rule: 'pain_management',
            description: `Pain management purchase (KSh ${totalAmount.toFixed(0)})`,
            category: 'treatment'
        });
        console.log('Pain management bonus added: 10');
    }

    // =============================================
    // 11. Malaria treatment
    // =============================================
    if (isMalaria(product)) {
        awards.push({
            points: 40,
            rule: 'malaria_treatment',
            description: 'Malaria treatment completed',
            category: 'treatment'
        });
        console.log('Malaria treatment bonus added: 40');
    }

    // =============================================
    // 12. ARV refill (30+ days)
    // =============================================
    if (isARV(product) && quantity >= 30) {
        awards.push({
            points: 50,
            rule: 'arv_refill',
            description: 'Monthly ARV refill (30+ days)',
            category: 'chronic'
        });
        console.log('ARV refill bonus added: 50');
    }

    // =============================================
    // 13. Loyalty tier bonus
    // =============================================
    if (customerId && pharmacyName) {
        try {
            const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();
            const customer = await db.customers.where('id').equals(customerId).first();

            if (customer) {
                const points = customer.loyalty_points || 0;
                let tierBonus = 0;
                let tierName = '';

                if (points >= 500) {
                    tierBonus = 15;
                    tierName = 'Platinum';
                } else if (points >= 200) {
                    tierBonus = 10;
                    tierName = 'Gold';
                } else if (points >= 100) {
                    tierBonus = 5;
                    tierName = 'Silver';
                } else if (points >= 50) {
                    tierBonus = 3;
                    tierName = 'Bronze';
                }

                if (tierBonus > 0) {
                    awards.push({
                        points: tierBonus,
                        rule: 'tier_bonus',
                        description: `${tierName} tier bonus points`,
                        category: 'bonus'
                    });
                    console.log('Tier bonus added:', tierBonus);
                }
            }
        } catch (err) {
            console.error('Tier bonus check failed:', err);
        }
    }

    const totalPoints = awards.reduce((sum, award) => sum + award.points, 0);
    console.log('Total points calculated:', totalPoints);
    console.log('Awards:', awards);

    return {
        totalPoints,
        awards,
        customerId,
        pharmacyName
    };
}

// Helper function to get points summary for display
export function getPointsSummary(awards: PointsAward[]): {
    total: number;
    byCategory: { [key: string]: number };
    details: PointsAward[];
} {
    const byCategory: { [key: string]: number } = {};
    awards.forEach(award => {
        byCategory[award.category] = (byCategory[award.category] || 0) + award.points;
    });

    return {
        total: awards.reduce((sum, a) => sum + a.points, 0),
        byCategory,
        details: awards
    };
}

// Helper to check if a product qualifies for any special rewards
export function getProductCategory(product: Product): string[] {
    const categories: string[] = [];

    if (isAntibiotic(product)) categories.push('antibiotic');
    if (isHTN(product)) categories.push('htn');
    if (isDiabetes(product)) categories.push('diabetes');
    if (isDewormer(product)) categories.push('dewormer');
    if (isPainManagement(product)) categories.push('pain');
    if (isMalaria(product)) categories.push('malaria');
    if (isARV(product)) categories.push('arv');

    if (categories.length === 0) categories.push('general');

    return categories;
}