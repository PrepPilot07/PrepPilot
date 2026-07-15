import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { fetchProfile, updateProfileName, changePassword, deleteAccount, ProfileData } from '../api/profile';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Trash2, Check, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const { token, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  // Profile state
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');

  // Delete state
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchProfile(token).then(res => {
      if (res.data) {
        setProfile(res.data);
        setName(res.data.name || '');
      }
    });
  }, [token]);

  const handleNameSave = async () => {
    if (!token || !name.trim()) return;
    setNameLoading(true);
    setNameError('');
    setNameSuccess(false);
    const res = await updateProfileName(token, name.trim());
    setNameLoading(false);
    if (res.error) {
      setNameError(res.error);
    } else {
      setNameSuccess(true);
      updateUser({ name: name.trim() });
      setTimeout(() => setNameSuccess(false), 3000);
    }
  };

  const handlePasswordChange = async () => {
    if (!token) return;
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    setPwLoading(true);
    setPwError('');
    setPwSuccess(false);
    const res = await changePassword(token, currentPassword, newPassword);
    setPwLoading(false);
    if (res.error) {
      setPwError(res.error);
    } else {
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSuccess(false), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token || !deletePassword) return;
    setDeleteLoading(true);
    setDeleteError('');
    const res = await deleteAccount(token, deletePassword);
    setDeleteLoading(false);
    if (res.error) {
      setDeleteError(res.error);
    } else {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">Manage your account preferences</p>

      {/* ── Profile Section ─────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <User size={18} className="text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-900">Profile</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="w-full px-3.5 py-2.5 border border-gray-100 rounded-xl text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
            />
          </div>

          {profile?.roleTitle && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Target Role</label>
              <p className="px-3.5 py-2.5 border border-gray-100 rounded-xl text-sm text-gray-600 bg-gray-50">
                {profile.roleTitle}
              </p>
            </div>
          )}

          {nameError && <p className="text-xs text-red-500">{nameError}</p>}
          {nameSuccess && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <Check size={12} /> Name updated successfully
            </p>
          )}

          <button
            onClick={handleNameSave}
            disabled={nameLoading || !name.trim()}
            className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {nameLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </section>

      {/* ── Password Section ────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={18} className="text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
            />
          </div>

          {pwError && <p className="text-xs text-red-500">{pwError}</p>}
          {pwSuccess && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <Check size={12} /> Password changed successfully
            </p>
          )}

          <button
            onClick={handlePasswordChange}
            disabled={pwLoading || !currentPassword || !newPassword}
            className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pwLoading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </section>

      {/* ── Danger Zone ─────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-red-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Trash2 size={18} className="text-red-500" />
          <h2 className="text-base font-semibold text-gray-900">Danger Zone</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-5 py-2.5 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-200 hover:bg-red-100 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">
                This will permanently delete your account, all roadmaps, responses, and uploaded documents. Enter your password to confirm.
              </p>
            </div>
            <input
              type="password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3.5 py-2.5 border border-red-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
            />
            {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || !deletePassword}
                className="px-5 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(''); }}
                className="px-5 py-2.5 text-gray-600 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
