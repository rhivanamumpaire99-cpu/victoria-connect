import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ChevronLeft, MessageCircle, Trash } from 'lucide-react';

export default function ItemDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_items')
        .select(`
          *,
          profiles (id, full_name, avatar_url),
          categories (name)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      setItem(data);
      setIsOwner(data.user_id === user.id);
    } catch (error) {
      toast.error('Item not found');
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const { error } = await supabase
        .from('marketplace_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Item deleted');
      navigate('/marketplace');
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const markAsSold = async () => {
    try {
      const { error } = await supabase
        .from('marketplace_items')
        .update({ status: 'sold' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Marked as sold');
      fetchItem();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-[#0033A0] mb-4">
        <ChevronLeft className="w-5 h-5" /> Back
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {item.image_urls && item.image_urls.length > 0 && (
          <div className="grid grid-cols-2 gap-1">
            {item.image_urls.map((url, idx) => (
              <img key={idx} src={url} alt={item.title} className="w-full h-64 object-cover" />
            ))}
          </div>
        )}

        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{item.title}</h1>
              <p className="text-gray-500 mt-1">{item.categories?.name} · {item.condition}</p>
            </div>
            <p className="text-3xl font-bold text-[#0033A0]">UGX {item.price}</p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div className="w-10 h-10 bg-gray-300 rounded-full" />
            <div>
              <p className="font-medium">Seller: {item.profiles?.full_name}</p>
              <Link to={`/profile/${item.profiles?.id}`} className="text-sm text-[#0033A0] hover:underline">
                View Profile
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{item.description || 'No description provided.'}</p>
          </div>

          {item.status === 'sold' && (
            <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg">This item has been sold.</div>
          )}

          {isOwner ? (
            <div className="mt-6 flex gap-2">
              {item.status === 'active' && (
                <button
                  onClick={markAsSold}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Mark as Sold
                </button>
              )}
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Trash className="w-4 h-4" /> Delete
              </button>
            </div>
          ) : (
            item.status === 'active' && (
              <div className="mt-6">
                <button className="bg-[#0033A0] text-white px-6 py-3 rounded-lg hover:bg-[#002277] transition flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" /> Contact Seller
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  You'll be redirected to chat (you can build this later).
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}