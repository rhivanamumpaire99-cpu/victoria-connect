import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Send,
  Image as ImageIcon,
  X,
  Camera
} from 'lucide-react';
import { createNotification } from '../utils/notifications';

export default function Feed({ user, profile }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [showComments, setShowComments] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [feedType, setFeedType] = useState('all');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles!inner (id, full_name, university, is_official_viewer),
          comments (id, content, created_at, profiles (full_name)),
          likes (user_id)
        `)
        .order('created_at', { ascending: false });

      if (feedType === 'following') {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        const followingIds = followingData?.map(f => f.following_id) || [];
        if (followingIds.length === 0) {
          setPosts([]);
          setLoading(false);
          return;
        }
        query = query.in('user_id', followingIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [feedType, user.id]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large (max 5MB)');
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async () => {
    if (!selectedImage) return null;
    setUploading(true);
    try {
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from('post-images')
        .upload(fileName, selectedImage);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);
      return publicUrl;
    } catch (error) {
      toast.error('Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && !selectedImage) return;

    let imageUrl = null;
    if (selectedImage) {
      imageUrl = await uploadImage();
      if (!imageUrl) return;
    }

    const tempPost = {
      id: Date.now(),
      content: newPost,
      image_url: imageUrl,
      user_id: user.id,
      created_at: new Date().toISOString(),
      profiles: { 
        id: user.id,
        full_name: profile?.full_name || user.email?.split('@')[0],
        university: profile?.university || 'Student'
      },
      likes: [],
      comments: []
    };
    
    setPosts([tempPost, ...posts]);
    setNewPost('');
    setSelectedImage(null);
    setImagePreview(null);
    setShowCreatePost(false);

    try {
      const { error } = await supabase
        .from('posts')
        .insert([{
          user_id: user.id,
          content: newPost,
          image_url: imageUrl
        }]);
      if (error) throw error;
    } catch (error) {
      toast.error('Error creating post');
      fetchPosts(); // revert on error
    }
  };

  const handleLike = async (postId) => {
    try {
      const { data: existingLike } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingLike) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        setPosts(posts.map(p => 
          p.id === postId 
            ? { ...p, likes: p.likes.filter(l => l.user_id !== user.id) } 
            : p
        ));
      } else {
        // Get post owner before inserting like
        const { data: post } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', postId)
          .single();

        await supabase
          .from('likes')
          .insert([{ post_id: postId, user_id: user.id }]);
        setPosts(posts.map(p => 
          p.id === postId 
            ? { ...p, likes: [...(p.likes || []), { user_id: user.id }] } 
            : p
        ));

        // 🔔 Send notification
        await createNotification(post.user_id, user.id, 'like', { postId });
      }
    } catch (error) {
      toast.error('Error updating like');
    }
  };

  const handleAddComment = async (postId) => {
    if (!commentText[postId]?.trim()) return;

    const text = commentText[postId];
    setCommentText({ ...commentText, [postId]: '' });

    try {
      // Get post owner before inserting comment
      const { data: post } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      await supabase
        .from('comments')
        .insert([{
          post_id: postId,
          user_id: user.id,
          content: text
        }]);

      // 🔔 Send notification
      await createNotification(post.user_id, user.id, 'comment', { postId });

      fetchPosts(); // refresh to show comment
    } catch (error) {
      toast.error('Error adding comment');
    }
  };

  const handleShare = (postId) => {
    const postUrl = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(postUrl);
    toast.success('Post link copied!');
  };

  const isLiked = (post) => {
    return post.likes?.some(like => like.user_id === user.id);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0033A0]"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-4 px-4 sm:px-0">
      <div className="flex gap-2 mb-4 border-b border-gray-200 pb-2">
        <button
          onClick={() => setFeedType('all')}
          className={`px-4 py-2 rounded-t-lg transition ${
            feedType === 'all'
              ? 'bg-[#0033A0] text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          For You
        </button>
        <button
          onClick={() => setFeedType('following')}
          className={`px-4 py-2 rounded-t-lg transition ${
            feedType === 'following'
              ? 'bg-[#0033A0] text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Following
        </button>
      </div>

      {!showCreatePost ? (
        <div 
          onClick={() => setShowCreatePost(true)}
          className="bg-white rounded-xl shadow-sm p-4 mb-4 hover:bg-gray-50 cursor-pointer border border-gray-200 transition"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#0033A0] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-gray-500 text-left">
              What's on your mind?
            </div>
            <Camera className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-gray-200">
          <form onSubmit={handleCreatePost}>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-[#0033A0] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </div>
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What's on your mind?"
                className="flex-1 p-2 border-none focus:outline-none resize-none text-gray-700 text-lg"
                rows="3"
                autoFocus
              />
            </div>

            {imagePreview && (
              <div className="relative mt-3">
                <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
              <div className="flex space-x-4 text-gray-500">
                <label className="cursor-pointer hover:text-[#0033A0] transition">
                  <ImageIcon className="w-6 h-6" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePost(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={(!newPost.trim() && !selectedImage) || uploading}
                  className="px-6 py-2 bg-[#0033A0] text-white rounded-full hover:bg-[#002277] disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Post'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
          <p className="text-gray-500">No posts to show</p>
          {feedType === 'following' && (
            <p className="text-sm text-gray-400 mt-2">Follow some users to see their posts here</p>
          )}
        </div>
      ) : (
        posts.map(post => (
          <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link to={`/profile/${post.profiles?.id}`}>
                  <div className="w-10 h-10 bg-[#0033A0] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 hover:opacity-80 transition">
                    {post.profiles?.full_name?.charAt(0) || 'U'}
                  </div>
                </Link>
                <div>
                  <Link to={`/profile/${post.profiles?.id}`} className="font-semibold text-gray-800 hover:underline">
                    {post.profiles?.full_name || 'Unknown'}
                  </Link>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{post.profiles?.university || 'Student'}</span>
                    {post.profiles?.is_official_viewer && (
                      <span className="bg-[#FFD100] text-[#0033A0] px-2 py-0.5 rounded-full text-xs font-bold">
                        VU Official
                      </span>
                    )}
                    <span>• {new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <MoreHorizontal className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700" />
            </div>

            <div className="px-4 pb-3">
              <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
            </div>

            {post.image_url && (
              <div className="px-4 pb-3">
                <img src={post.image_url} alt="Post" className="rounded-lg max-h-96 w-full object-cover" />
              </div>
            )}

            <div className="px-4 py-2 border-t border-b border-gray-100 flex justify-between text-sm text-gray-500">
              <span>{post.likes?.length || 0} likes</span>
              <span>{post.comments?.length || 0} comments</span>
            </div>

            <div className="flex p-1">
              <button
                onClick={() => handleLike(post.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded hover:bg-gray-100 transition ${
                  isLiked(post) ? 'text-[#0033A0]' : 'text-gray-600'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked(post) ? 'fill-current text-[#0033A0]' : ''}`} />
                <span className="text-sm font-medium">Like</span>
              </button>
              <button
                onClick={() => setShowComments({ ...showComments, [post.id]: !showComments[post.id] })}
                className="flex-1 flex items-center justify-center space-x-2 py-2 text-gray-600 rounded hover:bg-gray-100 transition"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Comment</span>
              </button>
              <button
                onClick={() => handleShare(post.id)}
                className="flex-1 flex items-center justify-center space-x-2 py-2 text-gray-600 rounded hover:bg-gray-100 transition"
              >
                <Share2 className="w-5 h-5" />
                <span className="text-sm font-medium">Share</span>
              </button>
            </div>

            {showComments[post.id] && (
              <div className="bg-gray-50 p-4 border-t border-gray-200">
                {post.comments?.map(comment => (
                  <div key={comment.id} className="flex items-start space-x-2 mb-3">
                    <div className="w-6 h-6 bg-gray-400 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs">
                      {comment.profiles?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 bg-white p-2 rounded-lg shadow-sm">
                      <span className="font-semibold text-sm text-gray-800">{comment.profiles?.full_name}</span>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                ))}

                <div className="flex items-center space-x-2 mt-3">
                  <div className="w-8 h-8 bg-[#0033A0] rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
                    {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 flex items-center bg-white rounded-full border border-gray-300 focus-within:border-[#0033A0] transition">
                    <input
                      type="text"
                      value={commentText[post.id] || ''}
                      onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                      placeholder="Write a comment..."
                      className="flex-1 px-4 py-2 rounded-l-full focus:outline-none text-gray-700"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleAddComment(post.id);
                      }}
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      disabled={!commentText[post.id]?.trim()}
                      className="px-4 text-[#0033A0] hover:text-[#002277] disabled:opacity-50 transition"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}