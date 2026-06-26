import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  UploadCloud, 
  History, 
  Settings as SettingsIcon, 
  LogOut, 
  Menu, 
  X, 
  Database, 
  Sparkles, 
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activePage: 'dashboard' | 'upload' | 'history' | 'settings' | 'dataset' | 'chatbot';
  setActivePage: (page: any) => void;
  selectedDatasetId?: string | null;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  activePage, 
  setActivePage,
  selectedDatasetId 
}) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload Dataset', icon: UploadCloud },
    { id: 'chatbot', label: 'DataSage Copilot', icon: Sparkles },
    { id: 'history', label: 'Dataset History', icon: History },
    { id: 'settings', label: 'Settings & Profile', icon: SettingsIcon },
  ];

  const handleNav = (pageId: string) => {
    setActivePage(pageId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row relative overflow-hidden">
      {/* Dynamic Ambient Glowing Background Blobs */}
      <div className="absolute top-[-200px] right-[-100px] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-cyan-600/15 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex flex-col w-72 glass-panel border-r border-white/5 p-6 z-10 select-none shrink-0 justify-between">
        <div className="flex flex-col gap-8">
          {/* Brand/Logo */}
          <div className="flex items-center gap-3 px-2">
            <div className="bg-gradient-to-br from-indigo-500 to-cyan-400 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-sans font-bold text-xl tracking-tight text-zinc-100">
                DataSage <span className="text-indigo-400">AI</span>
              </h1>
              <span className="text-[10px] font-mono tracking-wider text-indigo-400 uppercase font-semibold">
                Hackathon MVP v1.0
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id || (item.id === 'history' && activePage === 'dataset');
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                    isActive 
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                      : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
                  {item.label}
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute left-1 w-1 h-5 bg-gradient-to-b from-indigo-400 to-cyan-400 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card at bottom */}
        {user && (
          <div className="flex flex-col gap-4 border-t border-white/5 pt-5">
            <div className="bg-zinc-900/40 p-4 rounded-2xl flex items-center gap-3 border border-white/5">
              <img 
                src={user.avatarUrl} 
                alt={user.name} 
                className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/5 shadow-md shadow-black/40"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-zinc-200">{user.name}</p>
                <p className="text-xs text-zinc-500 truncate font-mono">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 glass-panel border-b border-white/5 z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <Database className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-lg text-zinc-100 tracking-tight">DataSage AI</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* MOBILE NAVIGATION DRAWER */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-[61px] left-0 right-0 glass-card border-b border-white/5 z-30 p-6 flex flex-col gap-6"
          >
            <nav className="flex flex-col gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-indigo-400" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {user && (
              <div className="flex items-center justify-between border-t border-white/5 pt-5">
                <div className="flex items-center gap-3">
                  <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-xl bg-zinc-800" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">{user.name}</p>
                    <p className="text-xs text-zinc-500 font-mono">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT REGION */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 z-10 max-w-7xl mx-auto w-full flex flex-col gap-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage + (selectedDatasetId || '')}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-8 h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
