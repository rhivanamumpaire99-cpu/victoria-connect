import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { Video, Plus, Copy, X } from 'lucide-react';

export default function VideoMeetings({ user }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [topic, setTopic] = useState('');
  const [creating, setCreating] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);

  // New meeting options state
  const [startVideoOff, setStartVideoOff] = useState(false);
  const [startAudioOff, setStartAudioOff] = useState(false);
  const [enableKnocking, setEnableKnocking] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(100);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('video_meetings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    setCreating(true);
    try {
      const roomName = `room-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Replace with your actual Netlify site URL
      const response = await fetch('https://coruscating-chimera-4a3c5b.netlify.app/.netlify/functions/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          privacy: 'public',
          properties: {
            start_video_off: startVideoOff,
            start_audio_off: startAudioOff,
            enable_knocking: enableKnocking,
            max_participants: maxParticipants
          }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create room');

      const roomUrl = data.url;

      // Save to database
      const { error } = await supabase
        .from('video_meetings')
        .insert([{
          user_id: user.id,
          room_name: roomName,
          daily_url: roomUrl,
          topic: topic || null
        }]);
      if (error) throw error;

      toast.success('Meeting created!');
      setTopic('');
      setStartVideoOff(false);
      setStartAudioOff(false);
      setEnableKnocking(false);
      setMaxParticipants(100);
      setShowCreateModal(false);
      fetchMeetings();
      setCurrentRoom({ url: roomUrl, name: roomName });
    } catch (error) {
      toast.error('Failed to create meeting');
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = (room) => {
    setCurrentRoom(room);
  };

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  };

  const closeRoom = () => {
    setCurrentRoom(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0033A0]"></div>
      </div>
    );
  }

  if (currentRoom) {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 bg-[#0033A0] text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">Meeting: {currentRoom.name}</h2>
          <button onClick={closeRoom} className="text-white hover:text-[#FFD100]">
            <X className="w-6 h-6" />
          </button>
        </div>
        <iframe
          src={currentRoom.url}
          allow="camera; microphone; fullscreen; speaker; display-capture"
          className="w-full h-[70vh]"
          title="Daily Video Call"
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Video className="w-8 h-8 text-[#0033A0]" />
          Video Meetings
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#0033A0] text-white px-4 py-2 rounded-full hover:bg-[#002277] transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Meeting
        </button>
      </div>

      {meetings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
          <Video className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No meetings yet</p>
          <p className="text-gray-400">Start a new video meeting</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map(meeting => (
            <div key={meeting.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-lg mb-2">{meeting.topic || 'Untitled Meeting'}</h3>
              <p className="text-xs text-gray-500 mb-3">{new Date(meeting.created_at).toLocaleString()}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => joinRoom(meeting)}
                  className="flex-1 bg-[#0033A0] text-white py-2 rounded-lg hover:bg-[#002277] transition flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" /> Join
                </button>
                <button
                  onClick={() => copyLink(meeting.daily_url)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  title="Copy link"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Start a New Meeting</h2>
            <input
              type="text"
              placeholder="Meeting topic (optional)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-2 border rounded-lg mb-4"
            />

            {/* Options */}
            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={startVideoOff}
                  onChange={(e) => setStartVideoOff(e.target.checked)}
                />
                Start with video off
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={startAudioOff}
                  onChange={(e) => setStartAudioOff(e.target.checked)}
                />
                Start with audio off
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enableKnocking}
                  onChange={(e) => setEnableKnocking(e.target.checked)}
                />
                Enable waiting room (host must approve)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm">Max participants:</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 100)}
                  className="border rounded px-2 py-1 w-20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={createRoom}
                disabled={creating}
                className="px-6 py-2 bg-[#0033A0] text-white rounded-full hover:bg-[#002277] disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}