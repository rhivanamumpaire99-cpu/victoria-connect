import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Camera, X, Plus, Trash2 } from 'lucide-react';

export default function EditProfile({ user, profile: initialProfile }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(initialProfile || {});
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [skills, setSkills] = useState(profile.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [education, setEducation] = useState(profile.education || []);
  const [eduForm, setEduForm] = useState({
    school: '', degree: '', field: '', startYear: '', endYear: '', current: false
  });
  const [privacy, setPrivacy] = useState(profile.privacy_settings || {
    profile_visibility: 'public',
    message_permission: 'everyone'
  });

  useEffect(() => {
    if (!profile) fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) {
      setProfile(data);
      setSkills(data.skills || []);
      setEducation(data.education || []);
      setPrivacy(data.privacy_settings || {
        profile_visibility: 'public',
        message_permission: 'everyone'
      });
    }
  };

  const uploadFile = async (file, bucket, path) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${path}-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    return publicUrl;
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar must be < 2MB');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Cover photo must be < 5MB');
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const addEducation = () => {
    if (eduForm.school && eduForm.degree) {
      setEducation([...education, eduForm]);
      setEduForm({ school: '', degree: '', field: '', startYear: '', endYear: '', current: false });
    }
  };

  const removeEducation = (index) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let avatarUrl = profile.avatar_url;
      let coverUrl = profile.cover_image;

      if (avatarFile) {
        avatarUrl = await uploadFile(avatarFile, 'profile-pictures', 'avatar');
      }
      if (coverFile) {
        coverUrl = await uploadFile(coverFile, 'cover-photos', 'cover');
      }

      const updates = {
        full_name: profile.full_name,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        contact_email: profile.contact_email,
        course: profile.course,
        year_of_study: profile.year_of_study,
        faculty: profile.faculty,
        skills,
        education,
        privacy_settings: privacy,
        avatar_url: avatarUrl,
        cover_image: coverUrl
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Profile updated!');
      navigate(`/profile/${user.id}`);
    } catch (error) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Edit Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        
        {/* Avatar & Cover */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Profile Picture</label>
            <div className="flex items-center gap-4">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar preview" className="w-20 h-20 rounded-full object-cover" />
              ) : profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                  <Camera className="w-8 h-8" />
                </div>
              )}
              <label className="cursor-pointer bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition">
                Choose Image
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
              {avatarPreview && (
                <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null); }} className="text-red-500">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cover Photo</label>
            {coverPreview || profile.cover_image ? (
              <img src={coverPreview || profile.cover_image} alt="Cover preview" className="w-full h-32 object-cover rounded-lg mb-2" />
            ) : null}
            <label className="cursor-pointer bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition inline-flex items-center gap-2">
              <Camera className="w-5 h-5" /> Upload Cover
              <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
            </label>
            {coverPreview && (
              <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null); }} className="ml-2 text-red-500">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              type="text"
              value={profile.full_name || ''}
              onChange={(e) => setProfile({...profile, full_name: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input
              type="text"
              value={profile.location || ''}
              onChange={(e) => setProfile({...profile, location: e.target.value})}
              placeholder="e.g., Kampala, Uganda"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Website</label>
            <input
              type="url"
              value={profile.website || ''}
              onChange={(e) => setProfile({...profile, website: e.target.value})}
              placeholder="https://..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact Email</label>
            <input
              type="email"
              value={profile.contact_email || ''}
              onChange={(e) => setProfile({...profile, contact_email: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium mb-1">Bio</label>
          <textarea
            value={profile.bio || ''}
            onChange={(e) => setProfile({...profile, bio: e.target.value})}
            rows="4"
            placeholder="Tell others about yourself..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
          />
        </div>

        {/* Academic */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Course</label>
            <input
              type="text"
              value={profile.course || ''}
              onChange={(e) => setProfile({...profile, course: e.target.value})}
              placeholder="e.g., Computer Science"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Year of Study</label>
            <input
              type="number"
              min="1"
              max="6"
              value={profile.year_of_study || ''}
              onChange={(e) => setProfile({...profile, year_of_study: parseInt(e.target.value)})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Faculty</label>
            <input
              type="text"
              value={profile.faculty || ''}
              onChange={(e) => setProfile({...profile, faculty: e.target.value})}
              placeholder="e.g., Science & Technology"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
            />
          </div>
        </div>

        {/* Skills */}
        <div>
          <label className="block text-sm font-medium mb-1">Skills</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="e.g., Python, Public Speaking"
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0]"
            />
            <button type="button" onClick={addSkill} className="px-4 py-2 bg-[#0033A0] text-white rounded-lg hover:bg-[#002277]">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map(skill => (
              <span key={skill} className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)} className="text-gray-500 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Education */}
        <div>
          <label className="block text-sm font-medium mb-1">Education</label>
          <div className="space-y-2 mb-2">
            {education.map((edu, idx) => (
              <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                <div>
                  <span className="font-medium">{edu.school}</span> – {edu.degree} in {edu.field}
                  <span className="text-sm text-gray-500 ml-2">
                    {edu.startYear} – {edu.current ? 'Present' : edu.endYear}
                  </span>
                </div>
                <button type="button" onClick={() => removeEducation(idx)} className="text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 border rounded-lg">
            <input
              type="text"
              placeholder="School/University"
              value={eduForm.school}
              onChange={(e) => setEduForm({...eduForm, school: e.target.value})}
              className="px-3 py-2 border rounded"
            />
            <input
              type="text"
              placeholder="Degree (e.g., Bachelor)"
              value={eduForm.degree}
              onChange={(e) => setEduForm({...eduForm, degree: e.target.value})}
              className="px-3 py-2 border rounded"
            />
            <input
              type="text"
              placeholder="Field of study"
              value={eduForm.field}
              onChange={(e) => setEduForm({...eduForm, field: e.target.value})}
              className="px-3 py-2 border rounded"
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Start Year"
                value={eduForm.startYear}
                onChange={(e) => setEduForm({...eduForm, startYear: e.target.value})}
                className="w-24 px-3 py-2 border rounded"
              />
              <input
                type="number"
                placeholder="End Year"
                value={eduForm.endYear}
                onChange={(e) => setEduForm({...eduForm, endYear: e.target.value})}
                className="w-24 px-3 py-2 border rounded"
                disabled={eduForm.current}
              />
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={eduForm.current}
                  onChange={(e) => setEduForm({...eduForm, current: e.target.checked, endYear: ''})}
                />
                Current
              </label>
            </div>
            <button type="button" onClick={addEducation} className="col-span-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Add Education
            </button>
          </div>
        </div>

        {/* Privacy Settings */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Privacy Settings</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <span className="w-32">Profile visibility:</span>
              <select
                value={privacy.profile_visibility}
                onChange={(e) => setPrivacy({...privacy, profile_visibility: e.target.value})}
                className="px-3 py-1 border rounded"
              >
                <option value="public">Public (everyone)</option>
                <option value="students">Students only</option>
                <option value="followers">Followers only</option>
                <option value="private">Only me</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="w-32">Message permission:</span>
              <select
                value={privacy.message_permission}
                onChange={(e) => setPrivacy({...privacy, message_permission: e.target.value})}
                className="px-3 py-1 border rounded"
              >
                <option value="everyone">Everyone</option>
                <option value="followers">Followers only</option>
                <option value="mutual">Mutual follows only</option>
                <option value="none">No one</option>
              </select>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-4 border-t">
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-2 text-gray-600">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-[#0033A0] text-white rounded-full hover:bg-[#002277] disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}