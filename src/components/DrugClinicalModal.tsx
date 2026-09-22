import React, { useState } from 'react';
import { X, Search, BookOpen, Pill, Activity, ShieldCheck, Tag } from 'lucide-react';

interface DrugClinicalModalProps {
  isOpen: boolean;
  initialTab?: 'search' | 'indications' | 'dosage' | 'pack_price';
  onClose: () => void;
}

interface HerbalDrugGuide {
  brandName: string;
  genericName: string;
  company: string;
  form: string;
  indications: string;
  dosage: string;
  packSize: string;
  price: string;
  sideEffects: string;
}

const HERBAL_DATABASE: HerbalDrugGuide[] = [
  {
    brandName: 'Femorose 500',
    genericName: 'Evening Primrose Oil (Oenothera biennis)',
    company: 'Incepta Pharmaceuticals Ltd.',
    form: 'Soft Capsule 500mg',
    indications: 'Premenstrual syndrome (PMS), mastalgia (breast pain), rheumatoid arthritis, diabetic neuropathy, eczema.',
    dosage: '1 to 2 capsules 2 or 3 times daily with or after meals. Or as directed by physician.',
    packSize: '3x10s Box (30 capsules)',
    price: '$12.50 / pack',
    sideEffects: 'Mild gastrointestinal disturbances, mild nausea, headache.',
  },
  {
    brandName: 'Fiberlax Ultra',
    genericName: 'Ispaghula Husk (Plantago ovata)',
    company: 'Square Pharmaceuticals Ltd.',
    form: 'Effervescent Granules 3.5g',
    indications: 'Chronic constipation, irritable bowel syndrome (IBS), hemorrhoids, cholesterol control.',
    dosage: 'Adults: 1 sachet 1 to 3 times daily mixed in a full glass of water. Drink immediately.',
    packSize: '20 Sachets Box',
    price: '$8.20 / pack',
    sideEffects: 'Mild abdominal distension or flatulence for the first few days.',
  },
  {
    brandName: 'Garlin 500mg',
    genericName: 'Garlic Oil (Allium sativum extract)',
    company: 'Beximco Pharma',
    form: 'Enteric Coated Tablet',
    indications: 'Hyperlipidemia, arterial hypertension, cardiovascular health maintenance, immunity booster.',
    dosage: '1 tablet 1 to 2 times daily before or with meals.',
    packSize: '5x10s Strip Box (50 tablets)',
    price: '$9.00 / box',
    sideEffects: 'Mild garlic breath, occasional heartburn in sensitive individuals.',
  },
  {
    brandName: 'Gikoba 120',
    genericName: 'Ginkgo Biloba Extract (EGb 761)',
    company: 'ACME Laboratories Ltd.',
    form: 'Film Coated Tablet 120mg',
    indications: 'Cerebral circulatory insufficiency, memory impairment, tinnitus, peripheral vascular disease.',
    dosage: '1 tablet once or twice daily after meals for at least 6 to 8 weeks.',
    packSize: '30 Tablets Blister Pack',
    price: '$14.80 / box',
    sideEffects: 'Rare mild dizziness, headache, gastrointestinal upset.',
  },
  {
    brandName: 'Nigella 500',
    genericName: 'Black Seed Oil (Nigella sativa)',
    company: 'Square Herbal',
    form: 'Softgel 500mg',
    indications: 'General vitality, bronchial asthma, cough, immune deficiency, joint pain.',
    dosage: '1 capsule 2 times daily after food.',
    packSize: '30 Softgels Bottle',
    price: '$7.50 / bottle',
    sideEffects: 'Generally safe and well tolerated.',
  },
];

