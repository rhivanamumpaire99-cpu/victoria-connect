import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { 
  Calendar, 
  MapPin, 
  Users, 
  PlusCircle, 
  X, 
  Loader,
  Image as ImageIcon
} from 'lucide-react';
import { createNotification } from '../utils/notifications';

export default function Events({ user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [userRSVPs, setUserRSVPs] = useState({});

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_attendees (
            user_id
          )
        `)
        .order('event_date', { ascending: true });
      if (error) throw error;

      setEvents(data || []);

      const rsvp = {};
      data.forEach(event => {
        const attending = event.event_attendees?.some(a => a.user_id === user.id);
        if (attending) rsvp[event.id] = true;
      });
      setUserRSVPs(rsvp);
    } catch (error) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large (max 5MB)');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from('event-images')
      .upload(fileName, imageFile);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from('event-images')
      .getPublicUrl(fileName);
    return publicUrl;
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!title || !location || !eventDate || !eventTime) {
      toast.error('Please fill all required fields');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const dateTime = new Date(`${eventDate}T${eventTime}`).toISOString();

      const { error } = await supabase
        .from('events')
        .insert([{
          user_id: user.id,
          title,
          description,
          location,
          event_date: dateTime,
          image_url: imageUrl
        }]);

      if (error) throw error;

      toast.success('Event created!');
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setLocation('');
      setEventDate('');
      setEventTime('');
      setImageFile(null);
      setImagePreview(null);
      fetchEvents();
    } catch (error) {
      toast.error('Failed to create event');
    } finally {
      setUploading(false);
    }
  };

  const handleRSVP = async (eventId) => {
    const isAttending = userRSVPs[eventId];
    try {
      if (isAttending) {
        await supabase
          .from('event_attendees')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);
        setUserRSVPs(prev => {
          const newState = { ...prev };
          delete newState[eventId];
          return newState;
        });
      } else {
        // Get event owner before inserting RSVP
        const { data: event } = await supabase
          .from('events')
          .select('user_id')
          .eq('id', eventId)
          .single();

        await supabase
          .from('event_attendees')
          .insert([{ event_id: eventId, user_id: user.id }]);
        setUserRSVPs(prev => ({ ...prev, [eventId]: true }));

        // 🔔 Send notification
        await createNotification(event.user_id, user.id, 'event_rsvp', { eventId });
      }
      fetchEvents();
    } catch (error) {
      toast.error('RSVP failed');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin w-8 h-8 text-[#0033A0]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-8 h-8 text-[#0033A0]" />
          Campus Events
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#0033A0] text-white px-4 py-2 rounded-full hover:bg-[#002277] transition flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          Create Event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
          <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No events yet</p>
          <p className="text-gray-400">Be the first to create an event!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(event => {
            const attendeeCount = event.event_attendees?.length || 0;
            const isAttending = userRSVPs[event.id];

            return (
              <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
                {event.image_url && (
                  <img src={event.image_url} alt={event.title} className="w-full h-48 object-cover" />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-xl text-gray-800 mb-2">{event.title}</h3>
                  {event.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{event.description}</p>
                  )}
                  <div className="space-y-2 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{attendeeCount} attending</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRSVP(event.id)}
                    className={`w-full py-2 rounded-lg transition font-medium ${
                      isAttending
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-[#0033A0] text-white hover:bg-[#002277]'
                    }`}
                  >
                    {isAttending ? '✓ Attending' : 'RSVP'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">Create New Event</h2>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location *</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date *</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time *</label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Event Image (optional)</label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                  {imageFile && (
                    <span className="text-sm text-gray-600">{imageFile.name}</span>
                  )}
                </div>
                {imagePreview && (
                  <div className="relative mt-2">
                    <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
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
                  {uploading ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}