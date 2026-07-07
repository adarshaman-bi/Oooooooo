import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import VideoCard from '../components/VideoCard';
import LiveLectureSection from '../components/LiveLectureSection';
import { Video, Teacher } from '../types';

interface TeacherPageProps {
  teacherId?: string;
}

const TeacherPage: React.FC<TeacherPageProps> = ({ teacherId: teacherIdProp }) => {
  const params = useParams<{ teacherId: string }>();
  const teacherId = teacherIdProp ?? params.teacherId;
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [liveVideos, setLiveVideos] = useState<Video[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!teacherId) return;

      try {
        // Fetch teacher info
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('id', teacherId)
          .single();

        if (teacherError || !teacherData) {
          console.error('Teacher not found:', teacherError);
          return;
        }

        setTeacher(teacherData);

        // Fetch live lectures for this teacher
        const { data: liveData, error: liveError } = await supabase
          .from('videos')
          .select('*')
          .eq('teacher_id', teacherId)
          .eq('content_type', 'live')
          .eq('is_active', true)
          .order('publish_date', { ascending: false })
          .limit(20);

        if (!liveError && liveData) {
          setLiveVideos(liveData);
        }

        // Fetch all lectures for this teacher
        const { data: allData, error: allError } = await supabase
          .from('videos')
          .select('*')
          .eq('teacher_id', teacherId)
          .eq('is_active', true)
          .order('publish_date', { ascending: false })
          .limit(50);

        if (!allError && allData) {
          setAllVideos(allData);
        }
      } catch (err) {
        console.error('Error fetching teacher data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [teacherId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading teacher profile...</div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Teacher not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-blue-300 hover:text-white mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">{teacher.name}</h1>
          {teacher.specialization && (
            <p className="text-blue-200 text-lg">{teacher.specialization}</p>
          )}
        </div>
      </div>

      {/* Live Lectures Section */}
      {liveVideos.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LiveLectureSection 
            videos={liveVideos} 
            title={`${teacher.name}'s Live Lectures`}
          />
        </div>
      )}

      {/* All Lectures Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-white mb-6">All Lectures</h2>
        {allVideos.length === 0 ? (
          <p className="text-gray-400">No lectures available yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherPage;
