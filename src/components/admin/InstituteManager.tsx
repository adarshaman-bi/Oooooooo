import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { logAdminAction } from '../../services/adminService';
import {
  Building2,
  Search,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  MapPin,
  GraduationCap,
  Sparkles,
  Phone,
  Mail,
  Globe,
  DollarSign,
  Heart,
  Image as ImageIcon,
  Activity
} from 'lucide-react';

interface Branch {
  city: string;
  geoCoordinates: { lat: number; lng: number };
  address: string;
}

interface FeeStructure {
  courseType: string;
  price: number;
  tenure: string;
}

interface Topper {
  studentName: string;
  examRank: string;
  achievementYear: number;
  imagePath: string;
}

export interface InstituteExtended {
  id: string;
  name: string;
  logoUrl: string;
  bannerUrl: string;
  verifiedInstitute: boolean;
  branches: Branch[];
  instituteType: 'OFFLINE' | 'ONLINE' | 'HYBRID';
  foundedYear: number;
  affiliatedTeachers: string[];
  offeredBatches: string[];
  feeStructureDisplay: FeeStructure[];
  scholarshipInfo: string | null;
  overallRating: number;
  ratingBreakdown: {
    faculty: number;
    infrastructure: number;
    results: number;
    valueForMoney: number;
  };
  toppersShowcase: Topper[];
  galleryPhotos: string[];
  contactInfo: {
    phone: string;
    email: string;
    website: string;
  };
  admissionProcessInfo: string;
}

