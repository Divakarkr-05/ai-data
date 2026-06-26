import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { DatasetPage } from './pages/DatasetPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ChatbotPage } from './pages/ChatbotPage';
import { RefreshCw } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, token, loading } = useAuth();
  const [activePage, setActivePage] = useState<'dashboard' | 'upload' | 'history' | 'settings' | 'dataset' | 'chatbot'>('dashboard');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm font-semibold tracking-wider font-mono uppercase">Restoring Secured Session...</p>
      </div>
    );
  }

  // If user is not authenticated, render AuthPage
  if (!token || !user) {
    return <AuthPage />;
  }

  return (
    <DashboardLayout 
      activePage={activePage} 
      setActivePage={setActivePage}
      selectedDatasetId={selectedDatasetId}
    >
      {activePage === 'dashboard' && (
        <DashboardPage 
          setActivePage={setActivePage} 
          setSelectedDatasetId={setSelectedDatasetId} 
        />
      )}
      {activePage === 'upload' && (
        <UploadPage 
          setActivePage={setActivePage} 
          setSelectedDatasetId={setSelectedDatasetId} 
        />
      )}
      {activePage === 'history' && (
        <HistoryPage 
          setActivePage={setActivePage} 
          setSelectedDatasetId={setSelectedDatasetId} 
        />
      )}
      {activePage === 'settings' && (
        <SettingsPage />
      )}
      {activePage === 'chatbot' && (
        <ChatbotPage 
          setActivePage={setActivePage} 
          setSelectedDatasetId={setSelectedDatasetId} 
        />
      )}
      {activePage === 'dataset' && selectedDatasetId && (
        <DatasetPage 
          datasetId={selectedDatasetId} 
          setActivePage={setActivePage} 
          setSelectedDatasetId={setSelectedDatasetId} 
        />
      )}
    </DashboardLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
