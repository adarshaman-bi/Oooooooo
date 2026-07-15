require('dotenv').config();
console.log('YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY ? process.env.YOUTUBE_API_KEY.slice(0,12)+'...' : 'MISSING');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'OK' : 'MISSING');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'MISSING');
