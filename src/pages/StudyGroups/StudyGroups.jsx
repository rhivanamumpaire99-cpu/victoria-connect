import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Users, Plus, Search, BookOpen } from 'lucide-react';

export default function StudyGroups({ user }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', course: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .select(`
          *,
          group_members (count)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    if (!newGroup.name || !newGroup.course) {
      toast.error('Name and course are required');
      return;
    }

    setCreating(true);
    try {
      const { data: group, error } = await supabase
        .from('study_groups')
        .insert([{
          name: newGroup.name,
          description: newGroup.description,
          course: newGroup.course,
          created_by: user.id
        }])
        .select()
        .single();
      if (error) throw error;

      // Add creator as member with role 'creator'
      await supabase
        .from('group_members')
        .insert([{ group_id: group.id, user_id: user.id, role: 'creator' }]);

      toast.success('Group created!');
      setShowCreateModal(false);
      setNewGroup({ name: '', description: '', course: '' });
      fetchGroups();
    } catch (error) {
      toast.error('Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.course.toLowerCase().includes(search.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0033A0]"></div></div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-8 h-8 text-[#0033A0]" />
          Study Groups
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#0033A0] text-white px-4 py-2 rounded-full hover:bg-[#002277] transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Group
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search groups by name, course, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
        />
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
          <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No groups found</p>
          <p className="text-gray-400">Create the first study group!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map(group => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg text-gray-800">{group.name}</h3>
                <span className="bg-[#0033A0]/10 text-[#0033A0] text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {group.course}
                </span>
              </div>
              {group.description && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{group.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{group.group_members?.[0]?.count || 0} members</span>
                <span>Created {new Date(group.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Create Study Group</h2>
            <form onSubmit={createGroup}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Group Name *</label>
                  <input
                    type="text"
                    required
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Course *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., CS301, Database Systems"
                    value={newGroup.course}
                    onChange={(e) => setNewGroup({ ...newGroup, course: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description (optional)</label>
                  <textarea
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2 bg-[#0033A0] text-white rounded-full hover:bg-[#002277] disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}