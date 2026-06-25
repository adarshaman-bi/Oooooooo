import { supabase } from '../utils/supabaseClient';

export interface SecurityAuditEntry {
  id: string;
  adminUserId: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'VERIFY_SET' | 'PRICE_OVERRIDE';
  targetCollection: 'TEACHERS' | 'INSTITUTES' | 'BATCHES' | 'TEST_SERIES' | 'GLOBAL_LAYOUT';
  targetDocumentId: string;
  timestamp: string;
  ipAddressSnapshot: string;
  deltaChanges: {
    fieldName: string;
    previousValue: any;
    newValue: any;
  }[];
}

export async function logAdminAction(
  adminUserId: string,
  actionType: SecurityAuditEntry['actionType'],
  targetCollection: SecurityAuditEntry['targetCollection'],
  targetDocumentId: string,
  previousValue: any,
  newValue: any
) {
  try {
    const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Compute deltas
    const deltaChanges: SecurityAuditEntry['deltaChanges'] = [];
    
    if (actionType === 'CREATE') {
      if (newValue) {
        Object.keys(newValue).forEach((key) => {
          deltaChanges.push({
            fieldName: key,
            previousValue: null,
            newValue: newValue[key],
          });
        });
      }
    } else if (actionType === 'DELETE') {
      if (previousValue) {
        Object.keys(previousValue).forEach((key) => {
          deltaChanges.push({
            fieldName: key,
            previousValue: previousValue[key],
            newValue: null,
          });
        });
      }
    } else if (actionType === 'UPDATE' || actionType === 'VERIFY_SET' || actionType === 'PRICE_OVERRIDE') {
      const allKeys = new Set([
        ...Object.keys(previousValue || {}),
        ...Object.keys(newValue || {}),
      ]);
      
      allKeys.forEach((key) => {
        const prev = previousValue?.[key];
        const next = newValue?.[key];
        if (JSON.stringify(prev) !== JSON.stringify(next)) {
          deltaChanges.push({
            fieldName: key,
            previousValue: prev === undefined ? null : prev,
            newValue: next === undefined ? null : next,
          });
        }
      });
    }

    const entry = {
      id,
      admin_user_id: adminUserId || 'system',
      action_type: actionType,
      target_collection: targetCollection,
      target_document_id: targetDocumentId,
      timestamp: new Date().toISOString(),
      ip_address: '127.0.0.1 (preview sandbox)',
      delta_changes: deltaChanges,
    };

    await supabase.from('audit_logs').insert(entry);
    console.log(`[Audit Log] Added tracking entry ${id} for ${actionType} on ${targetCollection}/${targetDocumentId}`);
  } catch (error) {
    console.error('Failed to write admin security audit log:', error);
  }
}