export default function InstituteManager() {
  const { user } = useAuth();
  const [institutes, setInstitutes] = useState<InstituteExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<InstituteExtended | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Temp States
  const [newBranchCity, setNewBranchCity] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchLat, setNewBranchLat] = useState(25.1);
  const [newBranchLng, setNewBranchLng] = useState(75.8);

  const [newFeeCourse, setNewFeeCourse] = useState('');
  const [newFeePrice, setNewFeePrice] = useState(0);
  const [newFeeTenure, setNewFeeTenure] = useState('1 Year');

  const [newTopperName, setNewTopperName] = useState('');
  const [newTopperRank, setNewTopperRank] = useState('');
  const [newTopperYear, setNewTopperYear] = useState(2025);
  const [newTopperImg, setNewTopperImg] = useState('');

  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newTeacherId, setNewTeacherId] = useState('');
  const [newBatchId, setNewBatchId] = useState('');

  useEffect(() => {
    async function loadInstitutes() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('institutes').select('*');
        if (error) throw error;
        
        const list: InstituteExtended[] = (data || []).map((d: any) => {
          const feat = d.features || {};
          return {
            id: d.id,
            name: d.name || '',
            logoUrl: d.logo || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100',
            bannerUrl: feat.bannerUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600',
            verifiedInstitute: d.is_verified || false,
            branches: feat.branches || [],
            instituteType: feat.instituteType || 'HYBRID',
            foundedYear: feat.foundedYear || 2015,
            affiliatedTeachers: feat.affiliatedTeachers || [],
            offeredBatches: feat.offeredBatches || [],
            feeStructureDisplay: feat.feeStructureDisplay || [],
            scholarshipInfo: feat.scholarshipInfo || null,
            overallRating: Number(d.rating) || 4.5,
            ratingBreakdown: feat.ratingBreakdown || {
              faculty: 4.5,
              infrastructure: 4.4,
              results: 4.6,
              valueForMoney: 4.3
            },
            toppersShowcase: feat.toppersShowcase || [],
            galleryPhotos: feat.galleryPhotos || [],
            contactInfo: feat.contactInfo || { phone: '', email: '', website: '' },
            admissionProcessInfo: feat.admissionProcessInfo || ''
          };
        });
        setInstitutes(list);
      } catch (err) {
        console.error('Failed to load institutes:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInstitutes();
  }, []);

  const handleSelect = (inst: InstituteExtended) => {
    setSelected({ ...inst });
    setMessage(null);
  };

  const handleCreateNew = () => {
    const fresh: InstituteExtended = {
      id: `inst_${Date.now()}`,
      name: 'Allen Career Institute Kota',
      logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100',
      bannerUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600',
      verifiedInstitute: true,
      branches: [
        { city: 'Kota', geoCoordinates: { lat: 25.18, lng: 75.83 }, address: 'Landmark City, Kunhari, Kota' }
      ],
      instituteType: 'HYBRID',
      foundedYear: 1988,
      affiliatedTeachers: ['nv_sir', 'alakh_pandey'],
      offeredBatches: ['batch_001'],
      feeStructureDisplay: [
        { courseType: 'NEET Main Achiever', price: 135000, tenure: '1 Year' },
        { courseType: 'JEE Advanced Pro', price: 155000, tenure: '2 Year' }
      ],
      scholarshipInfo: 'ASAT score-based discount up to 90%.',
      overallRating: 4.8,
      ratingBreakdown: { faculty: 4.9, infrastructure: 4.8, results: 4.9, valueForMoney: 4.5 },
      toppersShowcase: [
        { studentName: 'Chitraang Murdia', examRank: 'AIR 1 JEE Advanced', achievementYear: 2014, imagePath: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200' }
      ],
      galleryPhotos: [
        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600'
      ],
      contactInfo: { phone: '+91-744-2757575', email: 'info@allen.ac.in', website: 'https://www.allen.ac.in' },
      admissionProcessInfo: 'Admission via ASAT entrance exam or direct based on previous academic results.'
    };
    setSelected(fresh);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const isNew = !institutes.some(i => i.id === selected.id);
      const prevDoc = isNew ? null : institutes.find(i => i.id === selected.id);

      // Save to Supabase
      const { error } = await supabase.from('institutes').upsert({
        id: selected.id,
        name: selected.name,
        logo: selected.logoUrl,
        rating: selected.overallRating,
        is_verified: selected.verifiedInstitute,
        official_links: selected.contactInfo?.website ? [selected.contactInfo.website] : [],
        exams: ['JEE', 'NEET'], // Default exams
        features: {
          bannerUrl: selected.bannerUrl,
          branches: selected.branches,
          instituteType: selected.instituteType,
          foundedYear: selected.foundedYear,
          affiliatedTeachers: selected.affiliatedTeachers,
          offeredBatches: selected.offeredBatches,
          feeStructureDisplay: selected.feeStructureDisplay,
          scholarshipInfo: selected.scholarshipInfo,
          ratingBreakdown: selected.ratingBreakdown,
          toppersShowcase: selected.toppersShowcase,
          galleryPhotos: selected.galleryPhotos,
          contactInfo: selected.contactInfo,
          admissionProcessInfo: selected.admissionProcessInfo
        }
      });
      if (error) throw error;

      // Build system audit log
      await logAdminAction(
        user?.uid || 'anonymous_admin',
        isNew ? 'CREATE' : 'UPDATE',
        'INSTITUTES',
        selected.id,
        prevDoc || null,
        selected
      );

      // Refresh state list
      const updatedList = isNew
        ? [...institutes, selected]
        : institutes.map(i => i.id === selected.id ? selected : i);
      setInstitutes(updatedList);
      setSelected(selected);
      setMessage({ type: 'success', text: `Institute profile '${selected.name}' saved successfully.` });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Operation failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this institute? This process is irreversible.')) return;
    try {
      const prevDoc = institutes.find(i => i.id === id);
      const { error } = await supabase.from('institutes').delete().eq('id', id);
      if (error) throw error;

      await logAdminAction(
        user?.uid || 'anonymous_admin',
        'DELETE',
        'INSTITUTES',
        id,
        prevDoc || null,
        null
      );

      setInstitutes(prev => prev.filter(i => i.id !== id));
      if (selected?.id === id) setSelected(null);
      setMessage({ type: 'success', text: 'Institute successfully purged from the database.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Purging failed.' });
    }
  };

  const filtered = institutes.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#0b0b0e] border border-zinc-900 rounded-3xl p-6 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[700px] text-zinc-100 font-sans">
      
      {/* LEFT LIST COLUMN */}
      <div className="lg:col-span-4 border-r border-zinc-900 pr-0 lg:pr-6 flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
            <Building2 className="w-5 h-5 text-teal-400" /> Institutes Directory
          </h2>
          <button
            onClick={handleCreateNew}
            className="p-1.5 bg-teal-600/20 hover:bg-teal-600/40 text-teal-300 rounded-xl transition duration-200"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search institutes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121216] border border-zinc-800/80 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-teal-500 transition duration-200 text-zinc-200"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Activity className="w-6 h-6 animate-spin text-teal-500" />
          </div>
        ) : (
          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {filtered.map(inst => (
              <div
                key={inst.id}
                onClick={() => handleSelect(inst)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selected?.id === inst.id
                    ? 'bg-teal-500/10 border-teal-500/50'
                    : 'bg-[#121216] border-zinc-850 hover:bg-[#15151a]'
                }`}
              >
                <div className="flex gap-3 items-center">
                  <img
                    src={inst.logoUrl}
                    alt={inst.name}
                    className="w-10 h-10 rounded-lg object-cover bg-zinc-900 border border-zinc-800"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-100 truncate">{inst.name}</p>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 uppercase">{inst.instituteType}</span>
                      <span>• Est {inst.foundedYear}</span>
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(inst.id); }}
                    className="p-1 hover:text-red-400 text-zinc-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-zinc-500 text-xs text-center py-6">No institutes found.</p>
            )}
          </div>
        )}
      </div>

      {/* RIGHT EDIT FORM COLUMN */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        {selected ? (
          <div className="space-y-5 animate-fade-in">
            {/* Form Title & Control Buttons */}
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-teal-400 uppercase bg-[#000] border border-teal-500/20 px-2 py-0.5 rounded-full mb-1 inline-block">
                  {selected.id}
                </span>
                <h3 className="text-md font-bold text-zinc-100">Edit System Institute profile</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-550 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition duration-200 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" /> {saving ? 'Writing...' : 'Commit Changes'}
                </button>
              </div>
            </div>

            {/* Status Messages */}
            {message && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                message.type === 'success' ? 'bg-teal-500/10 border border-teal-500/20 text-teal-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}>
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{message.text}</span>
              </div>
            )}

            {/* Scrollable Form Content */}
            <div className="space-y-5 max-h-[550px] overflow-y-auto pr-1 text-xs">
              
              {/* PRIMARY BRANDING */}
              <div className="bg-[#121216] border border-zinc-850 p-4 rounded-xl space-y-4">
                <h4 className="font-bold text-zinc-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Primary Branding & Metadata
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Academy Name</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-teal-500"
                      value={selected.name}
                      onChange={(e) => setSelected({ ...selected, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Verify Status</label>
                    <select
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-teal-500"
                      value={selected.verifiedInstitute ? 'true' : 'false'}
                      onChange={(e) => setSelected({ ...selected, verifiedInstitute: e.target.value === 'true' })}
                    >
                      <option value="true">Verified Badge Active</option>
                      <option value="false">Unverified</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Logo URL</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-teal-500"
                      value={selected.logoUrl}
                      onChange={(e) => setSelected({ ...selected, logoUrl: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Banner Image URL</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-teal-500"
                      value={selected.bannerUrl}
                      onChange={(e) => setSelected({ ...selected, bannerUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* OPERATIONS PROPERTIES */}
              <div className="bg-[#121216] border border-zinc-850 p-4 rounded-xl space-y-4">
                <h4 className="font-bold text-zinc-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                  <Activity className="w-4 h-4 text-teal-400" /> Operational Specs
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Institute Type</label>
                    <select
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-teal-500"
                      value={selected.instituteType}
                      onChange={(e) => setSelected({ ...selected, instituteType: e.target.value as any })}
                    >
                      <option value="OFFLINE">Offline Presence</option>
                      <option value="ONLINE">Fully Online</option>
                      <option value="HYBRID">Hybrid Integration</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Founded Year</label>
                    <input
                      type="number"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-teal-500"
                      value={selected.foundedYear}
                      onChange={(e) => setSelected({ ...selected, foundedYear: parseInt(e.target.value) || 2020 })}
                    />
                  </div>
                </div>

                {/* Sub branches list builder */}
                <div className="space-y-2 mt-4">
                  <label className="block text-zinc-300 font-semibold">Branches & Coordinates</label>
                  <div className="space-y-1 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                    {selected.branches.map((b, i) => (
                      <div key={i} className="flex justify-between items-center text-[11px] text-zinc-400 border-b border-zinc-900 py-1 last:border-0">
                        <span>
                          <strong className="text-zinc-300 font-semibold">{b.city}:</strong> {b.address} 
                          <span className="text-[10px] text-teal-500/80 ml-1">({b.geoCoordinates.lat}, {b.geoCoordinates.lng})</span>
                        </span>
                        <button
                          onClick={() => {
                            const copy = [...selected.branches];
                            copy.splice(i, 1);
                            setSelected({ ...selected, branches: copy });
                          }}
                          className="text-rose-450 hover:text-rose-400 text-[10px]"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2 mt-2 border-t border-zinc-900">
                      <input
                        type="text"
                        placeholder="City"
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px]"
                        value={newBranchCity}
                        onChange={(e) => setNewBranchCity(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Detailed address"
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px]"
                        value={newBranchAddress}
                        onChange={(e) => setNewBranchAddress(e.target.value)}
                      />
                      <div className="flex gap-1">
                        <input
                          type="number"
                          placeholder="Lat"
                          step="0.0001"
                          className="w-1/2 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px]"
                          value={newBranchLat}
                          onChange={(e) => setNewBranchLat(parseFloat(e.target.value) || 0)}
                        />
                        <input
                          type="number"
                          placeholder="Lng"
                          step="0.0001"
                          className="w-1/2 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px]"
                          value={newBranchLng}
                          onChange={(e) => setNewBranchLng(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (!newBranchCity || !newBranchAddress) return;
                          setSelected({
                            ...selected,
                            branches: [
                              ...selected.branches,
                              { city: newBranchCity, geoCoordinates: { lat: newBranchLat, lng: newBranchLng }, address: newBranchAddress }
                            ]
                          });
                          setNewBranchCity('');
                          setNewBranchAddress('');
                        }}
                        className="bg-teal-600/30 text-teal-300 hover:bg-teal-600/50 rounded text-[11px] py-1 font-semibold"
                      >
                        Add Branch
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* FISCAL & REVIEW MATRIX */}
              <div className="bg-[#121216] border border-zinc-850 p-4 rounded-xl space-y-4">
                <h4 className="font-bold text-zinc-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                  <DollarSign className="w-4 h-4 text-amber-500" /> Fees, Scholarships & Ratings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Scholarship Info Text</label>
                    <textarea
                      rows={2}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-teal-500"
                      value={selected.scholarshipInfo || ''}
                      onChange={(e) => setSelected({ ...selected, scholarshipInfo: e.target.value || null })}
                      placeholder="e.g. Up to 90% scholarship based on entrance scorecard"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Overall Rating</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-teal-500"
                      value={selected.overallRating}
                      onChange={(e) => setSelected({ ...selected, overallRating: parseFloat(e.target.value) || 4.2 })}
                    />
                  </div>
                </div>

                {/* Rating breakdown structure mapping */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                  <div>
                    <label className="block text-[10px] text-zinc-500">Faculty Rating</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px]"
                      value={selected.ratingBreakdown.faculty}
                      onChange={(e) => setSelected({
                        ...selected,
                        ratingBreakdown: { ...selected.ratingBreakdown, faculty: parseFloat(e.target.value) || 4.5 }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500">Infrastructure</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px]"
                      value={selected.ratingBreakdown.infrastructure}
                      onChange={(e) => setSelected({
                        ...selected,
                        ratingBreakdown: { ...selected.ratingBreakdown, infrastructure: parseFloat(e.target.value) || 4.5 }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500">Academic Results</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px]"
                      value={selected.ratingBreakdown.results}
                      onChange={(e) => setSelected({
                        ...selected,
                        ratingBreakdown: { ...selected.ratingBreakdown, results: parseFloat(e.target.value) || 4.5 }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500">Value for Money</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px]"
                      value={selected.ratingBreakdown.valueForMoney}
                      onChange={(e) => setSelected({
                        ...selected,
                        ratingBreakdown: { ...selected.ratingBreakdown, valueForMoney: parseFloat(e.target.value) || 4.5 }
                      })}
                    />
                  </div>
                </div>

                {/* Fee Structure Display list builder */}
                <div className="space-y-2 mt-4">
                  <label className="block text-zinc-300 font-semibold">Fee Structure Matrices</label>
                  <div className="space-y-1 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                    {selected.feeStructureDisplay.map((f, i) => (
                      <div key={i} className="flex justify-between items-center text-[11px] text-zinc-400 border-b border-zinc-900 py-1 last:border-0">
                        <span>
                          <strong className="text-zinc-300 font-semibold">{f.courseType}:</strong> ₹{f.price.toLocaleString()} / {f.tenure}
                        </span>
                        <button
                          onClick={() => {
                            const copy = [...selected.feeStructureDisplay];
                            copy.splice(i, 1);
                            setSelected({ ...selected, feeStructureDisplay: copy });
                          }}
                          className="text-rose-450 hover:text-rose-400 text-[10px]"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2 mt-2 border-t border-zinc-900">
                      <input
                        type="text"
                        placeholder="Course title (e.g. JEE Main)"
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] md:col-span-2"
                        value={newFeeCourse}
                        onChange={(e) => setNewFeeCourse(e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Price (₹)"
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px]"
                        value={newFeePrice}
                        onChange={(e) => setNewFeePrice(parseInt(e.target.value) || 0)}
                      />
                      <button
                        onClick={() => {
                          if (!newFeeCourse || !newFeePrice) return;
                          setSelected({
                            ...selected,
                            feeStructureDisplay: [
                              ...selected.feeStructureDisplay,
                              { courseType: newFeeCourse, price: newFeePrice, tenure: newFeeTenure }
                            ]
                          });
                          setNewFeeCourse('');
                          setNewFeePrice(0);
                        }}
                        className="bg-teal-600/30 text-teal-300 hover:bg-teal-600/50 rounded text-[11px] py-1 font-semibold"
                      >
                        Add Plan
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RELATIONS & NETWORKS */}
              <div className="bg-[#121216] border border-zinc-850 p-4 rounded-xl space-y-4">
                <h4 className="font-bold text-zinc-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                  <GraduationCap className="w-4 h-4 text-teal-400" /> Affiliated Relations Arrays
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Affiliated Teachers */}
                  <div className="space-y-2 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                    <label className="block text-[11px] text-zinc-400 font-semibold mb-1">Affiliated Teacher UIDs</label>
                    <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                      {selected.affiliatedTeachers.map((tid, i) => (
                        <span key={i} className="bg-zinc-900 border border-teal-500/25 text-teal-300 text-[10px] pl-2 pr-1 py-0.5 rounded-md flex items-center gap-1">
                          {tid}
                          <button
                            type="button"
                            onClick={() => {
                              setSelected({
                                ...selected,
                                affiliatedTeachers: selected.affiliatedTeachers.filter(id => id !== tid)
                              });
                            }}
                            className="hover:bg-zinc-800 rounded-full px-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <input
                        type="text"
                        placeholder="e.g. nv_sir"
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] flex-1"
                        value={newTeacherId}
                        onChange={(e) => setNewTeacherId(e.target.value)}
                      />
                      <button
                        onClick={() => {
                          if (!newTeacherId || selected.affiliatedTeachers.includes(newTeacherId)) return;
                          setSelected({
                            ...selected,
                            affiliatedTeachers: [...selected.affiliatedTeachers, newTeacherId]
                          });
                          setNewTeacherId('');
                        }}
                        className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 rounded text-[11px] px-3 font-semibold text-zinc-300"
                      >
                        Link
                      </button>
                    </div>
                  </div>

                  {/* Offered Batches */}
                  <div className="space-y-2 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                    <label className="block text-[11px] text-zinc-400 font-semibold mb-1">Offered Batch UIDs</label>
                    <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                      {selected.offeredBatches.map((bid, i) => (
                        <span key={i} className="bg-zinc-900 border border-teal-500/25 text-teal-300 text-[10px] pl-2 pr-1 py-0.5 rounded-md flex items-center gap-1">
                          {bid}
                          <button
                            type="button"
                            onClick={() => {
                              setSelected({
                                ...selected,
                                offeredBatches: selected.offeredBatches.filter(id => id !== bid)
                              });
                            }}
                            className="hover:bg-zinc-800 rounded-full px-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <input
                        type="text"
                        placeholder="e.g. batch_002"
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] flex-1"
                        value={newBatchId}
                        onChange={(e) => setNewBatchId(e.target.value)}
                      />
                      <button
                        onClick={() => {
                          if (!newBatchId || selected.offeredBatches.includes(newBatchId)) return;
                          setSelected({
                            ...selected,
                            offeredBatches: [...selected.offeredBatches, newBatchId]
                          });
                          setNewBatchId('');
                        }}
                        className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 rounded text-[11px] px-3 font-semibold text-zinc-300"
                      >
                        Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* MARKETING & CONTACT INFO MODULES */}
              <div className="bg-[#121216] border border-zinc-850 p-4 rounded-xl space-y-4">
                <h4 className="font-bold text-zinc-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" /> Marketing Elements & Contact
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Phone Number</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-teal-500"
                      value={selected.contactInfo.phone}
                      onChange={(e) => setSelected({
                        ...selected,
                        contactInfo: { ...selected.contactInfo, phone: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Official Email</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-teal-500"
                      value={selected.contactInfo.email}
                      onChange={(e) => setSelected({
                        ...selected,
                        contactInfo: { ...selected.contactInfo, email: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Website URL</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-teal-500"
                      value={selected.contactInfo.website}
                      onChange={(e) => setSelected({
                        ...selected,
                        contactInfo: { ...selected.contactInfo, website: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Admission Process Guidance Text</label>
                  <textarea
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-teal-500"
                    value={selected.admissionProcessInfo}
                    onChange={(e) => setSelected({ ...selected, admissionProcessInfo: e.target.value })}
                  />
                </div>

                {/* Gallery Photos list */}
                <div className="space-y-2 mt-2 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                  <label className="block text-[11px] text-zinc-400 font-semibold mb-1">Gallery Image Paths</label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {selected.galleryPhotos.map((p, i) => (
                      <div key={i} className="relative group aspect-video rounded border border-zinc-800 overflow-hidden bg-zinc-900">
                        <img src={p} alt="Gallery" className="w-full h-full object-cover" />
                        <button
                          onClick={() => {
                            setSelected({
                              ...selected,
                              galleryPhotos: selected.galleryPhotos.filter((_, idx) => idx !== i)
                            });
                          }}
                          className="absolute top-1 right-1 p-0.5 bg-zinc-950/80 text-rose-450 hover:bg-zinc-900 text-[10px] rounded"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] flex-1"
                      value={newPhotoUrl}
                      onChange={(e) => setNewPhotoUrl(e.target.value)}
                    />
                    <button
                      onClick={() => {
                        if (!newPhotoUrl) return;
                        setSelected({ ...selected, galleryPhotos: [...selected.galleryPhotos, newPhotoUrl] });
                        setNewPhotoUrl('');
                      }}
                      className="bg-teal-600/30 text-teal-300 hover:bg-teal-600/50 rounded text-[11px] px-3 font-semibold"
                    >
                      Add Photo
                    </button>
                  </div>
                </div>

                {/* Toppers Showcase List */}
                <div className="space-y-2 mt-4">
                  <label className="block text-zinc-300 font-semibold">Exemplary Toppers Showcase</label>
                  <div className="space-y-2 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selected.toppersShowcase.map((t, i) => (
                        <div key={i} className="flex gap-2 items-center bg-zinc-900 border border-zinc-850 p-2 rounded-lg">
                          <img src={t.imagePath} alt={t.studentName} className="w-10 h-10 rounded-md object-cover bg-black" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-zinc-100 truncate text-[11px]">{t.studentName}</p>
                            <p className="text-[10px] text-zinc-500">{t.examRank} • {t.achievementYear}</p>
                          </div>
                          <button
                            onClick={() => {
                              const copy = [...selected.toppersShowcase];
                              copy.splice(i, 1);
                              setSelected({ ...selected, toppersShowcase: copy });
                            }}
                            className="text-rose-450 hover:text-rose-450 text-[10px] px-2"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2 mt-2 border-t border-zinc-900">
                      <input
                        type="text"
                        placeholder="Student name"
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px]"
                        value={newTopperName}
                        onChange={(e) => setNewTopperName(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="AIR Rank (e.g. AIR 12)"
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px]"
                        value={newTopperRank}
                        onChange={(e) => setNewTopperRank(e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Year (e.g. 2025)"
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px]"
                        value={newTopperYear}
                        onChange={(e) => setNewTopperYear(parseInt(e.target.value) || 2025)}
                      />
                      <input
                        type="text"
                        placeholder="Student photo URL"
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px]"
                        value={newTopperImg}
                        onChange={(e) => setNewTopperImg(e.target.value)}
                      />
                      <div className="md:col-span-4 flex justify-end">
                        <button
                          onClick={() => {
                            if (!newTopperName || !newTopperRank) return;
                            setSelected({
                              ...selected,
                              toppersShowcase: [
                                ...selected.toppersShowcase,
                                {
                                  studentName: newTopperName,
                                  examRank: newTopperRank,
                                  achievementYear: newTopperYear,
                                  imagePath: newTopperImg || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200'
                                }
                              ]
                            });
                            setNewTopperName('');
                            setNewTopperRank('');
                            setNewTopperImg('');
                          }}
                          className="bg-teal-600/30 text-teal-300 hover:bg-teal-600/50 rounded text-[11px] py-1 px-4 font-semibold"
                        >
                          Add Topper Entry
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-3xl p-10 py-20 bg-black/20 text-center">
            <Building2 className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-zinc-400 font-semibold text-sm">No Institute Profile Selected</p>
            <p className="text-zinc-600 text-xs mt-1 max-w-sm">
              Click on an existing catalog profile in the directory index or create a fresh entity profile override.
            </p>
            <button
              onClick={handleCreateNew}
              className="mt-4 px-4 py-2 bg-teal-600/3 hover:bg-teal-600/10 text-teal-300 border border-teal-500/20 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
            >
              <Plus className="w-4 h-4" /> Create New Profile Override
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
