# BIOVISED — Ingestion Pipeline Mistakes Log
## READ THIS FILE IN FULL BEFORE STARTING ANY INGESTION, DATABASE, OR SCHEMA-RELATED TASK.
## After fixing any new mistake, ADD it to this file so it is never repeated.

---

### MISTAKE #1 — Reported "success" without verifying against the database
**What happened:** Ingestion pipeline reported "Playlist and channel synced successfully"
multiple times when the underlying database columns didn't exist yet. The self-healing
dynamic column detection silently skipped writing missing fields instead of failing
loudly, so "success" was reported while critical data (channel_title, thumbnails,
duration, etc.) was never actually written.
**Rule going forward:** NEVER report a task complete based on a script exiting without
an error. ALWAYS run an actual `SELECT` query against the affected table(s) afterward
and paste the real output as evidence. A clean exit code is not proof of correct data.

### MISTAKE #2 — Misdiagnosed a code bug as a "schema mismatch"
**What happened:** Live lecture extraction found 237 videos but inserted 0, and the
report claimed "the database schema needs to be aligned with the expected column
structure." This was checked directly against the live database and was FALSE — every
column the script needed already existed (`id`, `title`, `video_url`, `duration_seconds`,
`teacher_name`, `is_playable`, `embed_url`, etc.). The real bug was in the ingestion
script's own field-mapping or a NOT NULL constraint violation on required fields
(`id`, `title`, `video_url`), not the database.
**Rule going forward:** Before claiming "schema mismatch" or "missing column," run
`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE
table_name = '<table>'` and paste the ACTUAL output. Compare it field-by-field against
what the script is trying to write. Do not assume the database is wrong — check it.
If an insert fails, capture and show the ACTUAL database error message/exception, not
a guessed explanation.

### MISTAKE #3 — Ingested non-academic "junk" content mixed into a real channel
**What happened:** A channel's upload history included Cocomelon/Peppa Pig/nursery
rhyme content mixed in with real NEET lectures, and this got ingested before a content
filter existed.
**Rule going forward:** A denylist content filter (see current list in the ingestion
script) must run on EVERY video from EVERY channel before insert, no exceptions, even
for channels that seem clearly academic.

### MISTAKE #4 — Ingested promotional/strategy/announcement videos as if they were lectures
**What happened:** Live lecture extraction pulled in videos like "RE-NEET 2026 Done!
What Next? | Complete Roadmap," "Launching Champions Batch for NEET Dropper," and
"Breaking News | Press conference by Ministry of Education" — these are promotional,
strategy-talk, or news/announcement videos, NOT actual subject lectures with study
material. They passed the academic-length filter (some are long) and the
non-academic-content denylist (they're not kids' content), so they were incorrectly
treated as valid lecture content.
**Rule going forward:** A SEPARATE strategy/promotional content filter must run
alongside the existing academic filter (see Part 2 of the current task below). Length
and "not kids' content" are NOT sufficient signals that a video is a real lecture.

### MISTAKE #5 — Told to remove/fix channels, but didn't do it before moving to the next task
**What happened:** Instructed to remove "Competishun Mentorship" and "Sachin Rana" from
Verified Channels, and fix duplicate "Physics Galaxy" entries, but then moved on to
live-lecture extraction without completing this — those same channels still appeared
as active channels in the next task's output.
**Rule going forward:** Do not start a new phase/task until the previous task's
explicit requirements are confirmed complete WITH evidence. If multiple tasks are
queued, finish and verify one before starting the next, in the order given.

---

## MANDATORY PRE-TASK CHECKLIST (do this before writing any code)
1. Have I read this entire mistakes log?
2. Am I about to claim something is "done" without a query/output to prove it?
3. Am I about to blame the database schema without having actually queried it first?
4. Does my content filter check for BOTH non-academic junk content AND
   promotional/strategy/announcement content?
5. Are there any previously-assigned tasks that were never confirmed complete? If yes,
   finish those first or explicitly flag why they're being deferred.
