-- ====================================================================
-- MED P PHARMACY MANAGEMENT SYSTEM - DEMO SEED DATA (KENYA REGION)
-- ====================================================================

-- 1. Insert Demo Organization
INSERT INTO organizations (id, name, type)
VALUES ('11111111-1111-1111-1111-111111111111', 'Afya Pharmacy Group Ltd', 'pharmacy_chain')
ON CONFLICT DO NOTHING;

-- 2. Insert Demo Pharmacy
INSERT INTO pharmacies (
    id, organization_id, name, trading_name, phone, email, address, county, town, currency, receipt_header, receipt_footer
)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'PHARMIENTA KENYA & Pharmacy',
    'MED P Nairobi Central',
    '+254712345678',
    'info@medpchemist.co.ke',
    'Kenyatta Avenue, City Centre',
    'Nairobi',
    'Nairobi',
    'KSh',
    'PHARMIENTA KENYA - NAIROBI BRANCH\nTel: +254 712 345 678',
    'Thank you for trusting MED P Pharmacy. Get well soon!'
)
ON CONFLICT DO NOTHING;

-- 3. Insert Demo Categories
INSERT INTO categories (id, pharmacy_id, name, description) VALUES
('33333333-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Analgesics & Pain Relievers', 'Pain relief, antipyretics and anti-inflammatory drugs'),
('33333333-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Antibiotics & Antimicrobials', 'Broad spectrum antibiotics and anti-infectives'),
('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Antimalarials', 'Malaria treatment and prophylaxis'),
('33333333-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Antihypertensives & Cardiac', 'Blood pressure and cardiovascular medications'),
('33333333-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Antidiabetics', 'Insulin and oral hypoglycemics'),
('33333333-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'First Aid & Surgical Supplies', 'Bandages, dressings, gloves, scalpels, antiseptic')
ON CONFLICT DO NOTHING;

-- 4. Insert Demo Units
INSERT INTO units (id, pharmacy_id, name, abbreviation, is_base_unit) VALUES
('44444444-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Tablet', 'Tab', true),
('44444444-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Capsule', 'Cap', true),
('44444444-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Bottle', 'Btl', true),
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Piece / Item', 'Pcs', true),
('44444444-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Strip', 'Stp', false),
('44444444-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'Box', 'Box', false)
ON CONFLICT DO NOTHING;

-- 5. Insert Demo Suppliers
INSERT INTO suppliers (id, pharmacy_id, name, contact_person, phone, email, address) VALUES
('55555555-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Harleys Ltd Pharmaceuticals', 'Maina Kageni', '+254722000111', 'orders@harleys.co.ke', 'Industrial Area, Nairobi'),
('55555555-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Crown Healthcare Kenya', 'Amina Mohamed', '+254733111222', 'sales@crownhealth.co.ke', 'Mombasa Road, Nairobi'),
('55555555-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Laborex Kenya Ltd', 'David Omondi', '+254720999888', 'laborex@laborex.co.ke', 'Upper Hill, Nairobi')
ON CONFLICT DO NOTHING;
