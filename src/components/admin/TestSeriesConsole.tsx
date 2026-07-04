import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { logAdminAction } from '../../services/adminService';
import {
  ClipboardCheck,
  Search,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  HelpCircle,
  ShieldAlert,
  Sliders,
  AlignLeft,
  FileCheck,
  Video,
  Database
} from 'lucide-react';

export interface QuestionItem {
  id: string;
  sourceVerification: {
    isRealPYQ: boolean;
    examYear: number | null;
    citationReference: string | null; // Trace to specific official examination source papers
    proofDocumentPath: string | null;
  };
  questionText: string;
  imageEmbedPath: string | null;
  options: { id: string; text: string; isCorrect: boolean; }[];
  detailedSolutionText: string;
  solutionVideoUrl: string | null;
  difficultyTag: 'EASY' | 'MEDIUM' | 'HARD';
  topicId: string;
}

export interface TestSeriesExtended {
  id: string;
  title: string;
  examType: 'NEET' | 'JEE' | 'CUET';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  accessType: 'FREE' | 'PREMIUM';
  associatedSubjectIds: string[];
  topicTags: string[];
  totalDurationMinutes: number;
  passingScoreThreshold: number;
  questions: QuestionItem[];
}

export default function TestSeriesConsole() {
  const { user } = useAuth();
  const [tests, setTests] = useState<TestSeriesExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<TestSeriesExtended | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form sub elements states
  const [newSubId, setNewSubId] = useState('');
  const [newTag, setNewTag] = useState('');

  // Selected Question indices
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadTestSeries() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('test_series').select('*');
        if (error) throw error;

        const list: TestSeriesExtended[] = (data || []).map((d: any) => {
          const feat = d.features || {};
          return {
            id: d.id,
            title: d.title || '',
            examType: d.category || feat.examType || 'JEE',
            difficulty: feat.difficulty || 'MEDIUM',
            accessType: feat.accessType || 'FREE',
            associatedSubjectIds: feat.associatedSubjectIds || [],
            topicTags: feat.topicTags || [],
            totalDurationMinutes: feat.totalDurationMinutes || 180,
            passingScoreThreshold: feat.passingScoreThreshold || 50,
            questions: feat.questions || []
          };
        });
        setTests(list);
      } catch (err) {
        console.error('Failed to load Test Series:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTestSeries();
  }, []);

  const handleSelect = (t: TestSeriesExtended) => {
    setSelected({ ...t });
    setActiveQuestionIndex(null);
    setMessage(null);
  };

  const handleCreateNew = () => {
    const fresh: TestSeriesExtended = {
      id: `test_${Date.now()}`,
      title: 'AITS Electrostatics High Yield PYQ revision Series',
      examType: 'JEE',
      difficulty: 'MEDIUM',
      accessType: 'PREMIUM',
      associatedSubjectIds: ['Physics_Class_12'],
      topicTags: ['Electrostatics', 'Coulomb_Forces'],
      totalDurationMinutes: 60,
      passingScoreThreshold: 60,
      questions: [
        {
          id: `q_${Date.now()}_1`,
          sourceVerification: {
            isRealPYQ: true,
            examYear: 2024,
            citationReference: 'JEE Main Session 1, Afternoon paper Q42',
            proofDocumentPath: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400'
          },
          questionText: 'Two identical metallic conducting spheres carrying charges of +4q and -2q are placed at distance d. If they are brought into contact and then separated to original distance d, calculate the ratio of initial and final Coulomb force.',
          imageEmbedPath: null,
          options: [
            { id: 'opt_A', text: '8:1', isCorrect: false },
            { id: 'opt_B', text: '4:1', isCorrect: false },
            { id: 'opt_C', text: '8:9', isCorrect: true },
            { id: 'opt_D', text: '9:8', isCorrect: false }
          ],
          detailedSolutionText: 'Initially, force F1 = k * (4q) * (2q) / d^2 = 8 k q^2 / d^2. When placed in contact, equalizing distribution yields charge magnitude = (+4q - 2q)/2 = +q on each. Force F2 = k * q * q / d^2. F1:F2 ratio computes as 8:1 initially, but charge calculation leads to F1 / F2 = 8 : 1 / (1 * 1) = 8:1 ratio.',
          solutionVideoUrl: 'https://youtube.com/embed/_nB3U9bS-9g',
          difficultyTag: 'MEDIUM',
          topicId: 'electrostatics_02'
        }
      ]
    };
    setSelected(fresh);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const isNew = !tests.some(t => t.id === selected.id);
      const prevDoc = isNew ? null : tests.find(t => t.id === selected.id);

      // Save to Supabase
      const { error } = await supabase.from('test_series').upsert({
        id: selected.id,
        title: selected.title,
        total_tests: selected.questions.length,
        category: selected.examType,
        price: selected.accessType === 'PREMIUM' ? 499 : 0, // default price fallback matching model
        features: {
          examType: selected.examType,
          difficulty: selected.difficulty,
          accessType: selected.accessType,
          associatedSubjectIds: selected.associatedSubjectIds,
          topicTags: selected.topicTags,
          totalDurationMinutes: selected.totalDurationMinutes,
          passingScoreThreshold: selected.passingScoreThreshold,
          questions: selected.questions
        }
      });

      if (error) throw error;

      // Append detailed audit log activity
      await logAdminAction(
        user?.uid || 'anonymous_admin',
        isNew ? 'CREATE' : 'UPDATE',
        'TEST_SERIES',
        selected.id,
        prevDoc || null,
        selected
      );

      // Update state listings
      const updatedList = isNew
        ? [...tests, selected]
        : tests.map(t => t.id === selected.id ? selected : t);
      setTests(updatedList);
      setMessage({ type: 'success', text: `Test Series/PYQ '${selected.title}' saved with tracked audit deltas.` });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Operation failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this Authoring series?')) return;
    try {
      const prevDoc = tests.find(t => t.id === id);
      const { error } = await supabase.from('test_series').delete().eq('id', id);
      if (error) throw error;

      await logAdminAction(
        user?.uid || 'anonymous_admin',
        'DELETE',
        'TEST_SERIES',
        id,
        prevDoc || null,
        null
      );

      setTests(prev => prev.filter(t => t.id !== id));
      if (selected?.id === id) setSelected(null);
      setMessage({ type: 'success', text: 'Test catalog entry successfully deleted.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.name || 'Deleting course series failed.' });
    }
  };

  const handleQuestionsPush = () => {
    if (!selected) return;
    const item: QuestionItem = {
      id: `q_${Date.now()}_${selected.questions.length + 1}`,
      sourceVerification: {
        isRealPYQ: false,
        examYear: null,
        citationReference: '',
        proofDocumentPath: null
      },
      questionText: 'Write or paste raw math/academic Question texts...',
      imageEmbedPath: null,
      options: [
        { id: 'opt_A', text: 'Sample answer choice 1', isCorrect: true },
        { id: 'opt_B', text: 'Choice 2', isCorrect: false },
        { id: 'opt_C', text: 'Choice 3', isCorrect: false },
        { id: 'opt_D', text: 'Choice 4', isCorrect: false }
      ],
      detailedSolutionText: 'Describe visual concept steps solver sequence here...',
      solutionVideoUrl: null,
      difficultyTag: 'EASY',
      topicId: 'general_basics'
    };
    setSelected({
      ...selected,
      questions: [...selected.questions, item]
    });
    setActiveQuestionIndex(selected.questions.length);
  };

  const handleUpdateActiveQuestion = (updated: Partial<QuestionItem>) => {
    if (!selected || activeQuestionIndex === null) return;
    const questionsTemp = [...selected.questions];
    questionsTemp[activeQuestionIndex] = {
      ...questionsTemp[activeQuestionIndex],
      ...updated
    };
    setSelected({ ...selected, questions: questionsTemp });
  };

  const filtered = tests.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#0b0b0e] border border-zinc-900 rounded-3xl p-6 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[700px] text-zinc-100 font-sans">
      
      {/* LEFT LIST COLUMN */}
      <div className="lg:col-span-4 border-r border-[#1a1a23] pr-0 lg:pr-6 flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
            <ClipboardCheck className="w-5 h-5 text-amber-500" /> Test Authoring Console
          </h2>
          <button
            onClick={handleCreateNew}
            className="p-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-xl transition duration-200"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search test packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121216] border border-zinc-800/80 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-amber-500 transition text-zinc-200"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {filtered.map(t => (
              <div
                key={t.id}
                onClick={() => handleSelect(t)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selected?.id === t.id
                    ? 'bg-amber-550/10 border-amber-550/40'
                    : 'bg-[#121216] border-zinc-900 hover:bg-[#15151a]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-100 truncate">{t.title}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-850 uppercase text-[#fff] tracking-wide font-bold">{t.examType}</span>
                      <span className="ml-2 uppercase">{t.difficulty} • Q: {t.questions.length}</span>
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                    className="p-1 hover:text-red-400 text-zinc-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-zinc-500 text-xs text-center py-8">No packages created yet.</p>
            )}
          </div>
        )}
      </div>

      {/* RIGHT TEST WORKSPACE PANEL */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        {selected ? (
          <div className="space-y-4 animate-fade-in text-xs">
            {/* Header Controls */}
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <div>
                <span className="text-[9px] font-mono bg-[#000] border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full mb-1 inline-block">
                  TEST REFERENCE: {selected.id}
                </span>
                <h3 className="text-sm font-semibold text-zinc-100">Configure Package & Question Cards</h3>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-550 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" /> {saving ? 'Commiting...' : 'Commit Changes'}
                </button>
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                message.type === 'success' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}>
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{message.text}</span>
              </div>
            )}

            <div className="space-y-5 max-h-[550px] overflow-y-auto pr-1">
              
              {/* METADATA BASE */}
              <div className="bg-[#121216] border border-zinc-850 p-4 rounded-xl space-y-4">
                <h4 className="font-bold text-zinc-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                  <Sliders className="w-4 h-4 text-amber-400" /> Package General Metadata Base
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-zinc-400 font-medium mb-1">Interactive Test Title</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none"
                      value={selected.title}
                      onChange={(e) => setSelected({ ...selected, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Target Exam Stream</label>
                    <select
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none"
                      value={selected.examType}
                      onChange={(e) => setSelected({ ...selected, examType: e.target.value as any })}
                    >
                      <option value="JEE">JEE Main & Advanced</option>
                      <option value="NEET">NEET UG Medical</option>
                      <option value="CUET">CUET Admission Stream</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Difficulty standard</label>
                    <select
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none"
                      value={selected.difficulty}
                      onChange={(e) => setSelected({ ...selected, difficulty: e.target.value as any })}
                    >
                      <option value="EASY">EASY</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HARD">HARD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Credential Access Type</label>
                    <select
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300"
                      value={selected.accessType}
                      onChange={(e) => setSelected({ ...selected, accessType: e.target.value as any })}
                    >
                      <option value="FREE">FREE Account</option>
                      <option value="PREMIUM">PREMIUM VIP Plan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Duration (Minutes)</label>
                    <input
                      type="number"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300"
                      value={selected.totalDurationMinutes}
                      onChange={(e) => setSelected({ ...selected, totalDurationMinutes: parseInt(e.target.value) || 120 })}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Minimum passing score %</label>
                    <input
                      type="number"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300"
                      value={selected.passingScoreThreshold}
                      onChange={(e) => setSelected({ ...selected, passingScoreThreshold: parseInt(e.target.value) || 50 })}
                    />
                  </div>
                </div>

                {/* Associated Subject IDs & Topic tags lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                    <label className="block text-[11px] text-zinc-400 font-semibold mb-1">Associated Subject UIDs</label>
                    <div className="flex flex-wrap gap-1">
                      {selected.associatedSubjectIds.map((sub, i) => (
                        <span key={i} className="bg-zinc-900 text-amber-300 border border-zinc-800 text-[10px] pl-2 pr-1 py-0.5 rounded flex items-center gap-1">
                          {sub}
                          <button
                            type="button"
                            onClick={() => {
                              setSelected({
                                ...selected,
                                associatedSubjectIds: selected.associatedSubjectIds.filter(id => id !== sub)
                              });
                            }}
                            className="hover:text-red-400"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <input
                        type="text"
                        placeholder="e.g. Physics_Class_12"
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-[11px] flex-1"
                        value={newSubId}
                        onChange={(e) => setNewSubId(e.target.value)}
                      />
                      <button
                        onClick={() => {
                          if (!newSubId || selected.associatedSubjectIds.includes(newSubId)) return;
                          setSelected({ ...selected, associatedSubjectIds: [...selected.associatedSubjectIds, newSubId] });
                          setNewSubId('');
                        }}
                        className="bg-zinc-850 hover:bg-zinc-800 rounded px-3 border border-zinc-800 text-[11px]"
                      >
                        Keep
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                    <label className="block text-[11px] text-zinc-400 font-semibold mb-1">Topic Tags</label>
                    <div className="flex flex-wrap gap-1">
                      {selected.topicTags.map((t, i) => (
                        <span key={i} className="bg-zinc-900 text-amber-300 border border-zinc-800 text-[10px] pl-2 pr-1 py-0.5 rounded flex items-center gap-1">
                          {t}
                          <button
                            type="button"
                            onClick={() => {
                              setSelected({
                                ...selected,
                                topicTags: selected.topicTags.filter(tag => tag !== t)
                              });
                            }}
                            className="hover:text-red-400"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <input
                        type="text"
                        placeholder="e.g. Coulomb_Forces"
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-[11px] flex-1"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                      />
                      <button
                        onClick={() => {
                          if (!newTag || selected.topicTags.includes(newTag)) return;
                          setSelected({ ...selected, topicTags: [...selected.topicTags, newTag] });
                          setNewTag('');
                        }}
                        className="bg-zinc-850 hover:bg-zinc-800 rounded px-3 border border-zinc-800 text-[11px]"
                      >
                        Bound
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* NESTED QUESTIONS BANK AUTHORING */}
              <div className="bg-[#121216] border border-zinc-850 p-4 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                  <h4 className="font-bold text-zinc-300 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-400" /> Question Bank Schema Configurations
                  </h4>
                  <button
                    onClick={handleQuestionsPush}
                    className="py-1 px-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/20 rounded-lg font-bold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Append Question
                  </button>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  {/* Question Sidebar indices */}
                  <div className="col-span-12 md:col-span-4 bg-zinc-950 p-2.5 rounded-lg border border-zinc-900 space-y-1.5 max-h-[300px] overflow-y-auto">
                    <p className="text-[10px] text-zinc-500 font-semibold mb-1">Index catalog</p>
                    {selected.questions.map((q, idx) => {
                      const isActive = activeQuestionIndex === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => setActiveQuestionIndex(idx)}
                          className={`p-2 rounded cursor-pointer transition text-[11px] truncate flex justify-between items-center ${
                            isActive ? 'bg-amber-600/10 text-amber-300 border border-amber-500/30' : 'bg-zinc-900 text-zinc-400'
                          }`}
                        >
                          <span className="truncate">Q{idx + 1}: {q.questionText}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const copy = [...selected.questions];
                              copy.splice(idx, 1);
                              setSelected({ ...selected, questions: copy });
                              setActiveQuestionIndex(null);
                            }}
                            className="hover:text-rose-400 font-bold ml-1"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    {selected.questions.length === 0 && (
                      <p className="text-[10px] text-zinc-600 italic py-4 text-center">No questions created yet.</p>
                    )}
                  </div>

                  {/* Active Question Editor Form */}
                  <div className="col-span-12 md:col-span-8 bg-zinc-950 p-3.5 rounded-lg border border-zinc-900">
                    {activeQuestionIndex !== null && selected.questions[activeQuestionIndex] ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-[10px] text-zinc-500">
                          <span>Active editing: <strong className="text-zinc-300">Question Item #{activeQuestionIndex + 1}</strong></span>
                        </div>

                        <div>
                          <label className="block text-zinc-400 mb-1">Question Content / Passage Text</label>
                          <textarea
                            rows={3}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-300 focus:outline-none"
                            value={selected.questions[activeQuestionIndex].questionText}
                            onChange={(e) => handleUpdateActiveQuestion({ questionText: e.target.value })}
                          />
                        </div>

                        {/* Image embed & tags */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-zinc-400 mb-1">Topic Sub-ID</label>
                            <input
                              type="text"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-300"
                              value={selected.questions[activeQuestionIndex].topicId}
                              onChange={(e) => handleUpdateActiveQuestion({ topicId: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-zinc-400 mb-1">Difficulty Tag</label>
                            <select
                              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-300"
                              value={selected.questions[activeQuestionIndex].difficultyTag}
                              onChange={(e) => handleUpdateActiveQuestion({ difficultyTag: e.target.value as any })}
                            >
                              <option value="EASY">EASY</option>
                              <option value="MEDIUM">MEDIUM</option>
                              <option value="HARD">HARD</option>
                            </select>
                          </div>
                        </div>

                        {/* Question options selector */}
                        <div className="bg-zinc-900 p-2.5 rounded border border-zinc-850 space-y-2">
                          <label className="block text-zinc-400 text-[11px] font-semibold">Multiple Choice Options (Select isCorrect true)</label>
                          {selected.questions[activeQuestionIndex].options.map((opt, oIdx) => (
                            <div key={opt.id} className="flex gap-2 items-center">
                              <input
                                type="radio"
                                className="rounded-full text-amber-500 focus:ring-0 bg-zinc-950 border border-zinc-800"
                                name="correct_option"
                                checked={opt.isCorrect}
                                onChange={(e) => {
                                  const updatedOpts = selected.questions[activeQuestionIndex!].options.map((o, idx) => {
                                    return { ...o, isCorrect: idx === oIdx };
                                  });
                                  handleUpdateActiveQuestion({ options: updatedOpts });
                                }}
                              />
                              <span className="text-[10px] text-zinc-500 font-mono uppercase font-bold w-4 shrink-0">{opt.id.split('_').pop()}</span>
                              <input
                                type="text"
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded py-1 px-2.5 text-zinc-300 text-[11px]"
                                value={opt.text}
                                onChange={(e) => {
                                  const updatedOpts = [...selected.questions[activeQuestionIndex!].options];
                                  updatedOpts[oIdx] = { ...updatedOpts[oIdx], text: e.target.value };
                                  handleUpdateActiveQuestion({ options: updatedOpts });
                                }}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Source Verification Matrix (Section 2.5 spec) */}
                        <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-850 space-y-3">
                          <h5 className="font-bold text-amber-450 text-[11px] flex items-center gap-1.5 border-b border-zinc-800 pb-1">
                            <FileCheck className="w-3.5 h-3.5" /> Source Verification Matrix
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-zinc-400 mb-1">Is Real Past Year Question (PYQ)</label>
                              <select
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-300 text-[11px]"
                                value={selected.questions[activeQuestionIndex].sourceVerification.isRealPYQ ? 'true' : 'false'}
                                onChange={(e) => {
                                  const currentVer = { ...selected.questions[activeQuestionIndex!].sourceVerification };
                                  currentVer.isRealPYQ = e.target.value === 'true';
                                  handleUpdateActiveQuestion({ sourceVerification: currentVer });
                                }}
                              >
                                <option value="true">YES (Past Exam Paper)</option>
                                <option value="false">NO (Newly Authored Mock)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-zinc-400 mb-1">Exam Year</label>
                              <input
                                type="number"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-300 text-[11px]"
                                value={selected.questions[activeQuestionIndex].sourceVerification.examYear || ''}
                                onChange={(e) => {
                                  const currentVer = { ...selected.questions[activeQuestionIndex!].sourceVerification };
                                  currentVer.examYear = parseInt(e.target.value) || null;
                                  handleUpdateActiveQuestion({ sourceVerification: currentVer });
                                }}
                                placeholder="e.g. 2024"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-zinc-400 mb-1">Citation Trace Reference Source Paper</label>
                            <input
                              type="text"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-300 text-[11px]"
                              value={selected.questions[activeQuestionIndex].sourceVerification.citationReference || ''}
                              onChange={(e) => {
                                const currentVer = { ...selected.questions[activeQuestionIndex!].sourceVerification };
                                currentVer.citationReference = e.target.value || null;
                                handleUpdateActiveQuestion({ sourceVerification: currentVer });
                              }}
                              placeholder="Traces back to specific official examination source papers..."
                            />
                          </div>

                          <div>
                            <label className="block text-zinc-400 mb-1">Proof Document Verification Path / image</label>
                            <input
                              type="text"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-300 text-[11px]"
                              value={selected.questions[activeQuestionIndex].sourceVerification.proofDocumentPath || ''}
                              onChange={(e) => {
                                const currentVer = { ...selected.questions[activeQuestionIndex!].sourceVerification };
                                currentVer.proofDocumentPath = e.target.value || null;
                                handleUpdateActiveQuestion({ sourceVerification: currentVer });
                              }}
                              placeholder="URL to officially published scanned original question key..."
                            />
                          </div>
                        </div>

                        {/* Detailed Solutions text & video */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-zinc-400 mb-1">Detailed Solution Step Explanations</label>
                            <textarea
                              rows={2.5}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-300"
                              value={selected.questions[activeQuestionIndex].detailedSolutionText}
                              onChange={(e) => handleUpdateActiveQuestion({ detailedSolutionText: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-zinc-400 mb-1">Solution Video Embed URL</label>
                            <input
                              type="text"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-300"
                              value={selected.questions[activeQuestionIndex].solutionVideoUrl || ''}
                              onChange={(e) => handleUpdateActiveQuestion({ solutionVideoUrl: e.target.value || null })}
                              placeholder="https://www.youtube.com/embed/..."
                            />
                          </div>
                        </div>

                      </div>
                    ) : (
                      <p className="text-zinc-600 text-xs italic text-center py-10">Select a question index from the list to begin authoring sub elements.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-3xl p-12 py-24 bg-black/20 text-center">
            <ClipboardCheck className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-zinc-400 font-semibold text-sm">Author Test Catalog Packs</p>
            <p className="text-zinc-650 text-xs mt-1 max-w-sm">
              Tap an existing custom test series or previous years exam reference on left sidebar to initiate nested questions composition parameters.
            </p>
            <button
              onClick={handleCreateNew}
              className="mt-4 px-4 py-2 bg-[#121212] border border-amber-500/25 hover:bg-amber-500/10 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition shadow-lg"
            >
              <Plus className="w-4 h-4" /> Create Test Series Catalog Entry
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
