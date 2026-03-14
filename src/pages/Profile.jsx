import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { Loader, UserPlus, UserCheck } from 'lucide-react';
import { createNotification } from '../utils/notifications';

export default function Profile({ user: currentUser }) {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const profileId = id || currentUser.id;

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    fetchFollowStatus();
  }, [profileId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      if (error) throw error;
      setProfile(data);
      setFollowersCount(data.followers_count || 0);
      setFollowingCount(data.following_count || 0);
    } catch (error) {
      toast.error('Failed to load profile');
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (full_name, university)
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowStatus = async () => {
    if (profileId === currentUser.id) return;
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', currentUser.id)
        .eq('following_id', profileId)
        .maybeSingle();
      if (error) throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profileId);
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
        toast.success('Unfollowed');
      } else {
        await supabase
          .from('follows')
          .insert([{ follower_id: currentUser.id, following_id: profileId }]);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        toast.success('Following');

        // 🔔 Send notification
        await createNotification(profileId, currentUser.id, 'follow');
      }
    } catch (error) {
      toast.error('Action failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin w-8 h-8 text-[#0033A0]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-24 h-24 bg-[#0033A0] rounded-full flex items-center justify-center text-white text-4xl font-bold">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800">{profile?.full_name || 'User'}</h1>
            <p className="text-gray-500">{profile?.university || 'Student'}</p>
            <div className="flex gap-6 mt-3 text-sm text-gray-600">
              <span><span className="font-bold">{followersCount}</span> followers</span>
              <span><span className="font-bold">{followingCount}</span> following</span>
            </div>
          </div>
          {profileId !== currentUser.id && (
            <button
              onClick={handleFollow}
              className={`px-6 py-2 rounded-full font-medium transition flex items-center gap-2 ${
                isFollowing
                  ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  : 'bg-[#0033A0] text-white hover:bg-[#002277]'
              }`}
            >
              {isFollowing ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Posts</h2>
      {posts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
          <p className="text-gray-500">No posts yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-gray-800 mb-2">{post.content}</p>
              {post.image_url && (
                <img src={post.image_url} alt="Post" className="rounded-lg max-h-48 w-full object-cover" />
              )}
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                <span>{post.likes?.length || 0} likes</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}