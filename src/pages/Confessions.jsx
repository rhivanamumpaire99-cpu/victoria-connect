import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { 
  MessageCircle, 
  Send,
  X,
  Loader,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Sparkles
} from 'lucide-react';

const categories = [
  { id: 'love', label: '❤️ Love', color: 'text-red-500' },
  { id: 'funny', label: '😂 Funny', color: 'text-yellow-500' },
  { id: 'weird', label: '👻 Weird', color: 'text-purple-500' },
  { id: 'shame', label: '😳 Shame', color: 'text-orange-500' },
  { id: 'academic', label: '📚 Academic', color: 'text-blue-500' },
  { id: 'campus', label: '🎉 Campus Life', color: 'text-green-500' }
];

export default function Confessions({ user, profile }) {
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('love');
  const [commentText, setCommentText] = useState({});
  const [showComments, setShowComments] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    fetchConfessions();
    fetchUserVotes();
  }, [filterCategory]);

  const fetchConfessions = async () => {
    try {
      let query = supabase
        .from('confessions')
        .select(`
          *,
          confession_comments (
            id,
            content,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      setConfessions(data || []);
    } catch (error) {
      toast.error('Failed to load confessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserVotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('confession_votes')
        .select('confession_id, vote_type')
        .eq('user_id', user.id);
      if (error) throw error;
      const votesMap = {};
      data.forEach(v => votesMap[v.confession_id] = v.vote_type);
      setUserVotes(votesMap);
    } catch (error) {
      console.error('Error fetching votes:', error);
    }
  };

  const handlePostConfession = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      const { error } = await supabase
        .from('confessions')
        .insert([{
          user_id: user.id,
          content: newContent,
          category: selectedCategory
        }]);

      if (error) throw error;

      toast.success('Confession posted anonymously!');
      setNewContent('');
      setSelectedCategory('love');
      setShowPostModal(false);
      fetchConfessions();
    } catch (error) {
      toast.error('Failed to post confession');
    }
  };

  const handleVote = async (confessionId, type) => {
    const currentVote = userVotes[confessionId];
    try {
      const newVotes = { ...userVotes };
      
      if (currentVote === type) {
        // Remove vote
        delete newVotes[confessionId];
        await supabase
          .from('confession_votes')
          .delete()
          .eq('confession_id', confessionId)
          .eq('user_id', user.id);
        
        if (type === 'up') {
          await supabase.rpc('decrement_upvotes', { row_id: confessionId });
        } else {
          await supabase.rpc('decrement_downvotes', { row_id: confessionId });
        }
      } else {
        // Add or change vote
        newVotes[confessionId] = type;
        await supabase
          .from('confession_votes')
          .upsert({
            confession_id: confessionId,
            user_id: user.id,
            vote_type: type
          }, { onConflict: 'confession_id, user_id' });

        if (currentVote) {
          // Changing vote
          if (currentVote === 'up' && type === 'down') {
            await supabase.rpc('decrement_upvotes', { row_id: confessionId });
            await supabase.rpc('increment_downvotes', { row_id: confessionId });
          } else if (currentVote === 'down' && type === 'up') {
            await supabase.rpc('decrement_downvotes', { row_id: confessionId });
            await supabase.rpc('increment_upvotes', { row_id: confessionId });
          }
        } else {
          // New vote
          if (type === 'up') {
            await supabase.rpc('increment_upvotes', { row_id: confessionId });
          } else {
            await supabase.rpc('increment_downvotes', { row_id: confessionId });
          }
        }
      }
      
      setUserVotes(newVotes);
      fetchConfessions();
    } catch (error) {
      console.error('Vote error:', error);
      toast.error('Error updating vote');
    }
  };

  const handleAddComment = async (confessionId) => {
    if (!commentText[confessionId]?.trim()) return;

    const text = commentText[confessionId];
    setCommentText({ ...commentText, [confessionId]: '' });

    try {
      await supabase
        .from('confession_comments')
        .insert([{
          confession_id: confessionId,
          user_id: user.id,
          content: text
        }]);

      fetchConfessions();
    } catch (error) {
      toast.error('Error adding comment');
    }
  };

  const handleReport = async (confessionId) => {
    toast.success('Reported to moderators');
  };

  const getVoteScore = (confession) => {
    const up = confession.upvotes || 0;
    const down = confession.downvotes || 0;
    return up - down;
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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-[#0033A0]" />
          Anonymous Confessions
        </h1>
        <button
          onClick={() => setShowPostModal(true)}
          className="bg-[#0033A0] text-white px-4 py-2 rounded-full hover:bg-[#002277] transition flex items-center gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          Write Confession
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6 p-2 bg-white rounded-xl shadow-sm border border-gray-200">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1 rounded-full text-sm ${
            filterCategory === 'all'
              ? 'bg-[#0033A0] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={`px-3 py-1 rounded-full text-sm ${
              filterCategory === cat.id
                ? 'bg-[#0033A0] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Confessions List */}
      {confessions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
          <Sparkles className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No confessions yet</p>
          <p className="text-gray-400">Be the first to confess anonymously!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {confessions.map(confession => {
            const category = categories.find(c => c.id === confession.category) || categories[0];
            const voteScore = getVoteScore(confession);
            const userVote = userVotes[confession.id];

            return (
              <div key={confession.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${category.color}`}>
                      {category.label}
                    </span>
                    <span className="text-xs text-gray-400">Anonymous</span>
                  </div>

                  <p className="text-gray-800 text-lg mb-3">{confession.content}</p>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleVote(confession.id, 'up')}
                        className={`flex items-center gap-1 ${
                          userVote === 'up' ? 'text-green-600' : 'hover:text-green-600'
                        }`}
                      >
                        <ChevronUp className="w-5 h-5" />
                        <span>{confession.upvotes || 0}</span>
                      </button>
                      <button
                        onClick={() => handleVote(confession.id, 'down')}
                        className={`flex items-center gap-1 ${
                          userVote === 'down' ? 'text-red-600' : 'hover:text-red-600'
                        }`}
                      >
                        <ChevronDown className="w-5 h-5" />
                        <span>{confession.downvotes || 0}</span>
                      </button>
                      <span className="text-xs text-gray-400">Score: {voteScore}</span>
                    </div>
                    <button
                      onClick={() => setShowComments({ ...showComments, [confession.id]: !showComments[confession.id] })}
                      className="flex items-center gap-1 hover:text-[#0033A0]"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{confession.confession_comments?.length || 0}</span>
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleReport(confession.id)}
                      className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Report
                    </button>
                  </div>
                </div>

                {/* Comments Section */}
                {showComments[confession.id] && (
                  <div className="bg-gray-50 p-4 border-t border-gray-200">
                    {confession.confession_comments?.map(comment => (
                      <div key={comment.id} className="mb-2 text-sm">
                        <span className="text-gray-500">Anonymous:</span>
                        <span className="ml-2 text-gray-800">{comment.content}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-3">
                      <input
                        type="text"
                        value={commentText[confession.id] || ''}
                        onChange={(e) => setCommentText({ ...commentText, [confession.id]: e.target.value })}
                        placeholder="Add an anonymous comment..."
                        className="flex-1 px-3 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-[#0033A0] text-sm"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleAddComment(confession.id);
                        }}
                      />
                      <button
                        onClick={() => handleAddComment(confession.id)}
                        disabled={!commentText[confession.id]?.trim()}
                        className="px-4 py-2 bg-[#0033A0] text-white rounded-full hover:bg-[#002277] disabled:opacity-50 text-sm"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Post Confession Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Write Anonymous Confession</h2>
              <button onClick={() => setShowPostModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handlePostConfession} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1 rounded-full text-sm border ${
                        selectedCategory === cat.id
                          ? 'bg-[#0033A0] text-white border-[#0033A0]'
                          : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Confession</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Share your secret anonymously..."
                  rows="5"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                  autoFocus
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Your identity will never be shown.</p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newContent.trim()}
                  className="px-6 py-2 bg-[#0033A0] text-white rounded-full hover:bg-[#002277] disabled:opacity-50"
                >
                  Post Anonymously
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}