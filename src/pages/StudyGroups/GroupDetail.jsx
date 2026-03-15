import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import {
  Users, MessageCircle, FileText, Image, Send,
  LogOut, Plus, X, Loader
} from 'lucide-react';

export default function GroupDetail({ user }) {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'posts', 'files', 'members'
  const [newMessage, setNewMessage] = useState('');
  const [newPost, setNewPost] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    fetchGroupData();
    checkMembership();

    // Realtime subscriptions
    const messagesSub = supabase
      .channel(`group-messages-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${id}` },
        payload => setMessages(prev => [...prev, payload.new]))
      .subscribe();

    const postsSub = supabase
      .channel(`group-posts-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_posts', filter: `group_id=eq.${id}` },
        payload => setPosts(prev => [payload.new, ...prev]))
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSub);
      supabase.removeChannel(postsSub);
    };
  }, [id]);

  const fetchGroupData = async () => {
    try {
      const { data: groupData } = await supabase
        .from('study_groups')
        .select('*')
        .eq('id', id)
        .single();
      setGroup(groupData);

      const { data: membersData } = await supabase
        .from('group_members')
        .select('*, profiles(full_name, avatar_url)')
        .eq('group_id', id);
      setMembers(membersData || []);

      const { data: postsData } = await supabase
        .from('group_posts')
        .select('*, profiles(full_name)')
        .eq('group_id', id)
        .order('created_at', { ascending: false });
      setPosts(postsData || []);

      const { data: messagesData } = await supabase
        .from('group_messages')
        .select('*, profiles(full_name)')
        .eq('group_id', id)
        .order('created_at', { ascending: true });
      setMessages(messagesData || []);

      const { data: filesData } = await supabase
        .from('group_files')
        .select('*')
        .eq('group_id', id)
        .order('created_at', { ascending: false });
      setFiles(filesData || []);
    } catch (error) {
      toast.error('Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  const checkMembership = async () => {
    const { data } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    setIsMember(!!data);
    setUserRole(data?.role);
  };

  const joinGroup = async () => {
    try {
      await supabase
        .from('group_members')
        .insert([{ group_id: id, user_id: user.id, role: 'member' }]);
      setIsMember(true);
      setUserRole('member');
      toast.success('Joined group');
      fetchGroupData(); // refresh members
    } catch (error) {
      toast.error('Failed to join');
    }
  };

  const leaveGroup = async () => {
    try {
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', id)
        .eq('user_id', user.id);
      setIsMember(false);
      setUserRole(null);
      toast.success('Left group');
      fetchGroupData();
    } catch (error) {
      toast.error('Failed to leave');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = newMessage;
    setNewMessage('');
    try {
      await supabase
        .from('group_messages')
        .insert([{ group_id: id, user_id: user.id, message: msg }]);
    } catch (error) {
      toast.error('Failed to send message');
      setNewMessage(msg);
    }
  };

  const createPost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setUploading(true);
    try {
      let imageUrl = null;
      if (postImage) {
        const fileExt = postImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from('group-posts')
          .upload(fileName, postImage);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage
          .from('group-posts')
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      await supabase
        .from('group_posts')
        .insert([{ group_id: id, user_id: user.id, content: newPost, image_url: imageUrl }]);
      setNewPost('');
      setPostImage(null);
      toast.success('Posted!');
    } catch (error) {
      toast.error('Failed to post');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from('group-files')
        .upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from('group-files')
        .getPublicUrl(fileName);

      await supabase
        .from('group_files')
        .insert([{
          group_id: id,
          user_id: user.id,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size
        }]);
      toast.success('File uploaded');
      fetchGroupData(); // refresh files
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader className="animate-spin w-8 h-8 text-[#0033A0]" /></div>;
  }

  if (!group) {
    return <div className="text-center py-12">Group not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Group Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{group.name}</h1>
            <p className="text-gray-500">{group.course}</p>
            {group.description && <p className="mt-2 text-gray-600">{group.description}</p>}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>{members.length} members</span>
              <span>Created by {members.find(m => m.role === 'creator')?.profiles?.full_name}</span>
            </div>
          </div>
          {isMember ? (
            <button onClick={leaveGroup} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
              <LogOut className="w-4 h-4" /> Leave Group
            </button>
          ) : (
            <button onClick={joinGroup} className="bg-[#0033A0] text-white px-6 py-2 rounded-full hover:bg-[#002277]">
              Join Group
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 ${activeTab === 'chat' ? 'border-b-2 border-[#0033A0] text-[#0033A0]' : 'text-gray-500'}`}
        >
          <MessageCircle className="w-5 h-5 inline mr-1" /> Chat
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 ${activeTab === 'posts' ? 'border-b-2 border-[#0033A0] text-[#0033A0]' : 'text-gray-500'}`}
        >
          <Image className="w-5 h-5 inline mr-1" /> Posts
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-2 ${activeTab === 'files' ? 'border-b-2 border-[#0033A0] text-[#0033A0]' : 'text-gray-500'}`}
        >
          <FileText className="w-5 h-5 inline mr-1" /> Files
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 ${activeTab === 'members' ? 'border-b-2 border-[#0033A0] text-[#0033A0]' : 'text-gray-500'}`}
        >
          <Users className="w-5 h-5 inline mr-1" /> Members
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[60vh] flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.user_id === user.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs rounded-lg px-4 py-2 ${msg.user_id === user.id ? 'bg-[#0033A0] text-white' : 'bg-gray-100'}`}>
                  {msg.user_id !== user.id && (
                    <p className="text-xs font-semibold text-gray-600 mb-1">{msg.profiles?.full_name}</p>
                  )}
                  <p>{msg.message}</p>
                </div>
              </div>
            ))}
          </div>
          {isMember && (
            <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
              />
              <button type="submit" disabled={!newMessage.trim()} className="p-2 bg-[#0033A0] text-white rounded-full hover:bg-[#002277] disabled:opacity-50">
                <Send className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      )}

      {activeTab === 'posts' && (
        <div className="space-y-4">
          {isMember && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <form onSubmit={createPost}>
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share something with the group..."
                  rows="3"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                />
                <div className="flex justify-between mt-3">
                  <label className="cursor-pointer text-gray-500 hover:text-[#0033A0]">
                    <Image className="w-5 h-5 inline mr-1" /> Add Image
                    <input type="file" accept="image/*" onChange={(e) => setPostImage(e.target.files[0])} className="hidden" />
                  </label>
                  <button type="submit" disabled={!newPost.trim() || uploading} className="bg-[#0033A0] text-white px-4 py-2 rounded-full hover:bg-[#002277] disabled:opacity-50">
                    {uploading ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>
            </div>
          )}
          {posts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
              <p className="text-gray-500">No posts yet.</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <p className="font-semibold text-gray-800">{post.profiles?.full_name}</p>
                <p className="text-xs text-gray-500 mb-2">{new Date(post.created_at).toLocaleString()}</p>
                <p>{post.content}</p>
                {post.image_url && <img src={post.image_url} alt="Post" className="mt-3 rounded-lg max-h-64 object-cover" />}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'files' && (
        <div>
          {isMember && (
            <div className="mb-4">
              <label className="bg-[#0033A0] text-white px-4 py-2 rounded-full hover:bg-[#002277] transition cursor-pointer inline-flex items-center gap-2">
                <Plus className="w-5 h-5" /> Upload File
                <input type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" />
              </label>
            </div>
          )}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            {files.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No files shared yet.</p>
            ) : (
              <ul className="divide-y">
                {files.map(file => (
                  <li key={file.id} className="py-3 flex justify-between items-center">
                    <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-[#0033A0] hover:underline">
                      {file.file_name} ({(file.file_size / 1024).toFixed(2)} KB)
                    </a>
                    <span className="text-xs text-gray-500">{new Date(file.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold mb-3">Members ({members.length})</h3>
          <ul className="space-y-2">
            {members.map(member => (
              <li key={member.user_id} className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{member.profiles?.full_name}</span>
                  {member.role === 'creator' && <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Creator</span>}
                  {member.role === 'admin' && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Admin</span>}
                </div>
                {member.user_id === user.id && <span className="text-xs text-gray-500">You</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}