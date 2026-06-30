import express from 'express';
import { getLiveTeacherLectures } from '../services/youtubeService';

const router = express.Router();

router.get('/api/teachers/:playlistId/lectures', async (req, res) => {
  try {
    const { playlistId } = req.params;
    if (!playlistId) {
      return res.status(400).json({ 
        success: false, 
        data: [], 
        error: "Missing playlistId parameter." 
      });
    }
    const lectures = await getLiveTeacherLectures(playlistId);
    
    // Pass deep stats (viewCount, duration) through to the frontend
    const enrichedLectures = lectures.map(v => ({
      id: v.id,
      title: v.title,
      thumbnail: v.thumbnail,
      publishedAt: v.publishedAt,
      description: v.description,
      viewCount: v.viewCount || 0,
      duration: v.duration || '',
    }));

    res.json({
      success: true,
      count: enrichedLectures.length,
      data: enrichedLectures
    });
  } catch (err) {
    console.error("Route level catcher caught failure:", err);
    res.status(500).json({ success: false, data: [], error: "Internal stability protection handler engaged." });
  }
});

export default router;
