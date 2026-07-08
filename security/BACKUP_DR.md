# Backup & Disaster Recovery — BIOVISED

## RTO / RPO Targets

| Tier | Recovery Time Objective | Recovery Point Objective |
|------|------------------------|--------------------------|
| Database (Supabase PostgreSQL) | 1 hour | 5 minutes |
| Storage (user-content bucket) | 2 hours | 1 hour |
| Edge Functions (Supabase) | 30 minutes | N/A (stateless) |
| Frontend (Vercel) | 15 minutes | N/A (deploy rollback) |

## Database Backup Strategy

### Automated (Supabase Pro Plan)
- Supabase Pro includes **daily backups** with 7-day retention
- **Point-in-Time Recovery (PITR)** available on Pro plan (7-day window)
- Backups download automatically via Supabase Dashboard → Database → Backups

### Manual (Weekly Full + Daily WAL)
```bash
# Full database dump (run weekly)
pg_dump \
  --host=$SUPABASE_DB_HOST \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --format=custom \
  --file=biovised_full_$(date +%Y%m%d).dump \
  --no-owner \
  --no-privileges

# Schema-only backup (for migration reference)
pg_dump \
  --schema-only \
  --file=biovised_schema_$(date +%Y%m%d).sql

# Restore (if needed)
pg_restore \
  --host=$NEW_SUPABASE_DB_HOST \
  --username=postgres \
  --dbname=postgres \
  --clean \
  --if-exists \
  biovised_full_$(date +%Y%m%d).dump
```

### Automated via GitHub Actions
See `.github/workflows/backup.yml` for scheduled daily backup job.

## Storage Backup Strategy

```bash
# Backup all buckets to local + S3/Backblaze B2
supabase storage list --experimental | while read bucket; do
  supabase storage download "$bucket" --output "./backups/storage/$bucket/"
done

# Restore
for file in ./backups/storage/*/*; do
  supabase storage upload "$(dirname $file | xargs basename)" "$file"
done
```

## Edge Functions Backup
```bash
# Functions are deployed via supabase CLI — keep deployment configs versioned
cp -r supabase/functions/ ./backups/functions/
```

## Incident Response Runbook

### Severity Levels
| Level | Definition | Response Time | Examples |
|-------|-----------|--------------|-----------|
| SEV1 | Complete outage / data breach | 15 min | DB down, auth broken, PII leak |
| SEV2 | Major feature degraded | 1 hour | Search down, upload fails |
| SEV3 | Minor issue | 24 hours | Styling bug, slow query |

### SEV1 Runbook

```
1. Isolate:     Kill any running bulk operations
2. Assess:      Check /api/health and /api/health/ready
3. Database:
   a. Check Supabase Dashboard → Database → Connections
   b. Run:        SELECT count(*) FROM pg_stat_activity;
   c. If corrupted: restore from latest PITR backup
4. Storage:
   a. Check Supabase Dashboard → Storage → Buckets
   b. Verify signed URLs work
5. Auth:
   a. Check Supabase Dashboard → Authentication → Users
   b. Verify JWT signing key hasn't rotated unexpectedly
6. Deploy rollback:
   a. Vercel: Dashboard → Deployments → Rollback to last known good
   b. Supabase: Dashboard → Database → Backups → Restore
7. Communicate:
   a. Update status.biovised.com
   b. Post-mortem within 24 hours
```

### SEV2 Runbook

```
1. Check /api/health/ready for DB connectivity
2. Check server logs:     grep "ERROR" | tail -50
3. Check slow queries:    SELECT * FROM pg_stat_activity WHERE state = 'active';
4. Check rate limit store size
5. Verify YouTube API key quota
6. Restart server if needed
```

## Monitoring & Alerting

### Health Check Endpoints
- `GET /api/health` — returns uptime, memory, version
- `GET /api/health/ready` — returns DB connectivity status (503 if down)

### Alert Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| API latency (p95) | > 500ms | > 2s |
| Error rate | > 1% | > 5% |
| DB connection count | > 80% pool | > 95% pool |
| YouTube API quota remaining | < 20% | < 10% |
| Rate limit hits | > 50/min | > 100/min |

## Testing Recovery

### Schedule
- Database restore test: Monthly
- Storage restore test: Quarterly
- Full DR drill: Bi-annually

### Restore Validation Steps
```sql
-- After restore, verify:
SELECT count(*) FROM teachers;  -- Should match pre-backup count
SELECT count(*) FROM profiles;  -- No data loss
SELECT count(*) FROM audit_logs; -- Audit trail intact
```
