import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { useParams, Link } from 'react-router-dom';
import { Loader, UserPlus, UserCheck, MapPin, Link as LinkIcon, Mail, Calendar, Award, Edit } from 'lucide-react';

export default function Profile({ user: currentUser }) {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isOwner, setIsOwner] = useState(false);

  const profileId = id || currentUser.id;

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    fetchFollowStatus();
    setIsOwner(profileId === currentUser.id);
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
          profiles (full_name, avatar_url),
          likes (user_id),
          comments (id)
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
      {/* Cover Photo */}
      {profile?.cover_image ? (
        <img src={profile.cover_image} alt="Cover" className="w-full h-48 object-cover rounded-t-xl" />
      ) : (
        <div className="w-full h-48 bg-gradient-to-r from-[#0033A0] to-[#FFD100] rounded-t-xl" />
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 p-6 mb-6 relative">
        {/* Avatar */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 -mt-16 mb-4">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" />
          ) : (
            <div className="w-24 h-24 bg-[#0033A0] rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white text-4xl font-bold">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
          )}
          <div className="flex-1 pt-12 md:pt-0">
            <h1 className="text-3xl font-bold text-gray-800">{profile?.full_name || 'User'}</h1>
            <p className="text-gray-500">{profile?.university || 'Student'}</p>
            {profile?.course && (
              <p className="text-sm text-gray-600 mt-1">
                {profile.course} {profile.year_of_study ? `· Year ${profile.year_of_study}` : ''}
                {profile.faculty ? ` · ${profile.faculty}` : ''}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isOwner ? (
              <Link
                to="/profile/edit"
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-full hover:bg-gray-300 transition flex items-center gap-2"
              >
                <Edit className="w-4 h-4" /> Edit Profile
              </Link>
            ) : (
              <button
                onClick={handleFollow}
                className={`px-6 py-2 rounded-full font-medium transition flex items-center gap-2 ${
                  isFollowing
                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    : 'bg-[#0033A0] text-white hover:bg-[#002277]'
                }`}
              >
                {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="space-y-4">
          {/* Bio */}
          {profile?.bio && (
            <p className="text-gray-700">{profile.bio}</p>
          )}

          {/* Location, Website, Email */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            {profile?.location && (
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {profile.location}</span>
            )}
            {profile?.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#0033A0] hover:underline">
                <LinkIcon className="w-4 h-4" /> Website
              </a>
            )}
            {profile?.contact_email && (
              <a href={`mailto:${profile.contact_email}`} className="flex items-center gap-1 text-[#0033A0] hover:underline">
                <Mail className="w-4 h-4" /> Contact
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <span><span className="font-bold">{followersCount}</span> followers</span>
            <span><span className="font-bold">{followingCount}</span> following</span>
            <span><span className="font-bold">{posts.length}</span> posts</span>
          </div>

          {/* Skills */}
          {profile?.skills?.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-1"><Award className="w-4 h-4" /> Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map(skill => (
                  <span key={skill} className="bg-gray-100 px-3 py-1 rounded-full text-sm">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {profile?.education?.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-1"><Calendar className="w-4 h-4" /> Education</h3>
              <div className="space-y-2">
                {profile.education.map((edu, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-medium">{edu.school}</span> – {edu.degree} in {edu.field}
                    <span className="text-gray-500 ml-2">
                      {edu.startYear} – {edu.current ? 'Present' : edu.endYear}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Posts Grid */}
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