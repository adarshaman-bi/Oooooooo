/**
 * BioVised — YouTube Channel & Playlist Verification Script
 *
 * Purpose:
 *   1. Resolve each batch's YouTube channel handle → real channel ID (channels.list forHandle)
 *   2. List ALL playlists on that channel (playlists.list)
 *   3. Apply subject-matching heuristics to find probable playlist IDs per subject
 *   4. Print a JSON summary of verified mappings — DO NOT auto-write to DB
 *      (human must review before any DB update)
 *
 * Run:
 *   node --env-file=.env scripts/verify_channels.mjs
 *
 * Quota cost (worst case): 4 channels.list + 4 playlists.list (paginated) = ~10-20 units
 */

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY || API_KEY.length < 10) {
  console.error('ERROR: YOUTUBE_API_KEY not set in .env');
  process.exit(1);
}

const YT = 'https://www.googleapis.com/youtube/v3';

// ─── Candidate channels ────────────────────────────────────────────────────
// handles to try (in order) — YouTube will 404 if handle doesn't exist
const CANDIDATES = [
  {
    batchId: 'batch_competishun_yearly',
    name: 'Competishun / Mohit Tyagi',
    handles: ['@MohitTyagi', '@CompetishunClasses', '@Competishun', '@mohittyagimaths'],
    subjectKeywords: {
      'Physics':              ['physics', 'phy'],
      'Physical Chemistry':   ['physical chem', 'p.chem', 'physical chemistry'],
      'Organic Chemistry':    ['organic', 'org chem'],
      'Inorganic Chemistry':  ['inorganic', 'inorg'],
      'Mathematics':          ['math', 'maths', 'jee math'],
      'Botany':               ['botany', 'bot', 'plant'],
      'Zoology':              ['zoology', 'zoo', 'animal'],
    }
  },
  {
    batchId: 'batch_physics_galaxy',
    name: 'Physics Galaxy (Ashish Arora)',
    handles: ['@PhysicsGalaxy', '@physicsGalaxy', '@AshishAroraPhysicsGalaxy'],
    subjectKeywords: {
      'Physics':              ['physics', 'mechanics', 'thermodynamics', 'electro', 'modern'],
      'Physical Chemistry':   ['physical chem', 'p.chem', 'physical chemistry', 'chemical kinetics'],
      'Organic Chemistry':    ['organic', 'org chem'],
      'Inorganic Chemistry':  ['inorganic', 'inorg', 'coordination', 'p-block', 's-block'],
    }
  },
  {
    batchId: 'batch_unacademy_atoms',
    name: 'Unacademy Atoms',
    handles: ['@UnacademyAtoms', '@unacademyatoms', '@Atoms'],
    subjectKeywords: {
      'Physics':              ['physics', 'phy'],
      'Physical Chemistry':   ['physical chem', 'p.chem'],
      'Organic Chemistry':    ['organic', 'org chem'],
      'Inorganic Chemistry':  ['inorganic', 'inorg'],
      'Mathematics':          ['math', 'maths'],
    }
  },
  {
    batchId: 'batch_pw_prachand',
    name: 'Physics Wallah — Prachand',
    handles: ['@PhysicsWallah', '@PhysicsWallahAlakhPandey', '@PhysicswallahinHindi'],
    subjectKeywords: {
      'Physics':              ['physics', 'prachand physics'],
      'Physical Chemistry':   ['physical chem', 'p.chem', 'physical chemistry'],
      'Organic Chemistry':    ['organic', 'org chem'],
      'Inorganic Chemistry':  ['inorganic', 'inorg'],
      'Botany':               ['botany', 'bot'],
      'Zoology':              ['zoology', 'zoo'],
    }
  }
];

// ─── Content filter (mirrors 3-tier filter in server.ts) ──────────────────
const STRATEGY_DENYLIST = [
  'strategy', 'motivat', 'tips', 'trick', 'how to study', 'study plan',
  'time table', 'timetable', 'rank', 'topper', 'interview', 'cut.?off',
  'admit card', 'result', 'news', 'update', 'vlog', 'day in my life',
  'reaction', 'roast', 'short', '#short'
];

function isStrategyContent(title) {
  const t = title.toLowerCase();
  return STRATEGY_DENYLIST.some(kw => t.includes(kw));
}

// ─── API helpers ─────────────────────────────────────────────────────────
async function resolveHandle(handle) {
  const h = handle.startsWith('@') ? handle : `@${handle}`;
  const url = `${YT}/channels?part=snippet,contentDetails&forHandle=${encodeURIComponent(h)}&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return null;
  return {
    channelId: item.id,
    channelTitle: item.snippet?.title || '',
    description: item.snippet?.description?.slice(0, 200) || '',
    subscriberCount: item.statistics?.subscriberCount || null,
  };
}

async function fetchAllPlaylists(channelId) {
  const playlists = [];
  let pageToken = '';
  let page = 0;
  while (page < 10) { // safety cap: max 500 playlists
    const url = `${YT}/playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=50&key=${API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    if (data.items) playlists.push(...data.items);
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
    page++;
  }
  return playlists;
}

function matchSubject(playlistTitle, keywords) {
  const t = playlistTitle.toLowerCase();
  return keywords.some(kw => t.includes(kw));
}

