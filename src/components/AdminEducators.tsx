import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { TeacherProfile } from '../types';
import { ShieldCheck, Plus, Search, Save, Edit3, ArrowLeft, RefreshCw } from 'lucide-react';

interface AdminEducatorsProps {
  onBack: () => void;
  userEmail: string;
}

export default function AdminEducators({ onBack, userEmail }: AdminEducatorsProps) {
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected teacher for editing, null means "Add New"
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [instituteName, setInstituteName] = useState('');
  const [subject, setSubject] = useState('Physics');
  const [experience, setExperience] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [youtubeChannelId, setYoutubeChannelId] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchTeachersList = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('teachers').select('*');
      if (error) throw error;
      setTeachers(data || []);
    } catch (err: any) {
      console.error('Error fetching teachers:', err);
      setMessage({ text: `Failed to load teachers: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachersList();
  }, []);

  const handleSelectTeacher = (t: any) => {
    setSelectedTeacherId(t.id);
    setFullName(t.name || '');
    setInstituteName(t.instituteName || t.institute_name || t.features?.instituteName || '');
    setSubject(t.subject || 'Physics');
    setExperience(t.years_of_experience || t.experience || '');
    setProfilePhotoUrl(t.avatar || '');
    setYoutubeChannelId(t.features?.youtubeChannelId || t.youtubeChannelId || '');
    setMessage(null);
  };

  const handleClearForm = () => {
    setSelectedTeacherId(null);
    setFullName('');
    setInstituteName('');
    setSubject('Physics');
    setExperience('');
    setProfilePhotoUrl('');
    setYoutubeChannelId('');
    setMessage(null);
  };

  const generateSlug = (name: string, institute: string) => {
    const combined = `${name}_${institute || ''}`;
    return combined
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !instituteName.trim()) {
      setMessage({ text: 'Full Name and Institute Name are required.', type: 'error' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const targetId = selectedTeacherId || generateSlug(fullName, instituteName);

      // Check if we are updating, load the existing data to preserve metrics
      let existingRecord: any = null;
      if (selectedTeacherId) {
        const { data } = await supabase.from('teachers').select('*').eq('id', selectedTeacherId).maybeSingle();
        existingRecord = data;
      } else {
        // Also check if slug already exists to prevent duplicate primary keys
        const { data } = await supabase.from('teachers').select('*').eq('id', targetId).maybeSingle();
        existingRecord = data;
      }

      const features = {
        ...(existingRecord?.features || {}),
        youtubeChannelId: youtubeChannelId.trim(),
        instituteName: instituteName.trim(),
        verificationStatus: 'verified',
        trustScore: existingRecord?.features?.trustScore ?? 90,
        reviewCount: existingRecord?.features?.reviewCount ?? 0,
        trustRatingsCount: existingRecord?.features?.trustRatingsCount ?? '0 ratings',
        ratingCount: existingRecord?.features?.ratingCount ?? '0 ratings'
      };

      const payload = {
        id: targetId,
        name: fullName.trim(),
        subject: subject,
        avatar: profilePhotoUrl.trim() || null,
        rating: existingRecord?.rating ?? 4.5,
        accuracy: existingRecord?.accuracy ?? 90,
        video_count: existingRecord?.video_count ?? 0,
        followers_count: existingRecord?.followers_count ?? 0,
        bio: `Expert educator in ${subject} with ${experience.trim() || 'several'} years of experience, teaching at ${instituteName.trim()}.`,
        is_verified: true,
        subjects: [subject],
        exams: ['JEE', 'NEET'],
        features: features
      };

      const { error } = await supabase.from('teachers').upsert(payload);
      if (error) throw error;

      setMessage({
        text: selectedTeacherId ? 'Educator updated successfully!' : 'New educator added successfully!',
        type: 'success'
      });

      if (!selectedTeacherId) {
        handleClearForm();
      }
      fetchTeachersList();
    } catch (err: any) {
      console.error('Error saving teacher:', err);
      setMessage({ text: `Save failed: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.instituteName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-left text-white font-sans min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-zinc-800 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-zinc-850 hover:border-zinc-500 bg-[#0E0E0E] text-zinc-400 hover:text-white cursor-pointer transition-all"
            title="Back to exploration"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Sanity-Style Content Management</h1>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">Workspace console: {userEmail}</p>
          </div>
        </div>
        <button
          onClick={handleClearForm}
          className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2 px-4 rounded-full transition-all cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4" /> Add New Educator
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: List panel */}
        <div className="lg:col-span-5 border border-zinc-900 bg-[#0A0A0A] rounded-2xl p-5 flex flex-col gap-4 max-h-[80vh]">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Educators Directory ({teachers.length})</h3>
            <button 
              onClick={fetchTeachersList} 
              className="text-zinc-500 hover:text-white ml-auto"
              title="Refresh list"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Filter by name, academy, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111] border border-zinc-850 rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:border-zinc-500 transition-all text-white placeholder-zinc-500"
            />
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {loading ? (
              <p className="text-xs text-zinc-500 text-center py-10 font-mono">Loading directory cache...</p>
            ) : filteredTeachers.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-10 font-mono">No educators match query filter.</p>
            ) : (
              filteredTeachers.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTeacher(t)}
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                    selectedTeacherId === t.id
                      ? 'border-white bg-zinc-900/50'
                      : 'border-zinc-850/50 bg-[#0E0E0E] hover:border-zinc-600'
                  }`}
                >
                  <img
                    src={t.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover border border-zinc-800"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <h4 className="text-xs font-bold truncate text-[#FFFDF1]">{t.name}</h4>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#59C749] shrink-0" />
                    </div>
                    <span className="text-[10px] text-zinc-400 block mt-0.5 truncate">
                      {t.subject} Specialist — {t.instituteName || (t as any).institute_name || t.features?.instituteName || 'Independent'}
                    </span>
                  </div>
                  <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Editing Form */}
        <div className="lg:col-span-7 border border-zinc-900 bg-[#0B0B0C] rounded-2xl p-6 flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
              {selectedTeacherId ? 'Edit Educator Profile Settings' : 'Register New Educator Profile'}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              {selectedTeacherId ? `Modifying database record slug ID: "${selectedTeacherId}"` : 'Creating a new persistent profile on Supabase.'}
            </p>
          </div>

          {message && (
            <div className={`p-3.5 rounded-xl text-xs font-medium border ${
              message.type === 'success'
                ? 'bg-emerald-950/20 border-emerald-800/80 text-emerald-400'
                : 'bg-rose-950/20 border-rose-800/80 text-rose-450'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wide">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alakh Pandey"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-10 bg-[#111] border border-zinc-850 rounded-xl px-3.5 text-xs outline-none focus:border-zinc-500 transition-all text-white placeholder-zinc-600"
                />
              </div>

              {/* Institute Name */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wide">Institute / Academy Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physics Wallah"
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                  className="w-full h-10 bg-[#111] border border-zinc-850 rounded-xl px-3.5 text-xs outline-none focus:border-zinc-500 transition-all text-white placeholder-zinc-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Subject Tag Dropdown */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wide">Primary Subject *</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-10 bg-[#111] border border-zinc-850 rounded-xl px-3 text-xs outline-none focus:border-zinc-500 transition-all text-white"
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Mathematics">Mathematics</option>
                </select>
              </div>

              {/* Years of Experience */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wide">Years of Experience</label>
                <input
                  type="text"
                  placeholder="e.g. 12"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full h-10 bg-[#111] border border-zinc-850 rounded-xl px-3.5 text-xs outline-none focus:border-zinc-500 transition-all text-white placeholder-zinc-600"
                />
              </div>
            </div>

            {/* Profile Picture URL */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wide">Real Profile Picture URL</label>
              <input
                type="text"
                placeholder="e.g. https://images.unsplash.com/photo-..."
                value={profilePhotoUrl}
                onChange={(e) => setProfilePhotoUrl(e.target.value)}
                className="w-full h-10 bg-[#111] border border-zinc-850 rounded-xl px-3.5 text-xs outline-none focus:border-zinc-500 transition-all text-white placeholder-zinc-600"
              />
            </div>

            {/* YouTube Channel ID */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wide">Live YouTube Channel ID ('UC...')</label>
              <input
                type="text"
                placeholder="e.g. UCD16eo98AXl-9T61Xd711kQ"
                value={youtubeChannelId}
                onChange={(e) => setYoutubeChannelId(e.target.value)}
                className="w-full h-10 bg-[#111] border border-zinc-850 rounded-xl px-3.5 text-xs outline-none focus:border-zinc-500 transition-all text-white placeholder-zinc-600"
              />
            </div>

            {/* Form actions */}
            <div className="flex gap-3 pt-4 border-t border-zinc-900 mt-6">
              {selectedTeacherId && (
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="px-4 py-2 border border-zinc-800 hover:border-zinc-650 bg-transparent text-zinc-400 hover:text-white rounded-full text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 flex-grow bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2.5 rounded-full transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? 'Writing changes...' : selectedTeacherId ? 'Save Changes' : 'Upsert Educator'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
