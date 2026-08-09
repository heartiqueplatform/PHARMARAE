export interface CommonDrug {
  name: string;
  generic_name: string;
  brand: string;
  form: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'ointment' | 'drops' | 'inhaler' | 'suspension' | 'gel' | 'equipment' | 'bandage';
  strength: string;
  category_name: string;
  prescription_required: boolean;
  default_cost_price: number;
  default_selling_price: number;
}

export const COMMON_DRUGS_LIST: CommonDrug[] = [
  // Analgesics & Anti-inflammatory
  { name: 'Paracetamol 500mg', generic_name: 'Acetaminophen', brand: 'Panadol Extra', form: 'tablet', strength: '500mg', category_name: 'Analgesics & Pain Relievers', prescription_required: false, default_cost_price: 3, default_selling_price: 10 },
  { name: 'Paracetamol Syrup 120mg/5ml', generic_name: 'Acetaminophen Syrup', brand: 'Panadol Syrup', form: 'syrup', strength: '120mg/5ml', category_name: 'Analgesics & Pain Relievers', prescription_required: false, default_cost_price: 100, default_selling_price: 180 },
  { name: 'Ibuprofen 200mg', generic_name: 'Ibuprofen', brand: 'Brufen', form: 'tablet', strength: '200mg', category_name: 'Analgesics & Pain Relievers', prescription_required: false, default_cost_price: 5, default_selling_price: 10 },
  { name: 'Ibuprofen 400mg', generic_name: 'Ibuprofen', brand: 'Brufen', form: 'tablet', strength: '400mg', category_name: 'Analgesics & Pain Relievers', prescription_required: false, default_cost_price: 8, default_selling_price: 15 },
  { name: 'Diclofenac Sodium 50mg', generic_name: 'Diclofenac Sodium', brand: 'Voltarol', form: 'tablet', strength: '50mg', category_name: 'Analgesics & Pain Relievers', prescription_required: false, default_cost_price: 10, default_selling_price: 20 },
  { name: 'Diclofenac Sodium 75mg/3ml Inj', generic_name: 'Diclofenac Injection', brand: 'Diclo Inject', form: 'injection', strength: '75mg/3ml', category_name: 'Analgesics & Pain Relievers', prescription_required: true, default_cost_price: 30, default_selling_price: 60 },
  { name: 'Diclofenac Gel 1%', generic_name: 'Diclofenac Gel', brand: 'Voltarol Emulgel', form: 'gel', strength: '1%', category_name: 'Analgesics & Pain Relievers', prescription_required: false, default_cost_price: 150, default_selling_price: 250 },
  { name: 'Tramadol 50mg', generic_name: 'Tramadol Hydrochloride', brand: 'Tramal', form: 'capsule', strength: '50mg', category_name: 'Analgesics & Pain Relievers', prescription_required: true, default_cost_price: 15, default_selling_price: 30 },
  { name: 'Mefenamic Acid 500mg', generic_name: 'Mefenamic Acid', brand: 'Ponstan', form: 'tablet', strength: '500mg', category_name: 'Analgesics & Pain Relievers', prescription_required: false, default_cost_price: 12, default_selling_price: 25 },
  { name: 'Meloxicam 15mg', generic_name: 'Meloxicam', brand: 'Mobic', form: 'tablet', strength: '15mg', category_name: 'Analgesics & Pain Relievers', prescription_required: true, default_cost_price: 20, default_selling_price: 40 },

  // Antibiotics & Antimicrobials
  { name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin Trihydrate', brand: 'Amoxil', form: 'capsule', strength: '500mg', category_name: 'Antibiotics & Antimicrobials', prescription_required: true, default_cost_price: 15, default_selling_price: 25 },
  { name: 'Amoxicillin Suspension 125mg/5ml', generic_name: 'Amoxicillin', brand: 'Amoxil Suspension', form: 'suspension', strength: '125mg/5ml', category_name: 'Antibiotics & Antimicrobials', prescription_required: true, default_cost_price: 120, default_selling_price: 220 },
  { name: 'Amoxicillin + Clavulanic Acid 625mg', generic_name: 'Co-amoxiclav', brand: 'Augmentin', form: 'tablet', strength: '625mg', category_name: 'Antibiotics & Antimicrobials', prescription_required: true, default_cost_price: 60, default_selling_price: 100 },
  { name: 'Amoxicillin + Clavulanic Syrup 228mg', generic_name: 'Co-amoxiclav', brand: 'Augmentin ES', form: 'suspension', strength: '228mg/5ml', category_name: 'Antibiotics & Antimicrobials', prescription_required: true, default_cost_price: 350, default_selling_price: 600 },
  { name: 'Azithromycin 500mg', generic_name: 'Azithromycin', brand: 'Zithromax', form: 'tablet', strength: '500mg', category_name: 'Antibiotics & Antimicrobials', prescription_required: true, default_cost_price: 50, default_selling_price: 90 },
  { name: 'Ciprofloxacin 500mg', generic_name: 'Ciprofloxacin Hydrochloride', brand: 'Ciprox', form: 'tablet', strength: '500mg', category_name: 'Antibiotics & Antimicrobials', prescription_required: true, default_cost_price: 20, default_selling_price: 35 },
  { name: 'Metronidazole 200mg', generic_name: 'Metronidazole', brand: 'Flagyl', form: 'tablet', strength: '200mg', category_name: 'Antibiotics & Antimicrobials', prescription_required: true, default_cost_price: 5, default_selling_price: 10 },
  { name: 'Metronidazole 400mg', generic_name: 'Metronidazole', brand: 'Flagyl', form: 'tablet', strength: '400mg', category_name: 'Antibiotics & Antimicrobials', prescription_required: true, default_cost_price: 8, default_selling_price: 15 },
  { name: 'Metronidazole Suspension 200mg/5ml', generic_name: 'Metronidazole', brand: 'Flagyl Syrup', form: 'suspension', strength: '200mg/5ml', category_name: 'Antibiotics & Antimicrobials', prescription_required: true, default_cost_price: 90, default_selling_price: 160 },
  { name: 'Doxycycline 100mg', generic_name: 'Doxycycline Hyclate', brand: 'Vibramycin', form: 'capsule', strength: '100mg', category_name: 'Antibiotics & Antimicrobials', prescription_required: true, default_cost_price: 10, default_selling_price: 20 },
  { name: 'Erythromycin 250mg', generic_name: 'Erythromycin Stearate', brand: 'Erythrocin', form: 'tablet', strength: '250mg', category_name: 'Antibiotics & Antimicrobials', prescription_required: true, default_cost_price: 12, default_selling_price: 22 },
  { name: 'Cefradine 500mg', generic_name: 'Cefradine', brand: 'Velosef', form: 'capsule', strength: '500mg', category_name: 'Antibiotics & Antimicrobials', prescription_required: true, default_cost_price: 30, default_selling_price: 50 },
  { name: 'Cefuroxime Axetil 500mg', generic_name: 'Cefuroxime', brand: 'Zinnat', form: 'tablet', strength: '500mg', category_name: 'Antibiotics & Antimicrobials', prescription_required: true, default_cost_price: 80, default_selling_price: 130 },
  { name: 'Ceftriaxone 1g Injection', generic_name: 'Ceftriaxone Sodium', brand: 'Rocephin', form: 'injection', strength: '1g', category_name: 'Antibiotics & Antimicrobials', prescription_required: true, default_cost_price: 150, default_selling_price: 250 },
  { name: 'Ampiclox 500mg', generic_name: 'Ampicillin + Cloxacillin', brand: 'Ampiclox', form: 'capsule', strength: '500mg', category_name: 'Antibiotics & Antimicrobials', prescription_required: true, default_cost_price: 18, default_selling_price: 30 },
  { name: 'Cotrimoxazole 480mg', generic_name: 'Sulfamethoxazole + Trimethoprim', brand: 'Septrin', form: 'tablet', strength: '480mg', category_name: 'Antibiotics & Antimicrobials', prescription_required: true, default_cost_price: 6, default_selling_price: 12 },

  // Antimalarials
  { name: 'Coartem 20/120mg', generic_name: 'Artemether + Lumefantrine', brand: 'Coartem', form: 'tablet', strength: '20/120mg', category_name: 'Antimalarials', prescription_required: true, default_cost_price: 22, default_selling_price: 35 },
  { name: 'Coartem Dispersible 20/120mg', generic_name: 'Artemether + Lumefantrine', brand: 'Coartem Junior', form: 'tablet', strength: '20/120mg', category_name: 'Antimalarials', prescription_required: true, default_cost_price: 120, default_selling_price: 200 },
  { name: 'Artesunate Injection 60mg', generic_name: 'Artesunate', brand: 'Artesun', form: 'injection', strength: '60mg', category_name: 'Antimalarials', prescription_required: true, default_cost_price: 250, default_selling_price: 400 },
  { name: 'Dihydroartemisinin + Piperaquine (P-Alaxin)', generic_name: 'DHA + Piperaquine', brand: 'P-Alaxin', form: 'tablet', strength: '40/320mg', category_name: 'Antimalarials', prescription_required: true, default_cost_price: 220, default_selling_price: 350 },
  { name: 'Quinine Sulphate 300mg', generic_name: 'Quinine Sulphate', brand: 'Quinine', form: 'tablet', strength: '300mg', category_name: 'Antimalarials', prescription_required: true, default_cost_price: 10, default_selling_price: 20 },

  // Antihypertensives & Cardiovascular
  { name: 'Amlodipine 5mg', generic_name: 'Amlodipine Besylate', brand: 'Norvasc', form: 'tablet', strength: '5mg', category_name: 'Antihypertensives', prescription_required: true, default_cost_price: 8, default_selling_price: 15 },
  { name: 'Amlodipine 10mg', generic_name: 'Amlodipine Besylate', brand: 'Norvasc', form: 'tablet', strength: '10mg', category_name: 'Antihypertensives', prescription_required: true, default_cost_price: 12, default_selling_price: 25 },
  { name: 'Losartan Potassium 50mg', generic_name: 'Losartan', brand: 'Cozaar', form: 'tablet', strength: '50mg', category_name: 'Antihypertensives', prescription_required: true, default_cost_price: 25, default_selling_price: 40 },
  { name: 'Losartan 50mg + Hydrochlorothiazide 12.5mg', generic_name: 'Losartan + HCTZ', brand: 'Hyzaar', form: 'tablet', strength: '50mg/12.5mg', category_name: 'Antihypertensives', prescription_required: true, default_cost_price: 35, default_selling_price: 60 },
  { name: 'Telmisartan 40mg', generic_name: 'Telmisartan', brand: 'Micardis', form: 'tablet', strength: '40mg', category_name: 'Antihypertensives', prescription_required: true, default_cost_price: 30, default_selling_price: 55 },
  { name: 'Enapril 5mg', generic_name: 'Enalapril Maleate', brand: 'Vasotec', form: 'tablet', strength: '5mg', category_name: 'Antihypertensives', prescription_required: true, default_cost_price: 10, default_selling_price: 20 },
  { name: 'Nifedipine Retard 20mg', generic_name: 'Nifedipine SR', brand: 'Adalat Retard', form: 'tablet', strength: '20mg', category_name: 'Antihypertensives', prescription_required: true, default_cost_price: 15, default_selling_price: 30 },
  { name: 'Hydrochlorothiazide 25mg', generic_name: 'HCTZ', brand: 'Esidrex', form: 'tablet', strength: '25mg', category_name: 'Antihypertensives', prescription_required: true, default_cost_price: 5, default_selling_price: 10 },
  { name: 'Atenolol 50mg', generic_name: 'Atenolol', brand: 'Tenormin', form: 'tablet', strength: '50mg', category_name: 'Antihypertensives', prescription_required: true, default_cost_price: 10, default_selling_price: 20 },
  { name: 'Atorvastatin 10mg', generic_name: 'Atorvastatin Calcium', brand: 'Lipitor', form: 'tablet', strength: '10mg', category_name: 'Antihypertensives', prescription_required: true, default_cost_price: 25, default_selling_price: 45 },
  { name: 'Atorvastatin 20mg', generic_name: 'Atorvastatin Calcium', brand: 'Lipitor', form: 'tablet', strength: '20mg', category_name: 'Antihypertensives', prescription_required: true, default_cost_price: 35, default_selling_price: 65 },
  { name: 'Aspirin 75mg (Soluble / Cardioprin)', generic_name: 'Acetylsalicylic Acid', brand: 'Cardioprin', form: 'tablet', strength: '75mg', category_name: 'Antihypertensives', prescription_required: false, default_cost_price: 5, default_selling_price: 10 },

  // Antidiabetics
  { name: 'Metformin 500mg', generic_name: 'Metformin Hydrochloride', brand: 'Glucophage', form: 'tablet', strength: '500mg', category_name: 'Antidiabetics', prescription_required: true, default_cost_price: 8, default_selling_price: 15 },
  { name: 'Metformin 850mg', generic_name: 'Metformin Hydrochloride', brand: 'Glucophage', form: 'tablet', strength: '850mg', category_name: 'Antidiabetics', prescription_required: true, default_cost_price: 12, default_selling_price: 22 },
  { name: 'Glibenclamide 5mg', generic_name: 'Glibenclamide', brand: 'Daonil', form: 'tablet', strength: '5mg', category_name: 'Antidiabetics', prescription_required: true, default_cost_price: 6, default_selling_price: 12 },
  { name: 'Gliclazide 80mg', generic_name: 'Gliclazide', brand: 'Diamicron', form: 'tablet', strength: '80mg', category_name: 'Antidiabetics', prescription_required: true, default_cost_price: 15, default_selling_price: 30 },
  { name: 'Soluble Insulin (Mixtard 30/70)', generic_name: 'Insulin Human', brand: 'Mixtard 100 IU/ml', form: 'injection', strength: '100 IU/ml', category_name: 'Antidiabetics', prescription_required: true, default_cost_price: 800, default_selling_price: 1200 },

  // Gastrointestinal
  { name: 'Omeprazole 20mg', generic_name: 'Omeprazole', brand: 'Losec', form: 'capsule', strength: '20mg', category_name: 'Gastrointestinal Care', prescription_required: false, default_cost_price: 10, default_selling_price: 20 },
  { name: 'Esomeprazole 40mg', generic_name: 'Esomeprazole', brand: 'Nexium', form: 'tablet', strength: '40mg', category_name: 'Gastrointestinal Care', prescription_required: true, default_cost_price: 40, default_selling_price: 70 },
  { name: 'Antacid Suspension (Magnesium + Al OH)', generic_name: 'Aluminium + Magnesium Hydroxide', brand: 'Mucogel', form: 'suspension', strength: '200ml', category_name: 'Gastrointestinal Care', prescription_required: false, default_cost_price: 120, default_selling_price: 200 },
  { name: 'Hyoscine Butylbromide 10mg (Buscopan)', generic_name: 'Hyoscine Butylbromide', brand: 'Buscopan', form: 'tablet', strength: '10mg', category_name: 'Gastrointestinal Care', prescription_required: false, default_cost_price: 12, default_selling_price: 25 },
  { name: 'Loperamide 2mg', generic_name: 'Loperamide Hydrochloride', brand: 'Imodium', form: 'capsule', strength: '2mg', category_name: 'Gastrointestinal Care', prescription_required: false, default_cost_price: 10, default_selling_price: 20 },
  { name: 'Oral Rehydration Salts (ORS Sachets)', generic_name: 'Glucose + Electrolytes', brand: 'ORS', form: 'equipment', strength: '1 Sachet', category_name: 'Gastrointestinal Care', prescription_required: false, default_cost_price: 15, default_selling_price: 30 },
  { name: 'Zinc Sulphate 20mg', generic_name: 'Zinc Sulphate', brand: 'Zinc', form: 'tablet', strength: '20mg', category_name: 'Gastrointestinal Care', prescription_required: false, default_cost_price: 5, default_selling_price: 10 },

  // Allergy, Antihistamines & Respiratory
  { name: 'Cetirizine Hydrochloride 10mg', generic_name: 'Cetirizine', brand: 'Zyrtec', form: 'tablet', strength: '10mg', category_name: 'Respiratory & Allergy', prescription_required: false, default_cost_price: 5, default_selling_price: 10 },
  { name: 'Cetirizine Syrup 5mg/5ml', generic_name: 'Cetirizine Syrup', brand: 'Zyrtec Syrup', form: 'syrup', strength: '5mg/5ml', category_name: 'Respiratory & Allergy', prescription_required: false, default_cost_price: 110, default_selling_price: 200 },
  { name: 'Chlorpheniramine 4mg (Piriton)', generic_name: 'Chlorpheniramine Maleate', brand: 'Piriton', form: 'tablet', strength: '4mg', category_name: 'Respiratory & Allergy', prescription_required: false, default_cost_price: 2, default_selling_price: 5 },
  { name: 'Piriton Syrup 2mg/5ml', generic_name: 'Chlorpheniramine Syrup', brand: 'Piriton Syrup', form: 'syrup', strength: '2mg/5ml', category_name: 'Respiratory & Allergy', prescription_required: false, default_cost_price: 80, default_selling_price: 150 },
  { name: 'Loratadine 10mg', generic_name: 'Loratadine', brand: 'Claritin', form: 'tablet', strength: '10mg', category_name: 'Respiratory & Allergy', prescription_required: false, default_cost_price: 8, default_selling_price: 15 },
  { name: 'Salbutamol Inhaler 100mcg', generic_name: 'Salbutamol', brand: 'Ventolin Inhaler', form: 'inhaler', strength: '100mcg', category_name: 'Respiratory & Allergy', prescription_required: true, default_cost_price: 250, default_selling_price: 400 },
  { name: 'Salbutamol Syrup 2mg/5ml', generic_name: 'Salbutamol', brand: 'Ventolin Syrup', form: 'syrup', strength: '2mg/5ml', category_name: 'Respiratory & Allergy', prescription_required: true, default_cost_price: 90, default_selling_price: 160 },
  { name: 'Cough Syrup (Benylin 4 Flu)', generic_name: 'Dextromethorphan + Diphenhydramine', brand: 'Benylin 4 Flu', form: 'syrup', strength: '100ml', category_name: 'Respiratory & Allergy', prescription_required: false, default_cost_price: 250, default_selling_price: 420 },
  { name: 'Prednisolone 5mg', generic_name: 'Prednisolone', brand: 'Solu-Medrol', form: 'tablet', strength: '5mg', category_name: 'Respiratory & Allergy', prescription_required: true, default_cost_price: 5, default_selling_price: 10 },
  { name: 'Dexamethasone 0.5mg', generic_name: 'Dexamethasone', brand: 'Decadron', form: 'tablet', strength: '0.5mg', category_name: 'Respiratory & Allergy', prescription_required: true, default_cost_price: 3, default_selling_price: 8 },

  // Vitamins, Minerals & Supplements
  { name: 'Multivitamin Tablets', generic_name: 'Multivitamins + Minerals', brand: 'Pharmaton', form: 'tablet', strength: 'Standard', category_name: 'Vitamins & Supplements', prescription_required: false, default_cost_price: 5, default_selling_price: 10 },
  { name: 'Multivitamin Syrup (Seven Seas)', generic_name: 'Cod Liver Oil + Multivitamins', brand: 'Seven Seas Syrup', form: 'syrup', strength: '150ml', category_name: 'Vitamins & Supplements', prescription_required: false, default_cost_price: 350, default_selling_price: 550 },
  { name: 'Vitamin C 500mg Chewable', generic_name: 'Ascorbic Acid', brand: 'Cee-500', form: 'tablet', strength: '500mg', category_name: 'Vitamins & Supplements', prescription_required: false, default_cost_price: 5, default_selling_price: 10 },
  { name: 'Ferrous Sulphate + Folic Acid (FEFOL)', generic_name: 'Iron + Folic Acid', brand: 'FEFOL', form: 'capsule', strength: '150mg/0.5mg', category_name: 'Vitamins & Supplements', prescription_required: false, default_cost_price: 8, default_selling_price: 15 },
  { name: 'Calcium + Vitamin D3 Tablets', generic_name: 'Calcium Carbonate + D3', brand: 'Caltrate', form: 'tablet', strength: '500mg/200IU', category_name: 'Vitamins & Supplements', prescription_required: false, default_cost_price: 15, default_selling_price: 30 },
  { name: 'Neurobion (Vitamin B1+B6+B12)', generic_name: 'Vitamin B Complex', brand: 'Neurobion', form: 'tablet', strength: '100mg/200mg/200mcg', category_name: 'Vitamins & Supplements', prescription_required: false, default_cost_price: 20, default_selling_price: 35 },

  // Topical & Eye/Ear/Dermatology
  { name: 'Clotrimazole Cream 1%', generic_name: 'Clotrimazole', brand: 'Canesten', form: 'cream', strength: '1%', category_name: 'Surgical & Dressings', prescription_required: false, default_cost_price: 80, default_selling_price: 150 },
  { name: 'Hydrocortisone Cream 1%', generic_name: 'Hydrocortisone', brand: 'Dermacort', form: 'cream', strength: '1%', category_name: 'Surgical & Dressings', prescription_required: false, default_cost_price: 70, default_selling_price: 140 },
  { name: 'Gentamicin Eye/Ear Drops 0.3%', generic_name: 'Gentamicin', brand: 'Genta Drops', form: 'drops', strength: '0.3%', category_name: 'Surgical & Dressings', prescription_required: true, default_cost_price: 60, default_selling_price: 120 },
  { name: 'Chloramphenicol Eye Ointment 1%', generic_name: 'Chloramphenicol', brand: 'Chloramex', form: 'ointment', strength: '1%', category_name: 'Surgical & Dressings', prescription_required: true, default_cost_price: 50, default_selling_price: 100 },

  // Surgical, Dressings & Antiseptics
  { name: 'Surgical Gloves (Medium)', generic_name: 'Latex Examination Gloves', brand: 'SafeTouch', form: 'equipment', strength: 'Medium', category_name: 'Surgical & Dressings', prescription_required: false, default_cost_price: 10, default_selling_price: 20 },
  { name: 'Crepe Bandage 10cm x 4.5m', generic_name: 'Elastic Bandage', brand: 'Elastoplast', form: 'bandage', strength: '10cm', category_name: 'Surgical & Dressings', prescription_required: false, default_cost_price: 90, default_selling_price: 150 },
  { name: 'Cotton Wool 100g', generic_name: 'Absorbent Cotton Wool', brand: 'Absorbent Cotton', form: 'equipment', strength: '100g', category_name: 'Surgical & Dressings', prescription_required: false, default_cost_price: 100, default_selling_price: 180 },
  { name: 'Surgical Spirit 100ml', generic_name: 'Isopropanol 70%', brand: 'Surgical Spirit', form: 'suspension', strength: '100ml', category_name: 'Surgical & Dressings', prescription_required: false, default_cost_price: 80, default_selling_price: 140 },
  { name: 'Povidone Iodine Solution 10% (Betadine)', generic_name: 'Povidone Iodine', brand: 'Betadine', form: 'suspension', strength: '10%', category_name: 'Surgical & Dressings', prescription_required: false, default_cost_price: 150, default_selling_price: 250 }
];