function scorePlaylist(playlist, subject, keywords) {
  const title = playlist.snippet?.title || '';
  const desc = playlist.snippet?.description || '';
  if (isStrategyContent(title)) return -1;
  const titleLower = title.toLowerCase();
  const matchCount = keywords.filter(kw => titleLower.includes(kw)).length;
  if (matchCount === 0) return 0;
  const itemCount = playlist.contentDetails?.itemCount || 0;
  // Prefer playlists with more content (likely more complete)
  return matchCount * 10 + Math.min(itemCount, 200);
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('BioVised — YouTube Channel & Playlist Verification');
  console.log('====================================================\n');

  const results = [];

  for (const candidate of CANDIDATES) {
    console.log(`\n▶ Verifying: ${candidate.name}`);
    console.log(`  Batch ID: ${candidate.batchId}`);

    // Step 1: Resolve channel handle
    let channelInfo = null;
    let resolvedHandle = null;
    for (const handle of candidate.handles) {
      console.log(`  Trying handle: ${handle} ...`);
      channelInfo = await resolveHandle(handle);
      if (channelInfo) {
        resolvedHandle = handle;
        break;
      }
    }

    if (!channelInfo) {
      console.log(`  ❌ No channel found for any handle. All handles returned 0 results.`);
      results.push({
        batchId: candidate.batchId,
        status: 'CHANNEL_NOT_FOUND',
        triedHandles: candidate.handles,
        channelId: null,
        playlistMappings: {}
      });
      continue;
    }

    console.log(`  ✅ Channel found:`);
    console.log(`     ID:    ${channelInfo.channelId}`);
    console.log(`     Title: ${channelInfo.channelTitle}`);

    // Step 2: Fetch all playlists
    console.log(`  Fetching all playlists...`);
    const allPlaylists = await fetchAllPlaylists(channelInfo.channelId);
    console.log(`  Found ${allPlaylists.length} playlists total.`);

    // Step 3: Filter strategy content + score per subject
    const subjectMappings = {};
    for (const [subject, keywords] of Object.entries(candidate.subjectKeywords)) {
      const scored = allPlaylists
        .map(pl => ({
          id: pl.id,
          title: pl.snippet?.title || '',
          itemCount: pl.contentDetails?.itemCount || 0,
          score: scorePlaylist(pl, subject, keywords)
        }))
        .filter(pl => pl.score > 0)
        .sort((a, b) => b.score - a.score);

      if (scored.length === 0) {
        subjectMappings[subject] = { status: 'NO_MATCH', candidates: [] };
      } else {
        subjectMappings[subject] = {
          status: scored.length === 1 ? 'SINGLE_MATCH' : 'MULTI_MATCH_REVIEW_NEEDED',
          best: scored[0],
          candidates: scored.slice(0, 5) // show top 5
        };
      }
    }

    // Print subject summary
    console.log(`\n  Subject → Playlist matches:`);
    for (const [subject, match] of Object.entries(subjectMappings)) {
      if (match.status === 'NO_MATCH') {
        console.log(`    ${subject}: ❌ No match found`);
      } else if (match.status === 'SINGLE_MATCH') {
        console.log(`    ${subject}: ✅ ${match.best.title} [${match.best.id}] (${match.best.itemCount} videos)`);
      } else {
        console.log(`    ${subject}: ⚠️  Multiple candidates — review required`);
        match.candidates.forEach((c, i) => {
          console.log(`      ${i+1}. ${c.title} [${c.id}] (${c.itemCount} videos, score: ${c.score})`);
        });
      }
    }

    results.push({
      batchId: candidate.batchId,
      status: 'VERIFIED',
      resolvedHandle,
      channelId: channelInfo.channelId,
      channelTitle: channelInfo.channelTitle,
      totalPlaylists: allPlaylists.length,
      playlistMappings: subjectMappings
    });
  }

  // ─── Output full JSON report ──────────────────────────────────────────
  console.log('\n\n====================================================');
  console.log('FULL VERIFICATION REPORT (JSON):');
  console.log('====================================================');
  console.log(JSON.stringify(results, null, 2));

  // ─── Generate DB UPDATE statements for review ─────────────────────────
  console.log('\n\n====================================================');
  console.log('CANDIDATE SQL (review before executing):');
  console.log('====================================================');

  for (const result of results) {
    if (result.status !== 'VERIFIED') continue;

    // Update batches.youtube_channel_id
    console.log(`-- ${result.batchId}: channel verified as ${result.channelTitle}`);
    console.log(`UPDATE public.batches SET youtube_channel_id = '${result.channelId}' WHERE id = '${result.batchId}';`);

    for (const [subject, match] of Object.entries(result.playlistMappings)) {
      if (match.status === 'SINGLE_MATCH') {
        console.log(`UPDATE public.batch_subjects SET playlist_id = NULL, playlist_title = ${JSON.stringify(match.best.title)} WHERE batch_id = '${result.batchId}' AND subject = '${subject}';`);
        console.log(`-- ^^ playlist_id left NULL (${match.best.id}) — run import pipeline first, then SET playlist_id = '${match.best.id}'`);
      } else if (match.status === 'MULTI_MATCH_REVIEW_NEEDED') {
        console.log(`-- ${subject}: MANUAL REVIEW NEEDED — top candidate: ${match.best.id} (${match.best.title})`);
      } else {
        console.log(`-- ${subject}: NO MATCH — playlist_id stays NULL`);
      }
    }
    console.log('');
  }
}

main().catch(err => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
