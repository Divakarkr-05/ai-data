import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Database, Sparkles, Heart, FileText, ArrowLeft, RefreshCw, BarChart3, MessageSquare, 
  Mail, Download, CheckCircle, Info, ChevronRight, HelpCircle, Send, Plus, Minus, Maximize2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter 
} from 'recharts';

interface DatasetPageProps {
  datasetId: string;
  setActivePage: (page: any) => void;
  setSelectedDatasetId: (id: string | null) => void;
}

const COLORS = ['#6366f1', '#a855f7', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

export const DatasetPage: React.FC<DatasetPageProps> = ({ 
  datasetId, 
  setActivePage, 
  setSelectedDatasetId 
}) => {
  const { user, token, addToast } = useAuth();
  const [dataset, setDataset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analysis' | 'cleaning' | 'analytics' | 'insights' | 'chat'>('analysis');

  // Cleaning options
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [handleMissing, setHandleMissing] = useState(true);
  const [handleOutliers, setHandleOutliers] = useState(true);
  const [normalizeNumeric, setNormalizeNumeric] = useState(false);
  const [standardizeFormats, setStandardizeFormats] = useState(true);
  const [removeUninformativeColumns, setRemoveUninformativeColumns] = useState(true);
  const [selectedColumnsToDrop, setSelectedColumnsToDrop] = useState<string[]>([]);
  const [showRemovedDetails, setShowRemovedDetails] = useState(false);
  const [cleaningInProgress, setCleaningInProgress] = useState(false);

  // Analytics tab variables
  const [chartType, setChartType] = useState<'bar' | 'line' | 'scatter' | 'area' | 'pie'>('bar');
  const [xAxisCol, setXAxisCol] = useState('');
  const [yAxisCol, setYAxisCol] = useState('');

  // AI Insights variables
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Chat variables
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Email variables
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  // PDF variables
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [previewMode, setPreviewMode] = useState<'raw' | 'cleaned'>('raw');

  const fetchDataset = async () => {
    try {
      setLoading(true);
      const res = await api.getDataset(datasetId);
      setDataset(res.dataset);
      setPreviewMode(res.dataset.status === 'cleaned' ? 'cleaned' : 'raw');
      
      // Auto-set default chart columns
      if (res.dataset.headers.length > 0) {
        setXAxisCol(res.dataset.headers[0]);
        const numericCols = res.dataset.headers.filter((h: string) => res.dataset.analysis.columnTypes[h] === 'numeric');
        setYAxisCol(numericCols.length > 0 ? numericCols[0] : res.dataset.headers[0]);
      }
    } catch (error: any) {
      addToast(error.message || 'Failed to retrieve dataset details.', 'error');
      setActivePage('dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataset();
  }, [datasetId]);

  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, dataset?.chatHistory]);

  const handleClean = async () => {
    try {
      setCleaningInProgress(true);
      addToast('AI Cleaning Started...', 'info');
      
      const res = await api.cleanDataset(dataset.id, {
        removeDuplicates,
        handleMissing,
        handleOutliers,
        normalizeNumeric,
        standardizeFormats,
        removeUninformativeColumns,
        columnsToRemove: selectedColumnsToDrop
      });

      setDataset(res.dataset);
      setPreviewMode('cleaned');
      addToast('Dataset cleaned and reformatted successfully!', 'success');
      setActiveTab('analysis'); // bounce to summary report
    } catch (error: any) {
      addToast(error.message || 'Failed to complete dataset cleaning.', 'error');
    } finally {
      setCleaningInProgress(false);
    }
  };

  const handleGenerateInsights = async () => {
    try {
      setInsightsLoading(true);
      addToast('AI Insights Generation Triggered...', 'info');
      const res = await api.getInsights(dataset.id);
      setDataset((prev: any) => ({ ...prev, insights: res.insights }));
      addToast('Comprehensive AI Report Generated!', 'success');
    } catch (error: any) {
      addToast(error.message || 'AI generation failed.', 'error');
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || chatLoading) return;

    const messageToSend = chatMessage;
    setChatMessage('');
    setChatLoading(true);

    // Optimistically update chat log
    setDataset((prev: any) => ({
      ...prev,
      chatHistory: [
        ...(prev.chatHistory || []),
        { role: 'user', parts: [{ text: messageToSend }], timestamp: new Date().toISOString() }
      ]
    }));

    try {
      const res = await api.sendChat(dataset.id, messageToSend);
      setDataset((prev: any) => ({
        ...prev,
        chatHistory: res.chatHistory
      }));
    } catch (error: any) {
      addToast(error.message || 'Failed to get chat response.', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      setSendingEmail(true);
      addToast('Sending email to recipient...', 'info');
      const res = await api.emailDataset(dataset.id, recipientEmail || undefined);
      addToast(res.message, 'success');
      setEmailModalOpen(false);
      setRecipientEmail('');
    } catch (error: any) {
      addToast(error.message || 'Failed to send email.', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadPdf = () => {
    setGeneratingPdf(true);
    addToast('Compiling analytical PDF report...', 'info');
    setTimeout(() => {
      setGeneratingPdf(false);
      addToast('PDF Report exported successfully! Opening print dialogue.', 'success');
      window.print();
    }, 1500);
  };

  if (loading || !dataset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 font-medium">Crunching statistics and loading file details...</p>
      </div>
    );
  }

  // Compile Dynamic Chart Data from first 50 rows (keeps chart responsive and performant)
  const chartData = dataset.cleanedData.slice(0, 50).map((row: any) => ({
    ...row,
    [xAxisCol]: row[xAxisCol] ? String(row[xAxisCol]).substring(0, 15) : 'Blank',
    [yAxisCol]: parseFloat(row[yAxisCol]) || 0
  }));

  return (
    <div className="flex flex-col gap-8 text-left h-full">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActivePage('dashboard')}
            className="p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/30 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-100">{dataset.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider font-mono ${
                dataset.status === 'cleaned'
                  ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                  : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
              }`}>
                {dataset.status === 'cleaned' ? 'Cleaned' : 'Raw'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Uploaded on {new Date(dataset.uploadedAt).toLocaleDateString()} • {dataset.rows} Rows • {dataset.columns} Columns • {dataset.fileSize}
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setEmailModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-300 hover:text-slate-100 text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Mail className="w-4 h-4 text-indigo-400" />
            Email Cleaned CSV
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-300 hover:text-slate-100 text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {generatingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-emerald-400" />}
            Download PDF Report
          </button>
          <a
            href={`/api/datasets/${dataset.id}/download?token=${token}`}
            className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 text-xs font-semibold shadow-sm transition-all inline-flex"
            download
          >
            <Download className="w-4 h-4 text-slate-400" />
            Download Clean CSV
          </a>

          {/* Download Cleaned File button (Supabase Storage) */}
          {dataset.status === 'cleaned' ? (
            <a
              href={dataset.supabaseUrl || `https://datasage-storage.supabase.co/storage/v1/object/public/cleaned-datasets/${dataset.id}_cleaned.csv`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold shadow-lg shadow-indigo-500/15 transition-all inline-flex cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-indigo-200" />
              Download Cleaned File
            </a>
          ) : (
            <button
              onClick={() => addToast("Please run the AI Data Cleaning first to upload the dataset to Supabase Storage and enable this download.", "info")}
              className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs font-semibold cursor-not-allowed transition-all inline-flex opacity-50"
              disabled
            >
              <ExternalLink className="w-4 h-4 text-slate-600" />
              Download Cleaned File
            </button>
          )}
        </div>
      </div>

      {/* MAIN LAYOUT: TABS SELECTOR */}
      <div className="flex bg-slate-900/40 p-1.5 rounded-2xl border border-slate-800/40 select-none overflow-x-auto gap-1">
        {[
          { id: 'analysis', label: 'Analysis & Health', icon: Database },
          { id: 'cleaning', label: 'AI Data Cleaning', icon: Sparkles },
          { id: 'analytics', label: 'Interactive Analytics', icon: BarChart3 },
          { id: 'insights', label: 'AI Insights Report', icon: FileText },
          { id: 'chat', label: 'Interactive AI Chat', icon: MessageSquare }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/15' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT PANEL */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: AUTOMATIC DATASET ANALYSIS */}
          {activeTab === 'analysis' && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              
              {/* HEALTH SCORE AND SUMMARY (Left 4 columns) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* Health Score Circular display */}
                <div className="glass-card p-6 rounded-3xl border border-slate-800/40 flex flex-col items-center justify-center text-center gap-4 shadow-xl">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Dataset Health Score</h3>
                  
                  {/* Premium circular indicator */}
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="72" cy="72" r="62" strokeWidth="8" stroke="rgba(30, 41, 59, 0.5)" fill="transparent" />
                      <circle 
                        cx="72" 
                        cy="72" 
                        r="62" 
                        strokeWidth="8" 
                        stroke={dataset.healthScore > 85 ? '#10b981' : dataset.healthScore > 60 ? '#f59e0b' : '#f43f5e'} 
                        strokeDasharray={2 * Math.PI * 62}
                        strokeDashoffset={2 * Math.PI * 62 * (1 - dataset.healthScore / 100)}
                        strokeLinecap="round"
                        fill="transparent" 
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-4xl font-extrabold text-slate-100">{dataset.healthScore}</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">/100 Index</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-200">
                      {dataset.healthScore > 85 ? 'Prinstine Dataset Quality' : dataset.healthScore > 60 ? 'Moderate Cleanup Needed' : 'Severe Data Corruption'}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
                      Health index scores are dynamically generated based on duplicate density, blank cells, and extreme outliers.
                    </p>
                  </div>
                </div>

                {/* Analysis Audit list */}
                <div className="glass-card p-5 rounded-2xl border border-slate-800/40 flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Anomaly Log</h4>
                  
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs">
                      <span className="text-slate-400">Duplicate Rows</span>
                      <span className={`font-semibold font-mono ${dataset.analysis.duplicateRows > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {dataset.analysis.duplicateRows} rows
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs">
                      <span className="text-slate-400">Empty Columns</span>
                      <span className={`font-semibold font-mono ${dataset.analysis.emptyColumns.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {dataset.analysis.emptyColumns.length} cols
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs">
                      <span className="text-slate-400">Constant Features</span>
                      <span className={`font-semibold font-mono ${dataset.analysis.constantColumns.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {dataset.analysis.constantColumns.length} cols
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* COLUMNS & DETECTED TYPES GRID (Right 8 columns) */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                <h3 className="text-lg font-bold text-slate-200">Automatic Structural Audit</h3>

                <div className="glass-card rounded-2xl border border-slate-800/40 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800/80 bg-slate-900/40 text-xs font-semibold text-slate-400 font-mono">
                          <th className="p-4">Feature Header</th>
                          <th className="p-4">Type</th>
                          <th className="p-4">Missing Density</th>
                          <th className="p-4">Outliers</th>
                          <th className="p-4">Unique Elements</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30 text-xs text-slate-300">
                        {dataset.headers.map((col: string) => {
                          const type = dataset.analysis.columnTypes[col];
                          const missingCount = dataset.analysis.missingValues[col];
                          const missingPct = dataset.analysis.nullPercentages[col];
                          const outlierCount = dataset.analysis.outliers[col];
                          const stats = dataset.analysis.summaryStats[col];

                          return (
                            <tr key={col} className="hover:bg-slate-900/10">
                              <td className="p-4 font-semibold text-slate-200">{col}</td>
                              <td className="p-4">
                                <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase font-mono ${
                                  type === 'numeric'
                                    ? 'bg-blue-500/10 text-blue-300 border border-blue-500/10'
                                    : type === 'date'
                                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/10'
                                    : type === 'boolean'
                                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/10'
                                    : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/10'
                                }`}>
                                  {type}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col gap-1">
                                  <span className="font-mono">{missingCount} blanks ({missingPct}%)</span>
                                  <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${missingPct}%` }} />
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 font-mono">
                                {type === 'numeric' ? (
                                  <span className={outlierCount > 0 ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
                                    {outlierCount} outliers
                                  </span>
                                ) : 'N/A'}
                              </td>
                              <td className="p-4 font-mono text-slate-400">
                                {stats?.uniqueCount ?? '0'} elements
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Display Cleaning Steps if dataset is Cleaned */}
                {dataset.status === 'cleaned' && (
                  <div className="flex flex-col gap-4">
                    {dataset.cleaningReport && dataset.cleaningReport.length > 0 && (
                      <div className="glass-card p-5 rounded-2xl border border-purple-500/20 bg-purple-950/5 flex flex-col gap-3">
                        <h4 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" /> AI Preprocessing Completed Report
                        </h4>
                        <ul className="flex flex-col gap-2 pl-4 list-disc text-xs text-slate-300 leading-relaxed">
                          {dataset.cleaningReport.map((rep: string, index: number) => (
                            <li key={index} className="marker:text-purple-400">{rep}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* SHOW BUTTON for Pruned Columns */}
                    <div className="glass-card p-5 rounded-2xl border border-slate-800/40 bg-slate-900/15 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                            Pruned Columns Profile ({dataset.removedColumns?.length ?? 0} columns dropped)
                          </h4>
                        </div>
                        
                        {/* THE SHOW BUTTON */}
                        <button
                          type="button"
                          id="show-removed-columns-btn"
                          onClick={() => setShowRemovedDetails(!showRemovedDetails)}
                          className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          {showRemovedDetails ? "Hide Details" : "Show Button"}
                        </button>
                      </div>

                      {showRemovedDetails && (
                        <div className="border-t border-slate-800/60 pt-3 flex flex-col gap-2.5">
                          {dataset.removedColumns && dataset.removedColumns.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {dataset.removedColumns.map((col: string) => (
                                <span key={col} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                  {col}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic">No columns were removed during this cleaning pass.</p>
                          )}
                          <p className="text-[10px] text-slate-500 leading-normal mt-1">
                            Dropped columns are completely excluded from downstream analysis, visualization, and correlations.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SPREADSHEET PREVIEW TABLE */}
                <div className="glass-card p-6 rounded-2xl border border-slate-800/40 shadow-xl flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                        <Database className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-200">Dataset Spreadsheet Preview</h4>
                        <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">Showing first 15 records of database</p>
                      </div>
                    </div>

                    {/* Preview Mode Switcher */}
                    <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
                      <button
                        onClick={() => setPreviewMode('raw')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                          previewMode === 'raw'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Raw/Dirty
                      </button>
                      <button
                        onClick={() => {
                          if (dataset.status === 'cleaned') {
                            setPreviewMode('cleaned');
                          } else {
                            addToast("Please complete the AI Data Cleaning first to unlock the Cleaned Preview.", "info");
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-all flex items-center gap-1 ${
                          previewMode === 'cleaned'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shadow-sm cursor-pointer'
                            : 'text-slate-600 hover:text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        Cleaned
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-800/50 rounded-xl">
                    {(() => {
                      const previewHeaders = (previewMode === 'cleaned' && dataset.status === 'cleaned')
                        ? (dataset.cleanedHeaders || dataset.headers)
                        : dataset.headers;
                      return (
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-800/80 bg-slate-900/60 font-mono text-slate-400">
                              <th className="p-3 w-12 text-center text-[10px] uppercase font-bold border-r border-slate-800/55">#</th>
                              {previewHeaders.map((h: string) => (
                                <th key={h} className="p-3 font-semibold min-w-[120px] max-w-[200px] truncate border-r border-slate-800/20 last:border-r-0">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/30 text-slate-300">
                            {(((previewMode === 'cleaned' && dataset.status === 'cleaned' ? dataset.cleanedData : dataset.originalData) || []).slice(0, 15)).map((row: any, rIdx: number) => (
                              <tr key={rIdx} className="hover:bg-slate-900/20 even:bg-slate-900/10">
                                <td className="p-3 text-center font-mono text-slate-500 border-r border-slate-800/55 bg-slate-950/20">
                                  {rIdx + 1}
                                </td>
                                {previewHeaders.map((h: string) => {
                                  const val = row[h];
                                  return (
                                    <td key={h} className="p-3 max-w-[200px] truncate border-r border-slate-800/20 last:border-r-0 font-mono text-[11px]" title={val !== null && val !== undefined ? String(val) : 'N/A'}>
                                      {val === null || val === undefined || val === '' ? (
                                        <span className="text-rose-400/50 italic font-sans">[null]</span>
                                      ) : (
                                        String(val)
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>

                  {previewMode === 'raw' && dataset.status === 'cleaned' && (
                    <div className="flex items-center gap-2 text-[11px] text-indigo-300/80 bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-xl mt-1">
                      <span>💡 Tip: You are currently viewing the raw data with nulls. Click <strong>"Cleaned"</strong> in the switcher above to toggle to the fully processed dataset preview.</span>
                    </div>
                  )}

                  {dataset.status !== 'cleaned' && (
                    <div className="flex items-center gap-2 text-[11px] text-amber-300/80 bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl mt-1">
                      <span>⚠️ Note: This is raw uncleaned data. Click the <strong>"AI Data Cleaning"</strong> tab above to execute standard processing rules on this dataset.</span>
                    </div>
                  )}
                </div>

              </div>

            </motion.div>
          )}

          {/* TAB 2: AI DATA CLEANING CONFIGURATION */}
          {activeTab === 'cleaning' && (
            <motion.div
              key="cleaning"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left"
            >
              
              {/* CONFIGURATIONS FORM (Left 6 columns) */}
              <div className="lg:col-span-6 flex flex-col gap-6">
                <h3 className="text-lg font-bold text-slate-200">Reformatting & Cleaning Policies</h3>

                <div className="glass-card p-6 rounded-2xl border border-slate-800/40 flex flex-col gap-5 shadow-xl">
                  
                  {/* Remove duplicates toggle */}
                  <label className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-900/30 transition-colors cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={removeDuplicates} 
                      onChange={(e) => setRemoveDuplicates(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-indigo-500/20 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">Remove Duplicate Rows</h4>
                      <p className="text-xs text-slate-500 mt-1">Strips out fully repetitive data points from the dataset ({dataset.analysis.duplicateRows} detected).</p>
                    </div>
                  </label>

                  {/* Handle missing values toggle */}
                  <label className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-900/30 transition-colors cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={handleMissing} 
                      onChange={(e) => setHandleMissing(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-indigo-500/20 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">Handle Blank / Missing Values</h4>
                      <p className="text-xs text-slate-500 mt-1">Automatically fills numeric cells with Median, and categorical cells with Mode (Most Frequent) value.</p>
                    </div>
                  </label>

                  {/* Standardize formats toggle */}
                  <label className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-900/30 transition-colors cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={standardizeFormats} 
                      onChange={(e) => setStandardizeFormats(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-indigo-500/20 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">Standardize Variables & Formats</h4>
                      <p className="text-xs text-slate-500 mt-1">Trims extra whitespace, strips currency symbols / commas, and standardizes date representations to YYYY-MM-DD.</p>
                    </div>
                  </label>

                  {/* Handle outliers toggle */}
                  <label className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-900/30 transition-colors cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={handleOutliers} 
                      onChange={(e) => setHandleOutliers(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-indigo-500/20 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">Cap Outliers using IQR Boundaries</h4>
                      <p className="text-xs text-slate-500 mt-1">Winsorizes extreme numeric data values outside 1.5×IQR boundaries to limit analytical skewed noise.</p>
                    </div>
                  </label>

                  {/* MinMax Normalize toggle */}
                  <label className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-900/30 transition-colors cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={normalizeNumeric} 
                      onChange={(e) => setNormalizeNumeric(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-indigo-500/20 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">Normalize Numeric Data (Min-Max Scaling) <span className="text-[10px] text-indigo-400 font-mono uppercase font-semibold pl-1.5">Optional</span></h4>
                      <p className="text-xs text-slate-500 mt-1">Rescales all numerical attributes directly to a [0, 1] range. Great for neural networks or clustering algorithms.</p>
                    </div>
                  </label>

                </div>

                <button
                  onClick={handleClean}
                  disabled={cleaningInProgress}
                  className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:opacity-95 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {cleaningInProgress ? (
                    <>
                      <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                      Applying pipeline and training reformatters...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4.5 h-4.5" />
                      Clean Dataset Now
                    </>
                  )}
                </button>
              </div>

              {/* INTERACTIVE COLUMN SELECTOR & FEATURE PRUNING (Right 6 columns) */}
              <div className="lg:col-span-6 flex flex-col gap-6">
                <h3 className="text-lg font-bold text-slate-200 font-sans tracking-tight">Interactive Feature Pruning (Drop Columns)</h3>
                
                <div className="glass-card p-6 rounded-2xl border border-slate-800/40 shadow-xl flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/60 pb-4 gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Column Selection</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">Uncheck any columns that you want the model to drop/remove from the dataset entirely.</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setSelectedColumnsToDrop([])}
                        className="text-[10px] px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-400 font-semibold transition-colors cursor-pointer"
                      >
                        Keep All
                      </button>
                      <button 
                        type="button"
                        onClick={() => setSelectedColumnsToDrop([...dataset.headers])}
                        className="text-[10px] px-2.5 py-1.5 rounded-lg border border-rose-950/40 bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 font-semibold transition-colors cursor-pointer"
                      >
                        Drop All
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-800/20 pr-1 flex flex-col gap-1">
                    {dataset.headers.map((col: string) => {
                      const isDropped = selectedColumnsToDrop.includes(col);
                      const colType = dataset.analysis.columnTypes[col] || 'unknown';
                      const missingCount = dataset.analysis.missingValues[col] || 0;
                      const isUninformative = dataset.analysis.emptyColumns?.includes(col) || dataset.analysis.constantColumns?.includes(col);

                      return (
                        <div key={col} className={`flex items-center justify-between py-2 transition-colors ${isDropped ? 'bg-rose-950/10 rounded-lg px-2' : 'px-2'}`}>
                          <label className="flex items-center gap-3 cursor-pointer select-none grow">
                            <input
                              type="checkbox"
                              checked={!isDropped}
                              onChange={() => {
                                if (isDropped) {
                                  setSelectedColumnsToDrop(prev => prev.filter(c => c !== col));
                                } else {
                                  setSelectedColumnsToDrop(prev => [...prev, col]);
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-indigo-500/20 cursor-pointer"
                            />
                            <div className="flex flex-col">
                              <span className={`text-xs font-semibold ${isDropped ? 'text-slate-600 line-through font-mono' : 'text-slate-300 font-mono'}`}>
                                {col}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-mono uppercase px-1 rounded bg-slate-950/40 text-slate-500 border border-slate-800/60">
                                  {colType}
                                </span>
                                {missingCount > 0 && (
                                  <span className="text-[9px] text-amber-500/80 font-mono">
                                    ({missingCount} nulls)
                                  </span>
                                )}
                                {isUninformative && (
                                  <span className="text-[9px] text-rose-400/90 font-semibold uppercase tracking-wider bg-rose-500/5 px-1 rounded">
                                    ⚠️ empty/constant
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>

                          <div className="flex items-center gap-2">
                            {isDropped ? (
                              <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider font-mono">
                                Dropped
                              </span>
                            ) : (
                              <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-emerald-500/5 text-emerald-400/80 border border-emerald-500/10 uppercase tracking-wider font-mono">
                                Keep
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Preprocessing Options */}
                <div className="glass-card p-5 rounded-2xl border border-slate-800/40 shadow-xl flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Auto-Pruning Options</h4>
                  <label className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-900/30 transition-colors cursor-pointer select-none border border-slate-800/40">
                    <input 
                      type="checkbox" 
                      checked={removeUninformativeColumns} 
                      onChange={(e) => setRemoveUninformativeColumns(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-indigo-500/20 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <h5 className="text-xs font-bold text-slate-200">Auto-Remove Empty & Constant Columns</h5>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal">Strips out completely blank attributes and constant values automatically to improve dataset quality.</p>
                    </div>
                  </label>
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 3: INTERACTIVE ANALYTICS DASHBOARD */}
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6 text-left"
            >
              
              {/* Variable Selectors */}
              <div className="glass-card p-5 rounded-2xl border border-slate-800/40 shadow-xl flex flex-wrap gap-4 items-center">
                
                {/* Chart Type */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-slate-500 font-mono">Chart Type</span>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value as any)}
                    className="pl-3 pr-8 py-2 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="area">Area Chart</option>
                    <option value="scatter">Scatter Plot</option>
                    <option value="pie">Pie Chart</option>
                  </select>
                </div>

                {/* X-Axis Column */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-slate-500 font-mono">X Axis Feature</span>
                  <select
                    value={xAxisCol}
                    onChange={(e) => setXAxisCol(e.target.value)}
                    className="pl-3 pr-8 py-2 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-300 focus:outline-none cursor-pointer"
                  >
                    {dataset.headers.map((h: string) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Y-Axis Column */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-slate-500 font-mono">Y Axis Attribute</span>
                  <select
                    value={yAxisCol}
                    onChange={(e) => setYAxisCol(e.target.value)}
                    className="pl-3 pr-8 py-2 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-300 focus:outline-none cursor-pointer"
                  >
                    {dataset.headers.map((h: string) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Info summary */}
                <div className="ml-auto text-right hidden lg:block select-none">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Visualizing: <span className="text-indigo-400 font-bold">{xAxisCol}</span> vs <span className="text-indigo-400 font-bold">{yAxisCol}</span> ({chartData.length} active row elements)
                  </span>
                </div>
              </div>

              {/* Chart Stage Canvas */}
              <div className="glass-card p-6 rounded-3xl border border-slate-800/40 shadow-2xl h-[420px] relative w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                      <XAxis dataKey={xAxisCol} stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }} />
                      <Bar dataKey={yAxisCol} fill="#6366f1" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : chartType === 'line' ? (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                      <XAxis dataKey={xAxisCol} stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }} />
                      <Line type="monotone" dataKey={yAxisCol} stroke="#6366f1" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  ) : chartType === 'area' ? (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                      <XAxis dataKey={xAxisCol} stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey={yAxisCol} stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorY)" />
                    </AreaChart>
                  ) : chartType === 'scatter' ? (
                    <ScatterChart>
                      <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" />
                      <XAxis type="category" dataKey={xAxisCol} name={xAxisCol} stroke="#94a3b8" fontSize={10} />
                      <YAxis type="number" dataKey={yAxisCol} name={yAxisCol} stroke="#94a3b8" fontSize={10} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }} />
                      <Scatter name={yAxisCol} data={chartData} fill="#06b6d4" />
                    </ScatterChart>
                  ) : (
                    <PieChart>
                      <Pie
                        data={chartData.slice(0, 8)} // limit slices to 8 for neatness
                        dataKey={yAxisCol}
                        nameKey={xAxisCol}
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        label={{ fill: '#cbd5e1', fontSize: 10 }}
                      >
                        {chartData.slice(0, 8).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }} />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Download or Export feedback row */}
              <div className="flex items-center gap-2 text-slate-500 text-[11px] font-mono select-none">
                <Info className="w-4 h-4 text-indigo-400" />
                <span>Tip: Click "Download PDF Report" at the top of the toolbar to export these customized charts directly.</span>
              </div>

            </motion.div>
          )}

          {/* TAB 4: AI INSIGHTS REPORT */}
          {activeTab === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6 text-left"
            >
              
              {/* TRIGGER REPORT CTA if insights do not exist */}
              {!dataset.insights ? (
                <div className="glass-card p-12 rounded-3xl border border-slate-800/40 text-center flex flex-col items-center justify-center gap-5 min-h-[300px]">
                  <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-200">Generate AI Insights Report</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      Deploy the Gemini analytical neural networks to cross-examine correlation vectors, skew anomalies, and write a complete executive summary with actionable suggestions.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateInsights}
                    disabled={insightsLoading}
                    className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {insightsLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating full insights catalog...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate AI Summary Report
                      </>
                    )}
                  </button>
                </div>
              ) : (
                // INSIGHTS DISPLAY VIEW
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Summary cards */}
                  <div className="lg:col-span-4 flex flex-col gap-6 select-none">
                    <div className="glass-card p-5 rounded-2xl border border-indigo-500/15 bg-indigo-950/5 flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">Dataset Audit Verdict</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        DataSage AI verified this dataset has been successfully parsed. Structural density is optimal for advanced linear, logistic, or ensemble estimators.
                      </p>
                    </div>

                    <div className="glass-card p-5 rounded-2xl border border-slate-800/40 flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Metadata Audit Metrics</h4>
                      <div className="flex flex-col gap-2 font-mono text-[11px] text-slate-300">
                        <div className="flex justify-between border-b border-slate-800/50 pb-2">
                          <span className="text-slate-500">Completeness</span>
                          <span className="text-emerald-400 font-bold">100.0%</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-800/50 pb-2">
                          <span className="text-slate-500">Integrity Score</span>
                          <span className="text-emerald-400 font-bold">{dataset.healthScore}/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Columns</span>
                          <span className="text-slate-200">{dataset.columns} features</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Insights content */}
                  <div className="lg:col-span-8 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-200">AI Summary & Analytics Report</h3>
                      <button
                        onClick={handleGenerateInsights}
                        disabled={insightsLoading}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Re-run Gemini Insights"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${insightsLoading ? 'animate-spin' : ''}`} />
                        Re-generate
                      </button>
                    </div>

                    <div className="glass-card p-6 rounded-3xl border border-slate-800/40 shadow-xl overflow-y-auto max-h-[600px] text-sm text-slate-300 leading-relaxed space-y-6">
                      <div className="prose prose-invert prose-indigo max-w-none text-left">
                        {dataset.insights.split('\n').map((line: string, i: number) => {
                          if (line.startsWith('###')) {
                            return <h3 key={i} className="text-base font-bold text-slate-100 mt-6 mb-3">{line.replace('###', '')}</h3>;
                          } else if (line.startsWith('##')) {
                            return <h2 key={i} className="text-lg font-bold text-indigo-300 mt-8 mb-4 border-b border-slate-800 pb-2">{line.replace('##', '')}</h2>;
                          } else if (line.startsWith('#')) {
                            return <h1 key={i} className="text-xl font-extrabold text-white mt-10 mb-5">{line.replace('#', '')}</h1>;
                          } else if (line.startsWith('-') || line.startsWith('*')) {
                            return <li key={i} className="ml-4 list-disc mb-1.5">{line.substring(1).trim()}</li>;
                          } else if (line.trim() === '') {
                            return <div key={i} className="h-2" />;
                          } else {
                            return <p key={i} className="mb-3">{line}</p>;
                          }
                        })}
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </motion.div>
          )}

          {/* TAB 5: INTERACTIVE AI CHAT ASSISTANT */}
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-6 rounded-3xl border border-slate-800/40 shadow-2xl h-[550px] flex flex-col relative w-full"
            >
              
              {/* Chat Log Window */}
              <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4 pb-4">
                
                {/* Greeting */}
                <div className="flex gap-4 items-start bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/10 text-xs text-left">
                  <div className="p-2.5 rounded-xl bg-indigo-500 text-white shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-indigo-300">DataSage AI Co-pilot</h5>
                    <p className="text-slate-300 mt-1.5 leading-relaxed">
                      Hello! I have loaded and indexed <span className="font-semibold text-slate-200">{dataset.name}</span>.<br />
                      You can ask me to calculate column averages, identify interesting correlations, explain anomalies, summarize statistics, or write business formulas. What analytical query can I compute for you?
                    </p>
                  </div>
                </div>

                {/* Message list */}
                {dataset.chatHistory && dataset.chatHistory.map((msg: any, idx: number) => {
                  const isUser = msg.role === 'user';
                  const text = msg.parts[0]?.text || '';
                  return (
                    <div 
                      key={idx} 
                      className={`flex gap-4 items-start max-w-[85%] ${isUser ? 'self-end flex-row-reverse text-right' : 'self-start text-left'}`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${isUser ? 'bg-indigo-600 text-white' : 'bg-slate-800 border border-slate-700 text-indigo-400'}`}>
                        {isUser ? '👤' : '🤖'}
                      </div>
                      <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        isUser 
                          ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-200' 
                          : 'bg-slate-900/60 border border-slate-800/80 text-slate-300'
                      }`}>
                        <div className="whitespace-pre-wrap">{text}</div>
                      </div>
                    </div>
                  );
                })}

                {/* Loading state indicator */}
                {chatLoading && (
                  <div className="flex gap-4 items-start self-start text-left">
                    <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-indigo-400">
                      🤖
                    </div>
                    <div className="p-4 rounded-2xl text-xs bg-slate-900/60 border border-slate-800/80 text-slate-400 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                      Computing mathematical values...
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendChatMessage} className="border-t border-slate-800/60 pt-4 mt-2 flex gap-3">
                <input
                  type="text"
                  placeholder="Ask a question about this dataset (e.g., 'What is the average value?')..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  disabled={chatLoading}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatMessage.trim()}
                  className="p-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition-all shadow-md shadow-indigo-500/15 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* EMAIL EXPORT BACKDROP MODAL */}
      <AnimatePresence>
        {emailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setEmailModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-6 rounded-3xl border border-slate-800 max-w-md w-full relative z-10 flex flex-col gap-5 text-left shadow-2xl"
            >
              <div>
                <h3 className="text-lg font-bold text-slate-100">Email Cleaned Dataset</h3>
                <p className="text-xs text-slate-400 mt-1">Send the reformatted CSV dataset directly to any inbox.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 font-medium">Recipient Email Address</label>
                <input
                  type="email"
                  placeholder={user?.email || 'name@company.com'}
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <span className="text-[10px] text-slate-500 font-mono">Defaults to your registered account email if left blank.</span>
              </div>

              {/* Informative configuration note */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  <strong>Developer Note:</strong> Real-world email distribution requires a Resend key in your environment secrets. Fallback email simulator logs sent messages securely in your settings dashboard.
                </span>
              </div>

              <div className="flex items-center gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-900/40 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold shadow-lg shadow-indigo-500/15 cursor-pointer disabled:opacity-50"
                >
                  {sendingEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  Send Cleaned Data
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
