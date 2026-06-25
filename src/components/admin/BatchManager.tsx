import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { logAdminAction } from '../../services/adminService';
import {
  Layers,
  Search,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  Calendar,
  DollarSign,
  Tag,
  BookOpen,
  GraduationCap
} from 'lucide-react';

interface PricingTier {
  tierName: string;
  regularPrice: number;
  discountPrice: number;
  features: string[];
}

interface SyllabusChapter {
  chapterId: string;
  topicName: string;
  completed: boolean;
}

export interface BatchExtended {
  id: string;
  batchCode: string;
  name: string;
  teacherIds: string[];
  instituteId: string;
  subjectIds: string[];
  targetExam: 'NEET' | 'JEE' | 'CUET';
  startDate: string;
  endDate: string;
  scheduleTimeline: string[];
  durationTotalMonths: number;
  pricingTiers: PricingTier[];
  refundPolicyText: string;
  mode: 'LIVE' | 'RECORDED' | 'HYBRID';
  syllabusBreakdown: SyllabusChapter[];
  enrollmentCount: number;
  seatAvailabilityCounter: number;
  demoClassVideoUrl: string | null;
  batchRating: number;
}

export default function BatchManager() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<BatchExtended[]>([]);
  const [institutes, setInstitutes] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<BatchExtended | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Temp States
  const [newTeacherId, setNewTeacherId] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newTimeline, setNewTimeline] = useState('');

  const [newTierName, setNewTierName] = useState('');
  const [newTierReg, setNewTierReg] = useState(10000);
  const [newTierDisc, setNewTierDisc] = useState(8000);
  const [newTierFeature, setNewTierFeature] = useState('');
  const [tierFeatures, setTierFeatures] = useState<string[]>([]);

  const [newChapterId, setNewChapterId] = useState('');
  const [newChapterTopic, setNewChapterTopic] = useState('');

  useEffect(() => {
    async function loadAllData() {
      setLoading(true);
      try {
        const { data: batchesData, error: batchesError } = await supabase.from('batches').select('*');
        if (batchesError) throw batchesError;
        
        const list: BatchExtended[] = (batchesData || []).map((d: any) => {
          const feat = d.features || {};
          return {
            id: d.id,
            batchCode: feat.batchCode || d.id || '',
            name: d.name || '',
            teacherIds: feat.teacherIds || (d.teacher_id ? [d.teacher_id] : []),
            instituteId: d.institute_id || '',
            subjectIds: feat.subjectIds || (d.subject ? [d.subject] : []),
            targetExam: feat.targetExam || 'JEE',
            startDate: feat.startDate || d.created_at || new Date().toISOString(),
            endDate: feat.endDate || '',
            scheduleTimeline: feat.scheduleTimeline || [],
            durationTotalMonths: feat.durationTotalMonths || 12,
            pricingTiers: feat.pricingTiers || [
              { tierName: 'Standard', regularPrice: Number(d.price) || 9999, discountPrice: Number(d.price) || 9999, features: ['Full Curriculum', 'LMS Access'] }
            ],
            refundPolicyText: feat.refundPolicyText || '7-day unconditional money back policy.',
            mode: feat.mode || 'LIVE',
            syllabusBreakdown: feat.syllabusBreakdown || [],
            enrollmentCount: feat.enrollmentCount || 0,
            seatAvailabilityCounter: feat.seatAvailabilityCounter || 100,
            demoClassVideoUrl: feat.demoClassVideoUrl || null,
            batchRating: feat.batchRating || 4.8
          };
        });
        setBatches(list);

        // Load institutions
        const { data: instData, error: instError } = await supabase.from('institutes').select('*');
        if (instError) throw instError;
        
        const instList: { id: string; name: string }[] = (instData || []).map(inst => ({
          id: inst.id,
          name: inst.name || ''
        }));
        setInstitutes(instList);
      } catch (err) {
        console.error('Failed to load batch matrix data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAllData();
  }, []);

  const handleSelect = (b: BatchExtended) => {
    setSelected({ ...b });
    setMessage(null);
  };

  const handleCreateNew = () => {
    const fresh: BatchExtended = {
      id: `batch_${Date.now()}`,
      batchCode: `BIOPRO-2026`,
      name: 'Yakeen NEET Dropper Revision Pro',
      teacherIds: ['ritu_rattewal', 'alakh_pandey'],
      instituteId: 'pw',
      subjectIds: ['Biology_NCERT', 'Physics_Mechanics'],
      targetExam: 'NEET',
      startDate: '2026-07-15',
      endDate: '2027-05-01',
      scheduleTimeline: ['Monday-Friday 5:00 PM', 'Saturday Quiz 4PM'],
      durationTotalMonths: 10,
      pricingTiers: [
        { tierName: 'Pro Live Interactive', regularPrice: 4200, discountPrice: 3800, features: ['Live doubt chat', 'DPP solutions PDF', 'AITS Test Catalog companion'] }
      ],
      refundPolicyText: 'Refundable inside 15 days of onboarding.',
      mode: 'HYBRID',
      syllabusBreakdown: [
        { chapterId: 'ch_cell_01', topicName: 'Cell: Structure & Organelles', completed: false }
      ],
      enrollmentCount: 1450,
      seatAvailabilityCounter: 250,
      demoClassVideoUrl: 'https://www.youtube.com/embed/g4J3Wq_S7Fk',
      batchRating: 4.8
    };
    setSelected(fresh);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const isNew = !batches.some(b => b.id === selected.id);
      const prevDoc = isNew ? null : batches.find(b => b.id === selected.id);

      // Check if price or discount price has changed on any tier
      let priceOverridden = false;
      if (prevDoc) {
        const prevTiers = prevDoc.pricingTiers || [];
        selected.pricingTiers.forEach((tier, index) => {
          const prevTier = prevTiers[index];
          if (prevTier) {
            if (prevTier.regularPrice !== tier.regularPrice || prevTier.discountPrice !== tier.discountPrice) {
              priceOverridden = true;
            }
          }
        });
      }

      const finalActionType = priceOverridden ? 'PRICE_OVERRIDE' : (isNew ? 'CREATE' : 'UPDATE');

      // Save to Database
      const instObj = institutes.find(i => i.id === selected.instituteId);
      const batchRecord = {
        id: selected.id,
        name: selected.name,
        institute_id: selected.instituteId,
        institute_name: instObj?.name || 'Verified Partner Academy',
        subject: selected.subjectIds[0] || 'Biology',
        teacher_id: selected.teacherIds[0] || '',
        price: selected.pricingTiers[0]?.discountPrice || 0,
        discount_price: selected.pricingTiers[0]?.discountPrice || 0,
        features: {
          batchCode: selected.batchCode,
          teacherIds: selected.teacherIds,
          subjectIds: selected.subjectIds,
          targetExam: selected.targetExam,
          startDate: selected.startDate,
          endDate: selected.endDate,
          scheduleTimeline: selected.scheduleTimeline,
          durationTotalMonths: selected.durationTotalMonths,
          pricingTiers: selected.pricingTiers,
          refundPolicyText: selected.refundPolicyText,
          mode: selected.mode,
          syllabusBreakdown: selected.syllabusBreakdown,
          enrollmentCount: selected.enrollmentCount,
          seatAvailabilityCounter: selected.seatAvailabilityCounter,
          demoClassVideoUrl: selected.demoClassVideoUrl,
          batchRating: selected.batchRating
        }
      };

      const { error: saveError } = await supabase.from('batches').upsert(batchRecord);
      if (saveError) throw saveError;

      // Build security audit logging deltas
      await logAdminAction(
        user?.uid || 'anonymous_admin',
        finalActionType,
        'BATCHES',
        selected.id,
        prevDoc || null,
        selected
      );

      // Refresh listings
      const updatedList = isNew
        ? [...batches, selected]
        : batches.map(b => b.id === selected.id ? selected : b);
      setBatches(updatedList);
      setMessage({ type: 'success', text: `Batch '${selected.name}' saved with tracked status [${finalActionType}].` });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Saving batch record failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this batch? All connections will be historical.')) return;
    try {
      const prevDoc = batches.find(b => b.id === id);
      const { error: deleteError } = await supabase.from('batches').delete().eq('id', id);
      if (deleteError) throw deleteError;

      await logAdminAction(
        user?.uid || 'anonymous_admin',
        'DELETE',
        'BATCHES',
        id,
        prevDoc || null,
        null
      );

      setBatches(prev => prev.filter(b => b.id !== id));
      if (selected?.id === id) setSelected(null);
      setMessage({ type: 'success', text: 'Batch profile safely deleted from database.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed deleting batch entry.' });
    }
  };

  const filtered = batches.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.batchCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#0b0b0e] border border-zinc-900 rounded-3xl p-6 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[700px] text-zinc-100 font-sans">
      
      {/* LEFT SELECTION COLUMN */}
      <div className="lg:col-span-4 border-r border-[#1a1a23] pr-0 lg:pr-6 flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
            <Layers className="w-5 h-5 text-indigo-400" /> Batch Class Manager
          </h2>
          <button
            onClick={handleCreateNew}
            className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl transition duration-200"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search class batches / codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121216] border border-zinc-800/80 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 transition text-zinc-200"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {filtered.map(b => (
              <div
                key={b.id}
                onClick={() => handleSelect(b)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selected?.id === b.id
                    ? 'bg-indigo-500/10 border-indigo-500/50'
                    : 'bg-[#121216] border-zinc-900 hover:bg-[#15151a]'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-grow min-w-0">
                    <p className="text-xs font-semibold text-zinc-100 truncate">{b.name}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-850 uppercase text-[9px] font-mono font-bold border border-zinc-800 text-indigo-400">{b.batchCode}</span>
                      <span className="ml-1.5">{b.targetExam} • {b.pricingTiers[0] ? `₹${b.pricingTiers[0].discountPrice}` : 'Free'}</span>
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }}
                    className="p-1 hover:text-red-400 text-zinc-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-zinc-500 text-xs text-center py-8">No class batches indexed.</p>
            )}
          </div>
        )}
      </div>

      {/* RIGHT EDIT CONTAINER FORM */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        {selected ? (
          <div className="space-y-4 animate-fade-in text-xs">
            {/* Title Control Banner */}
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <div>
                <span className="text-[9px] font-mono bg-black border border-indigo-500/30 px-2 py-0.5 rounded-full mb-1 inline-block text-indigo-300">
                  ID: {selected.id}
                </span>
                <h3 className="text-sm font-semibold text-zinc-100">Configure Class Batch Properties</h3>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> {saving ? 'Writing...' : 'Commit Changes'}
              </button>
            </div>

            {/* Validation Message status feedback */}
            {message && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                message.type === 'success' ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}>
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{message.text}</span>
              </div>
            )}

            <div className="space-y-5 max-h-[550px] overflow-y-auto pr-1">
              
              {/* BRANDING METADATA SECTION */}
              <div className="bg-[#121216] border border-zinc-850 p-4 rounded-xl space-y-4">
                <h4 className="font-bold text-zinc-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                  <Tag className="w-4 h-4 text-indigo-400" /> Branding & Identification
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Batch Code Identifier</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-indigo-500"
                      value={selected.batchCode}
                      onChange={(e) => setSelected({ ...selected, batchCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Batch Name Display</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-indigo-500"
                      value={selected.name}
                      onChange={(e) => setSelected({ ...selected, name: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* CORE INTERCONNECTIONS RELATIONSHIPS */}
              <div className="bg-[#121216] border border-zinc-850 p-4 rounded-xl space-y-4">
                <h4 className="font-bold text-zinc-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                  <GraduationCap className="w-4 h-4 text-teal-400" /> Entity Interconnections & Targets
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Target Examination Stream</label>
                    <select
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-indigo-500"
                      value={selected.targetExam}
                      onChange={(e) => setSelected({ ...selected, targetExam: e.target.value as any })}
                    >
                      <option value="JEE">JEE Main & Advanced</option>
                      <option value="NEET">NEET UG Medical</option>
                      <option value="CUET">CUET UG Stream</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Linked Institute Host</label>
                    <select
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-indigo-500"
                      value={selected.instituteId}
                      onChange={(e) => setSelected({ ...selected, instituteId: e.target.value })}
                    >
                      <option value="">No Institute (Independent)</option>
                      {institutes.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name} ({inst.id})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sub builders for Teacher UIDs & Subject UIDs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-1.5 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                    <label className="block text-[11px] text-zinc-400 font-semibold mb-1">Affiliated Teacher UIDs</label>
                    <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                      {selected.teacherIds.map((tid, i) => (
                        <span key={i} className="bg-zinc-900 text-indigo-300 border border-indigo-500/20 text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                          {tid}
                          <button
                            type="button"
                            onClick={() => setSelected({
                              ...selected,
                              teacherIds: selected.teacherIds.filter(id => id !== tid)
                            })}
                            className="hover:text-red-400"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Teacher ID"
                        className="bg-zinc-900 border border-zinc-800 rounded py-0.5 px-2 text-[11px] flex-1"
                        value={newTeacherId}
                        onChange={(e) => setNewTeacherId(e.target.value)}
                      />
                      <button
                        onClick={() => {
                          if (!newTeacherId || selected.teacherIds.includes(newTeacherId)) return;
                          setSelected({ ...selected, teacherIds: [...selected.teacherIds, newTeacherId] });
                          setNewTeacherId('');
                        }}
                        className="bg-zinc-900 border border-zinc-800 text-[11px] px-2 rounded hover:bg-zinc-800"
                      >
                        Link
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                    <label className="block text-[11px] text-zinc-400 font-semibold mb-1">Affiliated Subject/Topic UIDs</label>
                    <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                      {selected.subjectIds.map((subId, i) => (
                        <span key={i} className="bg-zinc-900 text-indigo-300 border border-indigo-500/20 text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                          {subId}
                          <button
                            type="button"
                            onClick={() => setSelected({
                              ...selected,
                              subjectIds: selected.subjectIds.filter(id => id !== subId)
                            })}
                            className="hover:text-red-400"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Subject Code"
                        className="bg-zinc-900 border border-zinc-800 rounded py-0.5 px-2 text-[11px] flex-1"
                        value={newSubjectId}
                        onChange={(e) => setNewSubjectId(e.target.value)}
                      />
                      <button
                        onClick={() => {
                          if (!newSubjectId || selected.subjectIds.includes(newSubjectId)) return;
                          setSelected({ ...selected, subjectIds: [...selected.subjectIds, newSubjectId] });
                          setNewSubjectId('');
                        }}
                        className="bg-zinc-900 border border-zinc-800 text-[11px] px-2 rounded hover:bg-zinc-800"
                      >
                        Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* TIMELINE OPERATIONS & METRICS */}
              <div className="bg-[#121216] border border-zinc-850 p-4 rounded-xl space-y-4">
                <h4 className="font-bold text-zinc-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" /> Administrative Operations & Metrics
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-indigo-500"
                      value={selected.startDate}
                      onChange={(e) => setSelected({ ...selected, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">End Date</label>
                    <input
                      type="date"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-indigo-500"
                      value={selected.endDate}
                      onChange={(e) => setSelected({ ...selected, endDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Duration (Months)</label>
                    <input
                      type="number"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-indigo-500"
                      value={selected.durationTotalMonths}
                      onChange={(e) => setSelected({ ...selected, durationTotalMonths: parseInt(e.target.value) || 12 })}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Course Format Mode</label>
                    <select
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-indigo-500"
                      value={selected.mode}
                      onChange={(e) => setSelected({ ...selected, mode: e.target.value as any })}
                    >
                      <option value="LIVE">Live Interactive</option>
                      <option value="RECORDED">Fully Recorded</option>
                      <option value="HYBRID">Hybrid Blend</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Demo Video Embed URL</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none"
                      value={selected.demoClassVideoUrl || ''}
                      onChange={(e) => setSelected({ ...selected, demoClassVideoUrl: e.target.value || null })}
                      placeholder="https://www.youtube.com/embed/..."
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Enrollment Count</label>
                    <input
                      type="number"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none"
                      value={selected.enrollmentCount}
                      onChange={(e) => setSelected({ ...selected, enrollmentCount: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Seats Availability Counter</label>
                    <input
                      type="number"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none"
                      value={selected.seatAvailabilityCounter}
                      onChange={(e) => setSelected({ ...selected, seatAvailabilityCounter: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                </div>

                {/* Schedule timeline collection list builder */}
                <div className="space-y-1 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                  <label className="block text-[11px] text-zinc-400 font-semibold mb-1">Class Timetable Slots</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selected.scheduleTimeline.map((slot, i) => (
                      <span key={i} className="bg-zinc-900 border border-zinc-800 text-[10px] pl-2 pr-1 py-0.5 rounded flex items-center gap-1">
                        {slot}
                        <button
                          type="button"
                          onClick={() => setSelected({
                            ...selected,
                            scheduleTimeline: selected.scheduleTimeline.filter((_, idx) => idx !== i)
                          })}
                          className="text-red-400 hover:bg-zinc-800 rounded-full px-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Mon-Wed-Fri 4PM"
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] flex-1"
                      value={newTimeline}
                      onChange={(e) => setNewTimeline(e.target.value)}
                    />
                    <button
                      onClick={() => {
                        if (!newTimeline) return;
                        setSelected({ ...selected, scheduleTimeline: [...selected.scheduleTimeline, newTimeline] });
                        setNewTimeline('');
                      }}
                      className="bg-zinc-850 text-zinc-300 hover:bg-zinc-800 rounded text-[11px] px-3 font-semibold border border-zinc-800"
                    >
                      Add Slot
                    </button>
                  </div>
                </div>
              </div>

              {/* FISCAL TIERS & REFUNDS */}
              <div className="bg-[#121216] border border-zinc-850 p-4 rounded-xl space-y-4">
                <h4 className="font-bold text-zinc-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                  <DollarSign className="w-4 h-4 text-amber-500" /> Fiscal Subsystems, Pricing Tiers & Refunds
                </h4>
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Refund & Withdrawal Policy Text</label>
                  <textarea
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none"
                    value={selected.refundPolicyText}
                    onChange={(e) => setSelected({ ...selected, refundPolicyText: e.target.value })}
                  />
                </div>

                {/* Pricing Tiers list maker */}
                <div className="space-y-2 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                  <label className="block text-[11px] text-zinc-400 font-semibold mb-1">Custom Tier Configs</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selected.pricingTiers.map((t, idx) => (
                      <div key={idx} className="bg-zinc-900 border border-zinc-850 p-3 rounded-lg flex flex-col justify-between">
                        <div>
                          <p className="font-bold text-zinc-100">{t.tierName}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            Regular: <del className="text-rose-500">₹{t.regularPrice}</del> • Special: <span className="text-emerald-400 font-semibold">₹{t.discountPrice}</span>
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {t.features.map((f, fIdx) => (
                              <span key={fIdx} className="bg-zinc-800 text-[9px] text-zinc-400 px-1 py-0.5 rounded">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end mt-2 pt-2 border-t border-zinc-905">
                          <button
                            onClick={() => {
                              setSelected({
                                ...selected,
                                pricingTiers: selected.pricingTiers.filter((_, i) => i !== idx)
                              });
                            }}
                            className="text-rose-455 hover:text-rose-400 text-[10px]"
                          >
                            Remove Tier
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-zinc-900">
                    <input
                      type="text"
                      placeholder="Tier Name (e.g. Basic)"
                      className="bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-[11px]"
                      value={newTierName}
                      onChange={(e) => setNewTierName(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Regular ₹"
                      className="bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-[11px]"
                      value={newTierReg}
                      onChange={(e) => setNewTierReg(parseInt(e.target.value) || 0)}
                    />
                    <input
                      type="number"
                      placeholder="Discount ₹"
                      className="bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-[11px]"
                      value={newTierDisc}
                      onChange={(e) => setNewTierDisc(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add design benefits (e.g. PDF Materials) and hit Enter"
                      className="bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-[11px] flex-1"
                      value={newTierFeature}
                      onChange={(e) => setNewTierFeature(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTierFeature) {
                          e.preventDefault();
                          setTierFeatures([...tierFeatures, newTierFeature]);
                          setNewTierFeature('');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (!newTierName) return;
                        setSelected({
                          ...selected,
                          pricingTiers: [
                            ...selected.pricingTiers,
                            { tierName: newTierName, regularPrice: newTierReg, discountPrice: newTierDisc, features: [...tierFeatures, newTierFeature].filter(Boolean) }
                          ]
                        });
                        setNewTierName('');
                        setTierFeatures([]);
                      }}
                      className="bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 rounded text-[11px] px-3 font-semibold"
                    >
                      Add Pricing Tier
                    </button>
                  </div>
                  {tierFeatures.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[10px] text-zinc-500">
                      <span>Queue benefits: </span>
                      {tierFeatures.map((f, i) => <span key={i} className="bg-zinc-900 px-1.5 py-0.5 rounded">{f}</span>)}
                    </div>
                  )}
                </div>
              </div>

              {/* ENROLLMENT & SYLLABUS TRACKER */}
              <div className="bg-[#121216] border border-zinc-850 p-4 rounded-xl space-y-4">
                <h4 className="font-bold text-zinc-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                  <BookOpen className="w-4 h-4 text-sky-400" /> Syllabus Breakdown Mapping
                </h4>

                <div className="space-y-1 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                  <label className="block text-[11px] text-zinc-400 font-semibold mb-2">Chapters covered & complete status</label>
                  {selected.syllabusBreakdown.map((ch, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px] text-zinc-400 border-b border-zinc-900 py-1.5 last:border-0 hover:bg-zinc-900/40 px-2 rounded">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="rounded text-indigo-500 font-bold bg-zinc-850 border border-zinc-800 focus:ring-0"
                          checked={ch.completed}
                          onChange={(e) => {
                            const updated = selected.syllabusBreakdown.map((item, i) =>
                              i === idx ? { ...item, completed: e.target.checked } : item
                            );
                            setSelected({ ...selected, syllabusBreakdown: updated });
                          }}
                        />
                        <strong className="text-zinc-300 font-mono text-[10px]">{ch.chapterId}:</strong> {ch.topicName}
                      </span>
                      <button
                        onClick={() => {
                          setSelected({
                            ...selected,
                            syllabusBreakdown: selected.syllabusBreakdown.filter((_, i) => i !== idx)
                          });
                        }}
                        className="text-rose-450 hover:text-rose-400 text-[10px]"
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 mt-2 border-t border-zinc-900">
                    <input
                      type="text"
                      placeholder="Chapter ID (e.g. ch01)"
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px]"
                      value={newChapterId}
                      onChange={(e) => setNewChapterId(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Topic Description / Name"
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px]"
                      value={newChapterTopic}
                      onChange={(e) => setNewChapterTopic(e.target.value)}
                    />
                    <button
                      onClick={() => {
                        if (!newChapterId || !newChapterTopic) return;
                        setSelected({
                          ...selected,
                          syllabusBreakdown: [
                            ...selected.syllabusBreakdown,
                            { chapterId: newChapterId, topicName: newChapterTopic, completed: false }
                          ]
                        });
                        setNewChapterId('');
                        setNewChapterTopic('');
                      }}
                      className="bg-teal-600/30 text-teal-300 hover:bg-teal-600/50 rounded text-[11px] py-1 font-semibold"
                    >
                      Insert Chapter
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-3xl p-12 py-24 bg-black/20 text-center">
            <Layers className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-zinc-400 font-semibold text-sm">No Class Batch Selected</p>
            <p className="text-zinc-650 text-xs mt-1 max-w-sm">
              Select an educational syllabus channel stream on the left side or start a fresh overriding catalog batch profile.
            </p>
            <button
              onClick={handleCreateNew}
              className="mt-4 px-4 py-2 bg-[#12121c] border border-indigo-500/20 hover:bg-indigo-300/10 text-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
            >
              <Plus className="w-4 h-4" /> Initialize Fresh Batch
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
