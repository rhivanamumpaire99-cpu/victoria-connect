import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { PlusCircle, X, Loader, BarChart, Image as ImageIcon, Video } from 'lucide-react';

export default function Polls({ user }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' or 'video'
  const [uploading, setUploading] = useState(false);
  const [userVotes, setUserVotes] = useState({});

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPolls(data || []);
      
      const votes = {};
      data.forEach(poll => {
        const vote = poll.votes.find(v => v.userId === user.id);
        if (vote) votes[poll.id] = vote.optionIndex;
      });
      setUserVotes(votes);
    } catch (error) {
      toast.error('Failed to load polls');
    } finally {
      setLoading(false);
    }
  };

  const handleMediaSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }
    const type = file.type.startsWith('image/') ? 'image' : 'video';
    setMediaFile(file);
    setMediaType(type);
    setMediaPreview(URL.createObjectURL(file));
  };

  const uploadMedia = async () => {
    if (!mediaFile) return null;
    const fileExt = mediaFile.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from('polls-media')
      .upload(fileName, mediaFile);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from('polls-media')
      .getPublicUrl(fileName);
    return publicUrl;
  };

  const handleAddOption = () => setOptions([...options, '']);
  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };
  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    if (!question.trim() || options.some(opt => !opt.trim())) {
      toast.error('Please fill all fields');
      return;
    }

    setUploading(true);
    try {
      let mediaUrl = null;
      if (mediaFile) {
        mediaUrl = await uploadMedia();
      }

      const { error } = await supabase
        .from('polls')
        .insert([{
          user_id: user.id,
          question,
          options,
          votes: [],
          media_url: mediaUrl,
          media_type: mediaType
        }]);
      if (error) throw error;
      toast.success('Poll created!');
      setShowCreateModal(false);
      setQuestion('');
      setOptions(['', '']);
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType(null);
      fetchPolls();
    } catch (error) {
      toast.error('Failed to create poll');
    } finally {
      setUploading(false);
    }
  };

  const handleVote = async (pollId, optionIndex) => {
    if (userVotes[pollId] !== undefined) {
      toast.error('You already voted');
      return;
    }

    try {
      const poll = polls.find(p => p.id === pollId);
      const newVotes = [...poll.votes, { optionIndex, userId: user.id }];
      
      const { error } = await supabase
        .from('polls')
        .update({ votes: newVotes })
        .eq('id', pollId);
      if (error) throw error;

      setUserVotes({ ...userVotes, [pollId]: optionIndex });
      fetchPolls();
    } catch (error) {
      toast.error('Vote failed');
    }
  };

  const getResults = (poll) => {
    const counts = poll.options.map((_, idx) => 
      poll.votes.filter(v => v.optionIndex === idx).length
    );
    const total = counts.reduce((a, b) => a + b, 0);
    return { counts, total };
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart className="w-8 h-8 text-[#0033A0]" />
          Campus Polls
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#0033A0] text-white px-4 py-2 rounded-full hover:bg-[#002277] transition flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          Create Poll
        </button>
      </div>

      {polls.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
          <BarChart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No polls yet</p>
          <p className="text-gray-400">Create the first campus poll!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map(poll => {
            const { counts, total } = getResults(poll);
            const hasVoted = userVotes[poll.id] !== undefined;

            return (
              <div key={poll.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                {poll.media_url && (
                  <div className="mb-3">
                    {poll.media_type === 'image' ? (
                      <img src={poll.media_url} alt="Poll" className="max-h-64 rounded-lg object-cover" />
                    ) : (
                      <video src={poll.media_url} controls className="max-h-64 rounded-lg w-full" />
                    )}
                  </div>
                )}
                <p className="text-lg font-semibold text-gray-800 mb-3">{poll.question}</p>
                
                {poll.options.map((option, idx) => {
                  const percentage = total ? Math.round((counts[idx] / total) * 100) : 0;
                  const isSelected = userVotes[poll.id] === idx;

                  return (
                    <div key={idx} className="mb-2">
                      <button
                        onClick={() => handleVote(poll.id, idx)}
                        disabled={hasVoted}
                        className={`w-full text-left p-2 rounded-lg border transition ${
                          hasVoted
                            ? 'cursor-default'
                            : 'hover:bg-gray-50 cursor-pointer'
                        } ${isSelected ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={isSelected ? 'font-medium' : ''}>{option}</span>
                          {hasVoted && (
                            <span className="text-sm text-gray-600">
                              {counts[idx]} vote{counts[idx] !== 1 ? 's' : ''} ({percentage}%)
                            </span>
                          )}
                        </div>
                        {hasVoted && (
                          <div className="w-full bg-gray-200 h-2 rounded-full mt-1">
                            <div
                              className="bg-[#0033A0] h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}

                <p className="text-xs text-gray-400 mt-2">
                  {total} vote{total !== 1 ? 's' : ''} • Posted anonymously
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Poll Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">Create Anonymous Poll</h2>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreatePoll} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Question</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
                  required
                />
              </div>

              {/* Media upload */}
              <div>
                <label className="block text-sm font-medium mb-1">Add Image/Video (optional)</label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Choose File
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleMediaSelect}
                      className="hidden"
                    />
                  </label>
                  {mediaFile && (
                    <span className="text-sm text-gray-600">{mediaFile.name}</span>
                  )}
                </div>
                {mediaPreview && (
                  <div className="relative mt-2">
                    {mediaType === 'image' ? (
                      <img src={mediaPreview} alt="Preview" className="max-h-32 rounded-lg" />
                    ) : (
                      <video src={mediaPreview} controls className="max-h-32 rounded-lg" />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMediaFile(null);
                        setMediaPreview(null);
                        setMediaType(null);
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Options (at least 2)</label>
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
                      placeholder={`Option ${idx + 1}`}
                      required
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-[#0033A0] hover:text-[#002277] text-sm flex items-center gap-1 mt-2"
                >
                  <PlusCircle className="w-4 h-4" /> Add another option
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2 bg-[#0033A0] text-white rounded-full hover:bg-[#002277] disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? <Loader className="animate-spin w-4 h-4" /> : null}
                  {uploading ? 'Creating...' : 'Create Poll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}