export const DrugClinicalModal: React.FC<DrugClinicalModalProps> = ({
  isOpen,
  initialTab = 'search',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'indications' | 'dosage' | 'pack_price'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrug, setSelectedDrug] = useState<HerbalDrugGuide>(HERBAL_DATABASE[0]);

  if (!isOpen) return null;

  const filteredDrugs = HERBAL_DATABASE.filter(
    (d) =>
      d.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#183a37] text-white border border-[#2d5f59] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#173834] to-[#1f4e49] p-5 border-b border-[#2d5f59] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Clinical Drug Index & Indications</h2>
              <p className="text-xs text-emerald-300">Pharmacological monograph, therapeutic guide & pack pricing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[#132e2b] text-teal-300 hover:text-white hover:bg-[#25544e] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-4 bg-[#132e2b] p-2 gap-1 border-b border-[#2d5f59] text-xs font-bold">
          <button
            onClick={() => setActiveTab('search')}
            className={`py-2 px-1 rounded-xl text-center transition-all ${
              activeTab === 'search'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-teal-200/80 hover:text-white hover:bg-[#1d4642]'
            }`}
          >
            Drug Search
          </button>
          <button
            onClick={() => setActiveTab('indications')}
            className={`py-2 px-1 rounded-xl text-center transition-all ${
              activeTab === 'indications'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-teal-200/80 hover:text-white hover:bg-[#1d4642]'
            }`}
          >
            Indications
          </button>
          <button
            onClick={() => setActiveTab('dosage')}
            className={`py-2 px-1 rounded-xl text-center transition-all ${
              activeTab === 'dosage'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-teal-200/80 hover:text-white hover:bg-[#1d4642]'
            }`}
          >
            Dosage
          </button>
          <button
            onClick={() => setActiveTab('pack_price')}
            className={`py-2 px-1 rounded-xl text-center transition-all ${
              activeTab === 'pack_price'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-teal-200/80 hover:text-white hover:bg-[#1d4642]'
            }`}
          >
            Pack & Price
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Drug Selector List */}
          <div className="space-y-3 md:border-r md:border-[#25544e] md:pr-4">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-teal-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search herbal monograph..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#132e2b] border border-[#2d5f59] text-xs text-white placeholder:text-teal-400 focus:outline-emerald-400"
              />
            </div>

            <div className="space-y-1.5 max-h-[300px] md:max-h-[420px] overflow-y-auto">
              {filteredDrugs.map((drug) => (
                <button
                  key={drug.brandName}
                  onClick={() => setSelectedDrug(drug)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs ${
                    selectedDrug.brandName === drug.brandName
                      ? 'bg-[#1f4e48] border-emerald-400 text-white font-bold'
                      : 'bg-[#143330] border-[#224844] text-teal-200 hover:bg-[#1a403c]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{drug.brandName}</span>
                    <span className="text-[10px] text-emerald-400">{drug.price}</span>
                  </div>
                  <span className="text-[10px] text-teal-400/80 block line-clamp-1">{drug.genericName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Selected Drug Detail View */}
          <div className="md:col-span-2 space-y-4">
            <div className="p-4 rounded-2xl bg-[#132e2b] border border-[#2d5f59] space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                {selectedDrug.company}
              </span>
              <h3 className="text-xl font-black text-white">{selectedDrug.brandName}</h3>
              <p className="text-xs text-teal-200 italic">{selectedDrug.genericName}</p>
              <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {selectedDrug.form}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                  {selectedDrug.price}
                </span>
              </div>
            </div>

            {/* Dynamic content depending on activeTab */}
            {activeTab === 'indications' && (
              <div className="p-4 rounded-2xl bg-[#1d4642] border border-[#2d5f59] space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  <Activity className="w-4 h-4" />
                  <span>Clinical Indications & Uses</span>
                </div>
                <p className="text-xs leading-relaxed text-teal-100">{selectedDrug.indications}</p>

                <div className="pt-3 border-t border-[#25544e]">
                  <span className="text-[11px] font-bold text-amber-300 block mb-1">Side Effects & Tolerability:</span>
                  <p className="text-xs text-teal-200">{selectedDrug.sideEffects}</p>
                </div>
              </div>
            )}

            {activeTab === 'dosage' && (
              <div className="p-4 rounded-2xl bg-[#1d4642] border border-[#2d5f59] space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  <Pill className="w-4 h-4" />
                  <span>Dosage & Administration</span>
                </div>
                <p className="text-xs leading-relaxed text-teal-100 font-medium">{selectedDrug.dosage}</p>
                <div className="p-3 bg-[#132e2b] rounded-xl text-[11px] text-teal-300 mt-3 border border-[#25544e]">
                  ⚠️ Always advise the patient to read instructions or consult the registered pharmacist before use.
                </div>
              </div>
            )}

            {activeTab === 'pack_price' && (
              <div className="p-4 rounded-2xl bg-[#1d4642] border border-[#2d5f59] space-y-3">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  <Tag className="w-4 h-4" />
                  <span>Packaging & Commercial Retail Rates</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-[#132e2b] border border-[#25544e]">
                    <span className="text-[10px] text-teal-400 block font-bold">COMMERCIAL PACK SIZE</span>
                    <span className="text-sm font-bold text-white">{selectedDrug.packSize}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#132e2b] border border-[#25544e]">
                    <span className="text-[10px] text-teal-400 block font-bold">RETAIL RATE (MRP)</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">{selectedDrug.price}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'search' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#1d4642] border border-[#2d5f59]">
                  <span className="text-[11px] font-bold text-emerald-300 block mb-1">Key Indications:</span>
                  <p className="text-xs text-teal-100 line-clamp-2">{selectedDrug.indications}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#1d4642] border border-[#2d5f59]">
                  <span className="text-[11px] font-bold text-emerald-300 block mb-1">Recommended Dosage:</span>
                  <p className="text-xs text-teal-100">{selectedDrug.dosage}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
