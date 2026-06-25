import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { SecurityAuditEntry } from '../../services/adminService';
import { Shield, Search, Terminal, AlertCircle, RefreshCw, Calendar, ArrowRight, Activity } from 'lucide-react';

export default function AuditLogsView() {
  const [logs, setLogs] = useState<SecurityAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterCol, setFilterCol] = useState<string>('ALL');

  useEffect(() => {
    loadAuditTrailLogs();
  }, []);

  const loadAuditTrailLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('audit_logs').select('*');
      if (error) throw error;
      const list = (data || []).map((r: any) => ({
        id: r.id,
        adminUserId: r.admin_user_id,
        actionType: r.action_type,
        targetCollection: r.target_collection,
        targetDocumentId: r.target_document_id,
        timestamp: r.timestamp,
        ipAddressSnapshot: r.ip_address,
        deltaChanges: r.delta_changes || []
      }));
      // Sort newest logs first
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(list);
    } catch (err) {
      console.error('Failed to load system audit trail logs from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper mock generation to easily test the security collection if it is completely empty
  const handleSeedMockLog = async () => {
    try {
      const mockId = `log_mock_${Date.now()}`;
      const mockEntry = {
        id: mockId,
        admin_user_id: 'mock_test_admin@biovised.in',
        action_type: 'PRICE_OVERRIDE',
        target_collection: 'BATCHES',
        target_document_id: 'batch_neet_fasttrack_2026',
        timestamp: new Date().toISOString(),
        ip_address: '192.168.1.100 (Simulated)',
        delta_changes: [
          {
            fieldName: 'pricingTiers[0].discountPrice',
            previousValue: 4200,
            newValue: 3200
          }
        ]
      };
      await supabase.from('audit_logs').insert(mockEntry);
      await loadAuditTrailLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLogs = logs.filter(log => {
    const term = searchQuery.toLowerCase();
    const actionMatch = filterAction === 'ALL' || log.actionType === filterAction;
    const colMatch = filterCol === 'ALL' || log.targetCollection === filterCol;
    const textMatch =
      log.id.toLowerCase().includes(term) ||
      log.adminUserId.toLowerCase().includes(term) ||
      log.targetDocumentId.toLowerCase().includes(term);

    return actionMatch && colMatch && textMatch;
  });

  return (
    <div className="bg-[#0b0b0e] border border-zinc-900 rounded-3xl p-6 mt-4 text-zinc-100 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900 pb-4 mb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
            <Shield className="w-5 h-5 text-indigo-400 animate-pulse" /> System Security Audit Trail Logging
          </h2>
          <p className="text-zinc-500 text-xs mt-0.5">
            Cryptographically tracked lifecycle operations logs registered in Supabase table <span className="font-mono text-zinc-400">audit_logs</span>
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={loadAuditTrailLogs}
            className="p-1 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 rounded-xl text-xs flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
          </button>
          <button
            onClick={handleSeedMockLog}
            className="p-1 px-3 bg-[#111116] hover:bg-indigo-950/20 text-indigo-300 border border-indigo-500/10 hover:border-indigo-500/25 rounded-xl text-xs flex items-center gap-1.5 transition"
            title="Inject a test price override audit document for sandbox compliance validation"
          >
            <Terminal className="w-3.5 h-3.5" /> Seed Test Entry
          </button>
        </div>
      </div>

      {/* FILTATION CONTROLS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-5">
        <div className="md:col-span-6 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search log references, document UIDs or adminEmails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121216] border border-zinc-850 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 transition text-zinc-200"
          />
        </div>

        <div className="md:col-span-3">
          <select
            className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-zinc-400 focus:outline-none"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="ALL">All Actions Types</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="VERIFY_SET">VERIFY_SET</option>
            <option value="PRICE_OVERRIDE">PRICE_OVERRIDE</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-zinc-400 focus:outline-none"
            value={filterCol}
            onChange={(e) => setFilterCol(e.target.value)}
          >
            <option value="ALL">All Collections</option>
            <option value="TEACHERS">TEACHERS</option>
            <option value="INSTITUTES">INSTITUTES</option>
            <option value="BATCHES">BATCHES</option>
            <option value="TEST_SERIES">TEST_SERIES</option>
            <option value="GLOBAL_LAYOUT">GLOBAL_LAYOUT</option>
          </select>
        </div>
      </div>

      {/* MAIN SYSTEM LOG LISTINGS */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-indigo-400">
          <Activity className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
          {filteredLogs.map(log => {
            const hasDelta = log.deltaChanges && log.deltaChanges.length > 0;
            return (
              <div key={log.id} className="bg-[#121216] border border-zinc-900/90 hover:border-zinc-800 p-4 rounded-2xl space-y-3 transition">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-mono bg-black text-zinc-450 border border-zinc-800 px-2 py-0.5 rounded-md font-bold shrink-0">
                      ID: {log.id}
                    </span>

                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      log.actionType === 'CREATE' ? 'bg-teal-500/10 text-teal-400' :
                      log.actionType === 'DELETE' ? 'bg-rose-500/10 text-rose-450' :
                      log.actionType === 'PRICE_OVERRIDE' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                      log.actionType === 'VERIFY_SET' ? 'bg-sky-550/10 text-sky-400' : 'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      {log.actionType}
                    </span>

                    <span className="text-zinc-600 text-[11px]">•</span>

                    <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">
                      {log.targetCollection} : {log.targetDocumentId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono shrink-0">
                    <Calendar className="w-3 h-3 text-zinc-650" />
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between text-[11px] text-zinc-450 bg-black/30 p-2.5 rounded-lg border border-zinc-900 gap-2">
                  <p>Triggered by administrator: <strong className="text-zinc-300 font-mono font-semibold">@{log.adminUserId}</strong></p>
                  <p className="text-zinc-500 text-[10px] font-mono">Gateway Snapshot: {log.ipAddressSnapshot}</p>
                </div>

                {/* DELTA PREPARATION TABLE */}
                {hasDelta ? (
                  <div className="space-y-1.5 border border-zinc-900 p-3 rounded-xl bg-zinc-950/60 text-[11px]">
                    <p className="text-[10px] font-bold text-zinc-500 flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5" /> Delta Transitions Committed
                    </p>
                    <div className="space-y-1">
                      {log.deltaChanges.map((delta, dIdx) => (
                        <div key={dIdx} className="grid grid-cols-1 md:grid-cols-12 gap-1 py-1 border-b border-zinc-900/60 last:border-o items-center">
                          <span className="md:col-span-3 text-zinc-400 font-mono text-[10px] break-all">{delta.fieldName}:</span>
                          <div className="md:col-span-9 flex flex-wrap items-center gap-1.5">
                            <span className="bg-rose-950/20 text-rose-350 border border-rose-900/30 font-mono px-1.5 py-0.5 rounded text-[10px] line-clamp-1 max-w-[150px]" title={JSON.stringify(delta.previousValue)}>
                              {delta.previousValue === null ? 'null' : String(JSON.stringify(delta.previousValue))}
                            </span>
                            <ArrowRight className="w-3 h-3 text-zinc-650 shrink-0" />
                            <span className="bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 font-mono px-1.5 py-0.5 rounded text-[10px] line-clamp-1 max-w-[150px]" title={JSON.stringify(delta.newValue)}>
                              {delta.newValue === null ? 'null' : String(JSON.stringify(delta.newValue))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-600 italic">No delta changes were serialized for this admin transaction step.</p>
                )}
              </div>
            );
          })}
          {filteredLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-zinc-600 border border-dashed border-zinc-850 rounded-2xl text-center">
              <AlertCircle className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-zinc-500 font-semibold text-xs">No Audit logs found</p>
              <p className="text-zinc-600 text-[11px] mt-0.5">Filter search criteria or trigger new administrator updates above.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
