import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { 
  BookOpen, 
  Upload, 
  Download, 
  Search,
  X,
  ChevronUp,
  ChevronDown,
  FileText,
  Loader,
  BookMarked,
  GraduationCap,
  FileArchive,
  Book,
  Sparkles
} from 'lucide-react';

export default function Library({ user, profile }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState('');
  const [type, setType] = useState('note');
  const [genre, setGenre] = useState(''); // for books
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('downloads');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchItems();
  }, [filterCourse, filterType, sortBy, sortOrder]);

  const fetchItems = async () => {
    try {
      let query = supabase
        .from('library_items')
        .select(`
          *,
          profiles (full_name, university)
        `);

      if (filterCourse) {
        query = query.eq('course', filterCourse);
      }
      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }
      if (sortBy === 'downloads') {
        query = query.order('downloads_count', { ascending: sortOrder === 'asc' });
      } else {
        query = query.order('created_at', { ascending: sortOrder === 'asc' });
      }

      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      toast.error('Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }
    setFile(selected);
  };

  const uploadFile = async () => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from('library-files')
      .upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from('library-files')
      .getPublicUrl(fileName);
    return publicUrl;
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title || !file) {
      toast.error('Please fill all fields');
      return;
    }
    if (type === 'book' && !genre) {
      toast.error('Please specify a genre for the book');
      return;
    }

    setUploading(true);
    try {
      const fileUrl = await uploadFile();
      if (!fileUrl) throw new Error('Upload failed');

      const insertData = {
        user_id: user.id,
        title,
        description,
        course: course || null,
        type,
        file_url: fileUrl,
        file_type: file.type
      };
      if (type === 'book') {
        insertData.genre = genre;
      }

      const { error } = await supabase
        .from('library_items')
        .insert([insertData]);

      if (error) throw error;

      toast.success('File uploaded!');
      setUploadModal(false);
      setTitle('');
      setDescription('');
      setCourse('');
      setType('note');
      setGenre('');
      setFile(null);
      fetchItems();
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (item) => {
    await supabase
      .from('library_items')
      .update({ downloads_count: (item.downloads_count || 0) + 1 })
      .eq('id', item.id);
    window.open(item.file_url, '_blank');
    fetchItems();
  };

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(search.toLowerCase())) ||
    (item.genre && item.genre.toLowerCase().includes(search.toLowerCase()))
  );

  const uniqueCourses = [...new Set(items.map(i => i.course).filter(Boolean))];
  const uniqueGenres = [...new Set(items.filter(i => i.genre).map(i => i.genre))];

  // Type icons and labels
  const typeIcons = {
    note: <FileText className="w-4 h-4" />,
    past_paper: <FileArchive className="w-4 h-4" />,
    textbook: <BookMarked className="w-4 h-4" />,
    book: <Book className="w-4 h-4" />,
    other: <GraduationCap className="w-4 h-4" />
  };

  const typeLabels = {
    note: 'Note',
    past_paper: 'Past Paper',
    textbook: 'Textbook',
    book: 'Book',
    other: 'Other'
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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-[#0033A0]" />
          Digital Library
        </h1>
        <button
          onClick={() => setUploadModal(true)}
          className="bg-[#0033A0] text-white px-4 py-2 rounded-full hover:bg-[#002277] transition flex items-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Upload Resource
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 pb-2">
        {[
          { value: 'all', label: 'All', icon: <FileText className="w-4 h-4" /> },
          { value: 'note', label: 'Notes', icon: <FileText className="w-4 h-4" /> },
          { value: 'past_paper', label: 'Past Papers', icon: <FileArchive className="w-4 h-4" /> },
          { value: 'textbook', label: 'Textbooks', icon: <BookMarked className="w-4 h-4" /> },
          { value: 'book', label: 'Books', icon: <Book className="w-4 h-4" /> },
          { value: 'other', label: 'Other', icon: <GraduationCap className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilterType(tab.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition ${
              filterType === tab.value
                ? 'bg-[#0033A0] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, description, or genre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
          </div>
          {filterType === 'book' && uniqueGenres.length > 0 && (
            <select
              value={filterCourse} // reuse course filter for genre? Better to add a genre filter.
              onChange={(e) => setFilterCourse(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            >
              <option value="">All Genres</option>
              {uniqueGenres.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          )}
          {!filterType.includes('book') && (
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            >
              <option value="">All Courses</option>
              {uniqueCourses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <button
              onClick={() => {
                setSortBy('downloads');
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              }}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg border ${
                sortBy === 'downloads' ? 'bg-[#FFD100] border-[#0033A0]' : 'bg-white'
              }`}
            >
              Downloads
              {sortBy === 'downloads' && (sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />)}
            </button>
            <button
              onClick={() => {
                setSortBy('date');
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              }}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg border ${
                sortBy === 'date' ? 'bg-[#FFD100] border-[#0033A0]' : 'bg-white'
              }`}
            >
              Date
              {sortBy === 'date' && (sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />)}
            </button>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No items found</p>
          <p className="text-gray-400">Be the first to upload!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {typeIcons[item.type] || <FileText className="w-4 h-4 text-gray-500" />}
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                      {typeLabels[item.type] || 'Other'}
                    </span>
                  </div>
                  {item.course && (
                    <span className="bg-gray-100 text-xs px-2 py-1 rounded-full text-gray-600">{item.course}</span>
                  )}
                </div>
                <h3 className="font-semibold text-lg text-gray-800 line-clamp-2 mb-1">{item.title}</h3>
                {item.genre && (
                  <div className="flex items-center gap-1 text-xs text-purple-600 mb-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{item.genre}</span>
                  </div>
                )}
                {item.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                  <span className="truncate max-w-[120px]">By {item.profiles?.full_name || 'Unknown'}</span>
                  <span className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    {item.downloads_count || 0}
                  </span>
                </div>
                <button
                  onClick={() => handleDownload(item)}
                  className="w-full bg-[#0033A0] text-white py-2 rounded-lg hover:bg-[#002277] transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Upload Resource</h2>
              <button onClick={() => setUploadModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setGenre(''); // reset genre when type changes
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                >
                  <option value="note">Note</option>
                  <option value="past_paper">Past Paper</option>
                  <option value="textbook">Textbook</option>
                  <option value="book">Book (Novel, Poetry, etc.)</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {type === 'book' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Genre *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Fiction, Poetry, Science Fiction, Romance..."
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                  />
                </div>
              )}

              {type !== 'book' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., CS301, Database Systems"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File (PDF, EPUB, DOC, etc.) *</label>
                <input
                  type="file"
                  required
                  onChange={handleFileSelect}
                  accept=".pdf,.epub,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                />
                <p className="text-xs text-gray-500 mt-1">Max size 10MB. For books, PDF or EPUB work best.</p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setUploadModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2 bg-[#0033A0] text-white rounded-full hover:bg-[#002277] disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? <Loader className="animate-spin w-5 h-5" /> : <Upload className="w-5 h-5" />}
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}