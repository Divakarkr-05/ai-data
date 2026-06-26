import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  User as UserIcon, Lock, Trash2, Mail, ShieldAlert, Key, Save, RefreshCw, Eye, ExternalLink, RefreshCw as LoopIcon 
} from 'lucide-react';
import { motion } from 'motion/react';

interface EmailLog {
  id: string;
  recipientEmail: string;
  datasetName: string;
  sentAt: string;
  status: 'simulated' | 'delivered';
}

export const SettingsPage: React.FC = () => {
  const { user, refreshUser, addToast, logout } = useAuth();
  
  // Profile form states
  const [name, setName] = useState(user?.name || '');
  const [avatarSeed, setAvatarSeed] = useState(user?.name || 'DataSage');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Password form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Email simulation history
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Account deletion states
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const fetchEmailLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch('/api/activities');
      if (res.ok) {
        const data = await res.json();
        // Extract email related operations
        const emails = data.activities
          .filter((a: any) => a.type === 'dataset_email')
          .map((a: any) => ({
            id: a.id,
            recipientEmail: a.description.split('to ')[1]?.split(' ')[0] || user?.email || '',
            datasetName: a.description.split('dataset "')[1]?.split('"')[0] || 'Unknown Dataset',
            sentAt: a.timestamp,
            status: a.description.includes('Simulated') ? 'simulated' : 'delivered'
          }));
        setEmailLogs(emails);
      }
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchEmailLogs();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setUpdatingProfile(true);
      const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`;
      await api.updateProfile({ name, avatarUrl });
      await refreshUser();
      addToast('Profile updated successfully!', 'success');
    } catch (error: any) {
      addToast(error.message || 'Profile update failed.', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      addToast('Please fill all password fields.', 'warning');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      addToast('New passwords do not match.', 'error');
      return;
    }

    try {
      setUpdatingPassword(true);
      await api.changePassword({ oldPassword: currentPassword, newPassword });
      addToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      addToast(error.message || 'Password change failed.', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      addToast('Please type "DELETE" to confirm account deletion.', 'warning');
      return;
    }

    if (!confirm('WARNING: Are you absolutely certain you want to permanently delete your account and all stored datasets? This operation cannot be undone.')) {
      return;
    }

    try {
      setDeletingAccount(true);
      await api.deleteAccount();
      addToast('Your account and datasets have been permanently deleted.', 'success');
      logout();
    } catch (error: any) {
      addToast(error.message || 'Deletion failed.', 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  const regenerateAvatar = () => {
    const randomSeeds = ['TechSage', 'Nebula', 'Crypto', 'Alpha', 'Glitch', 'Matrix', 'Spectre', 'Helix'];
    const randomSeed = randomSeeds[Math.floor(Math.random() * randomSeeds.length)] + '_' + Math.floor(Math.random() * 100);
    setAvatarSeed(randomSeed);
  };

  const previewAvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`;

  return (
    <div className="flex flex-col gap-8 text-left h-full">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-100 bg-clip-text text-transparent">
          Settings & Profile
        </h2>
        <p className="text-slate-400 text-sm mt-1">Configure your personal workspace and monitor active dispatch integrations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* PROFILE CARD & PASSWORD (Left 6 columns) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          
          {/* PROFILE CARD */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800/40 shadow-xl flex flex-col gap-5">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">My Workspace Profile</h3>
            
            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
              <div className="flex items-center gap-5">
                <img 
                  src={previewAvatarUrl} 
                  alt="Avatar seed preview" 
                  className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner p-1"
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-slate-400 font-medium">Profile Image Seed</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={avatarSeed}
                      onChange={(e) => setAvatarSeed(e.target.value)}
                      placeholder="seed"
                      className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/40 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 w-32"
                    />
                    <button
                      type="button"
                      onClick={regenerateAvatar}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <LoopIcon className="w-3 h-3" />
                      Shuffle Seed
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Workspace Operator Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 opacity-65">
                <label className="text-xs text-slate-400 font-medium">Registered Credentials (Read Only)</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800/40 bg-slate-950 text-xs text-slate-400 select-none cursor-not-allowed"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingProfile}
                className="w-full mt-1 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-slate-200 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {updatingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Profile Parameters
              </button>
            </form>
          </div>

          {/* CHANGE PASSWORD */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800/40 shadow-xl flex flex-col gap-5">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">Modify Account Credentials</h3>
            
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">New Secure Password</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Confirm New Password</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingPassword}
                className="w-full mt-1 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-slate-200 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {updatingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                Change Password
              </button>
            </form>
          </div>

        </div>

        {/* SIMULATED DELIVERIES & DESTRUCTION CARD (Right 6 columns) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          
          {/* EMAIL SIMULATION HISTORICAL TIMELINE */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800/40 shadow-xl flex flex-col gap-5 min-h-[300px]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">SaaS Integrations Hub</h3>
              <button
                onClick={fetchEmailLogs}
                className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <LoopIcon className="w-3 h-3" /> Refresh logs
              </button>
            </div>

            {loadingLogs ? (
              <div className="flex flex-col items-center justify-center gap-2 my-auto">
                <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                <span className="text-xs text-slate-500">Retrieving deliveries...</span>
              </div>
            ) : emailLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 text-center my-auto text-slate-500 py-10">
                <Mail className="w-8 h-8 opacity-30 animate-pulse" />
                <p className="text-xs">No email dispatches recorded.</p>
                <span className="text-[10px] max-w-xs leading-normal mt-1 text-slate-600">
                  When you click "Email Cleaned CSV" inside any dataset page, its transactional dispatch record pops up here!
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {emailLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/60 flex items-center justify-between text-xs text-left">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-200">Sent "{log.datasetName}"</span>
                      <span className="text-[10px] text-slate-500 font-mono">To: {log.recipientEmail} • {new Date(log.sentAt).toLocaleTimeString()}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase font-mono ${
                      log.status === 'delivered'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                    }`}>
                      {log.status === 'delivered' ? 'Resend API' : 'Simulated'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DANGEROUS PERMANENT DESTRUCTION */}
          <div className="glass-card p-6 rounded-2xl border border-rose-500/20 bg-rose-950/5 shadow-xl flex flex-col gap-4 text-left">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2 uppercase tracking-wider font-mono">
              <ShieldAlert className="w-4 h-4" /> Permanent Account Destruction
            </h3>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              This action will instantly delete your credentials, user configuration, profile assets, and permanently erase every spreadsheet database upload from our servers. This action is irreversible.
            </p>

            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[11px] text-rose-400/80 font-mono font-medium">To confirm, please type "DELETE" below:</span>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="DELETE"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-rose-500/20 bg-rose-950/10 text-xs text-slate-100 focus:outline-none focus:border-rose-500 transition-colors placeholder-rose-950 font-bold"
                />
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  Permanently Delete
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
