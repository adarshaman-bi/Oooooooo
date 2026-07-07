import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import TeacherProfileDetail from '../components/TeacherProfileDetail';
import DetailsModal from '../components/DetailsModal';
import VideoPlayerContainer from '../components/VideoPlayerContainer';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { toggleFollow } from '../services/dbService';

interface TeacherPageProps {
  teacherId?: string;
}

const TeacherPage: React.FC<TeacherPageProps> = ({ teacherId: teacherIdProp }) => {
  const params = useParams<{ teacherId: string }>();
  const teacherId = teacherIdProp ?? params.teacherId;
  const { user, isGuest } = useAuth();
  const { activeLecture, setActiveLecture } = usePlayer();

  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [detailModal, setDetailModal] = useState<{ id: string; type: 'teacher' | 'institute' | 'playlist' | 'batch' } | null>(null);

  // Load followed educator IDs on mount/user change
  useEffect(() => {
    if (user && user.uid !== 'guest') {
      import('../services/dbService').then(async (dbService) => {
        try {
          const ids = await dbService.fetchFollowingList();
          setFollowedIds(ids);
        } catch (err) {
          console.error('Error fetching following list:', err);
        }
      });
    }
  }, [user]);

  // Handle follow/unfollow toggle synchronously with DB state
  const handleFollowToggle = async (t: any) => {
    if (isGuest || !user) {
      alert('Sign in to follow educators and track schedules!');
      return;
    }
    const isFollowing = followedIds.includes(t.id);
    try {
      if (isFollowing) {
        setFollowedIds(prev => prev.filter(id => id !== t.id));
        await toggleFollow(t.id, t.name, t.avatar, isFollowing);
      } else {
        setFollowedIds(prev => [...prev, t.id]);
        await toggleFollow(t.id, t.name, t.avatar, isFollowing);
      }
    } catch (err) {
      console.error('Follow toggle failed:', err);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  if (!teacherId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">
        <p className="text-sm text-zinc-400">Invalid educator path identifier.</p>
      </div>
    );
  }

  // Handle playing video lectures in a pristine fullscreen focus container
  if (activeLecture) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col p-4 md:p-8">
        <div className="max-w-5xl mx-auto w-full space-y-4">
          <button 
            onClick={() => setActiveLecture(null)}
            className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-xs font-mono tracking-wider uppercase bg-transparent border-none cursor-pointer"
          >
            ← Back to Teacher Profile
          </button>
          <VideoPlayerContainer 
            lecture={activeLecture} 
            onClose={() => setActiveLecture(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <TeacherProfileDetail
        teacherId={teacherId}
        onBack={handleBack}
        followedIds={followedIds}
        handleFollowToggle={handleFollowToggle}
        setDetailModal={setDetailModal}
      />

      {/* Render the details review/DM modal if requested */}
      {detailModal && (
        <DetailsModal
          isOpen={!!detailModal}
          onClose={() => setDetailModal(null)}
          targetType={detailModal.type}
          targetId={detailModal.id}
          onSelectLecture={(lec) => {
            setActiveLecture(lec);
          }}
        />
      )}
    </div>
  );
};

export default TeacherPage;
