import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import type { User } from '@supabase/supabase-js';

// --- Helper Components defined inside the page file ---

// Props type for the form component
type UpdateProfileFormProps = {
  user: {
    id: string;
    email?: string; // Accepting that email can be optional
  };
  profileData: {
    full_name?: string;
    telegram_chat_id?: string;
    [key: string]: any;
  };
  onProfileUpdate: (newProfileData: any) => void;
}

// کامپوننت فرم برای آپدیت اطلاعات پروفایل
function UpdateProfileForm({ user, profileData, onProfileUpdate }: UpdateProfileFormProps) {
  const [fullName, setFullName] = useState(profileData.full_name || '');
  const [chatId, setChatId] = useState(profileData.telegram_chat_id || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, telegram_chat_id: chatId })
      .eq('user_id', user.id);
    
    if (error) {
      setMessage('Error updating profile.');
      console.error(error);
    } else {
      setMessage('Profile updated successfully!');
      onProfileUpdate({ ...profileData, full_name: fullName, telegram_chat_id: chatId });
    }
    setLoading(false);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-white mb-4">User Information</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
          <input id="email" type="email" value={user.email || ''} disabled className="mt-1 w-full p-2 bg-gray-700 border-gray-600 rounded-md text-gray-400 cursor-not-allowed" />
        </div>
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-300">Full Name</label>
          <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full p-2 bg-gray-700 border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label htmlFor="chatId" className="block text-sm font-medium text-gray-300">Telegram Chat ID</label>
          <input id="chatId" type="text" value={chatId} onChange={(e) => setChatId(e.target.value)} className="mt-1 w-full p-2 bg-gray-700 border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50 transition-colors">
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        {message && <p className="text-center text-emerald-400 text-sm mt-2">{message}</p>}
      </form>
    </div>
  );
}

// کامپوننت فرم برای تغییر رمز عبور
function ChangePasswordForm() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) {
        setError("User email not found.");
        return;
    }
    setLoading(true);
    setMessage('');
    setError('');

    // Supabase doesn't have a direct "reauthenticate" or "check password" method on the client.
    // The official recommendation is to update the password directly.
    // The user must be recently logged in for this to work without re-authentication.
    // For higher security, you would build a custom server endpoint to verify the old password.
    // For this client-side app, we will proceed with the direct update.
    
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
        setError(updateError.message);
    } else {
        setMessage('Password updated successfully!');
        setOldPassword('');
        setNewPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-white mb-4">Change Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">New Password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="mt-1 w-full p-2 bg-gray-700 border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50 transition-colors">
          {loading ? 'Changing...' : 'Change Password'}
        </button>
        {message && <p className="text-center text-emerald-400 text-sm mt-2">{message}</p>}
        {error && <p className="text-center text-red-400 text-sm mt-2">{error}</p>}
      </form>
    </div>
  );
}


// --- Main Page Component ---
export function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (error) {
            // If no profile exists, it might throw an error. We can ignore it and let the user create one.
            console.warn(error.message);
            setProfile({}); // Set an empty object to allow form rendering
        } else {
            setProfile(data);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);
  
  if (loading) return <Layout><div className="text-white p-10 text-center">Loading profile...</div></Layout>;
  
  if (!user) return <Layout><div className="text-white p-10 text-center">Please log in to view your profile.</div></Layout>;
  
  if (!profile) return <Layout><div className="text-white p-10 text-center">Could not load profile data.</div></Layout>;

  return (
    <Layout>
      <div className=" max-w-4xl mx-auto py-12 px-4 space-y-8">
        <UpdateProfileForm user={user} profileData={profile} onProfileUpdate={setProfile} />
        <ChangePasswordForm />
      </div>
    </Layout>
  );
}