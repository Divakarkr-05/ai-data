import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Database, 
  UploadCloud, 
  Heart, 
  FileText, 
  Sparkles, 
  Search, 
  Trash2, 
  Eye, 
  Download, 
  Clock,
  ArrowUpDown,
  Filter,
  RefreshCw,
  Mail,
  ListFilter
} from 'lucide-react';
import { motion } from 'motion/react';

interface DatasetSummary {
  id: string;
  name: string;
  fileSize: string;
  uploadedAt: string;
  rows: number;
  columns: number;
  healthScore: number;
  status: 'analyzed' | 'cleaned';
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

interface DashboardPageProps {
  setActivePage: (page: any) => void;
  setSelectedDatasetId: (id: string | null) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ 
  setActivePage, 
  setSelectedDatasetId 
}) => {
  const { user, token, addToast } = useAuth();
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'analyzed' | 'cleaned'>('all');
  const [sortField, setSortField] = useState<'name' | 'uploadedAt' | 'healthScore' | 'rows'>('uploadedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const dsRes = await api.getDatasets();
      setDatasets(dsRes.datasets);
      const actRes = await api.getActivities();
      setActivities(actRes.activities.slice(0, 5)); // show top 5 recent activities
    } catch (error: any) {
      addToast(error.message || 'Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.deleteDataset(id);
      addToast(`Dataset deleted successfully.`, 'success');
      fetchDashboardData();
    } catch (error: any) {
      addToast(error.message || 'Failed to delete dataset.', 'error');
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Metrics
  const totalUploaded = datasets.length;
  const totalCleaned = datasets.filter(d => d.status === 'cleaned').length;
  const reportsGenerated = datasets.filter(d => d.status === 'cleaned').length; // Mock report generated count
  
  // Storage Calculation
  const totalSizeMB = datasets.reduce((acc, d) => {
    const rawVal = d.fileSize.toLowerCase();
    const size = parseFloat(rawVal);
    if (rawVal.includes('kb')) return acc + size / 1024;
    if (rawVal.includes('mb')) return acc + size;
    return acc + size / (1024 * 1024); // assuming bytes
  }, 0);
  const formattedStorage = totalSizeMB > 1 ? `${totalSizeMB.toFixed(2)} MB` : `${(totalSizeMB * 1024).toFixed(1)} KB`;

  // Health Score Average
  const averageHealth = datasets.length > 0
    ? Math.round(datasets.reduce((acc, d) => acc + d.healthScore, 0) / datasets.length)
    : 100;

  // Filter and Sort dataset list
  const filteredDatasets = datasets
    .filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortField === 'uploadedAt') comparison = a.uploadedAt.localeCompare(b.uploadedAt);
      else if (sortField === 'healthScore') comparison = a.healthScore - b.healthScore;
      else if (sortField === 'rows') comparison = a.rows - b.rows;

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const viewDataset = (id: string) => {
    setSelectedDatasetId(id);
    setActivePage('dataset');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 font-medium">Analyzing dashboard metrics...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 text-left h-full">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-100 bg-clip-text text-transparent">
            Welcome, {user?.name || 'Sager'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">Here is a snapshot of your datasets and analysis timeline.</p>
        </div>
        <button
          onClick={() => setActivePage('upload')}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm transition-all cursor-pointer shadow-lg shadow-indigo-500/20 max-w-xs shrink-0 self-start"
        >
          <UploadCloud className="w-4 h-4" />
          Upload Dataset
        </button>
      </div>

      {/* METRIC Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Uploaded */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between border border-slate-800/40 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Uploaded</span>
            <Database className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-100">{totalUploaded}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Stored datasets</p>
          </div>
        </div>

        {/* Cleaned */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between border border-slate-800/40 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Cleaned</span>
            <Sparkles className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-100">{totalCleaned}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Formated successfully</p>
          </div>
        </div>

        {/* Reports */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between border border-slate-800/40 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Reports</span>
            <FileText className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-100">{reportsGenerated}</h3>
            <p className="text-[10px] text-slate-500 mt-1">AI-crawled audits</p>
          </div>
        </div>

        {/* Storage */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between border border-slate-800/40 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Storage</span>
            <Database className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-100">{formattedStorage}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Total database space used</p>
          </div>
        </div>

        {/* Health */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between border border-slate-800/40 relative overflow-hidden group col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Avg Health</span>
            <Heart className={`w-5 h-5 group-hover:scale-110 transition-transform ${averageHealth > 80 ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1">
              <h3 className="text-3xl font-extrabold text-slate-100">{averageHealth}</h3>
              <span className="text-xs text-slate-500 font-semibold">/100</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Quality index average</p>
          </div>
        </div>

      </div>

      {/* RECENT UPLOADS TABLE & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* TABLE BLOCK (Left 8 columns) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-200">Recent Uploads</h3>
            
            {/* Simple stats indicator */}
            <span className="text-xs text-slate-500 font-mono">
              Showing {filteredDatasets.length} of {datasets.length} files
            </span>
          </div>

          {/* Filtering, Search & Sorting Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/20 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto self-stretch">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap hidden sm:inline">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="flex-1 sm:flex-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Datasets</option>
                <option value="analyzed">Analyzed Only</option>
                <option value="cleaned">Cleaned Only</option>
              </select>
            </div>
          </div>

          {/* Actual Grid Table */}
          <div className="glass-card rounded-2xl border border-slate-800/40 overflow-hidden shadow-xl">
            {filteredDatasets.length === 0 ? (
              // Empty State inside Table
              <div className="py-16 px-6 flex flex-col items-center justify-center text-center gap-4">
                <Database className="w-12 h-12 text-slate-700 animate-pulse" />
                <div>
                  <h4 className="font-bold text-slate-300">No datasets found</h4>
                  <p className="text-xs text-slate-500 mt-1">Upload a CSV or Excel dataset to begin your analysis.</p>
                </div>
                <button
                  onClick={() => setActivePage('upload')}
                  className="mt-2 text-xs font-semibold px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg hover:bg-indigo-500/20"
                >
                  Upload first dataset
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-900/30">
                      <th className="p-4 text-xs font-semibold text-slate-400 font-mono select-none cursor-pointer" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1.5 hover:text-slate-200 transition-colors">
                          Dataset Name
                          <ArrowUpDown className="w-3 h-3 text-slate-500" />
                        </div>
                      </th>
                      <th className="p-4 text-xs font-semibold text-slate-400 font-mono select-none cursor-pointer" onClick={() => handleSort('rows')}>
                        <div className="flex items-center gap-1.5 hover:text-slate-200 transition-colors">
                          Rows / Cols
                          <ArrowUpDown className="w-3 h-3 text-slate-500" />
                        </div>
                      </th>
                      <th className="p-4 text-xs font-semibold text-slate-400 font-mono select-none cursor-pointer" onClick={() => handleSort('healthScore')}>
                        <div className="flex items-center gap-1.5 hover:text-slate-200 transition-colors">
                          Health
                          <ArrowUpDown className="w-3 h-3 text-slate-500" />
                        </div>
                      </th>
                      <th className="p-4 text-xs font-semibold text-slate-400 font-mono">Status</th>
                      <th className="p-4 text-xs font-semibold text-slate-400 font-mono text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {filteredDatasets.map((dataset) => (
                      <tr 
                        key={dataset.id}
                        className="hover:bg-slate-900/20 transition-all group"
                      >
                        <td className="p-4">
                          <div className="flex flex-col min-w-0 max-w-xs md:max-w-sm">
                            <span className="font-semibold text-sm truncate text-slate-200 group-hover:text-indigo-300 transition-colors cursor-pointer" onClick={() => viewDataset(dataset.id)}>
                              {dataset.name}
                            </span>
                            <span className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              {dataset.fileSize} • Uploaded {new Date(dataset.uploadedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300 font-mono text-xs">
                          {dataset.rows} rows × {dataset.columns} cols
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-11 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  dataset.healthScore > 85 
                                    ? 'bg-emerald-500' 
                                    : dataset.healthScore > 60 
                                    ? 'bg-amber-500' 
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${dataset.healthScore}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-200 font-mono">{dataset.healthScore}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider font-mono ${
                            dataset.status === 'cleaned'
                              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                              : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                          }`}>
                            {dataset.status === 'cleaned' ? 'Cleaned' : 'Raw'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => viewDataset(dataset.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                              title="View & Analyze"
                            >
                              <Eye className="w-4.5 h-4.5" />
                            </button>
                            <a
                              href={`/api/datasets/${dataset.id}/download?token=${token}`}
                              className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors inline-block"
                              title="Download clean CSV"
                              download
                            >
                              <Download className="w-4.5 h-4.5" />
                            </a>
                            <button
                              onClick={() => handleDelete(dataset.id, dataset.name)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete dataset"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RECENT ACTIVITY TIMELINE (Right 4 columns) */}
        <div className="lg:col-span-4 flex flex-col gap-4 text-left">
          <h3 className="text-lg font-bold text-slate-200">Recent Activity</h3>
          
          <div className="glass-card p-5 rounded-2xl border border-slate-800/40 flex flex-col gap-5 shadow-xl relative min-h-[300px]">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center gap-3 my-auto text-slate-500">
                <Clock className="w-8 h-8 opacity-40 animate-pulse" />
                <p className="text-xs">No recent actions logged yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
                {activities.map((act) => (
                  <div key={act.id} className="flex gap-4 relative z-10 group">
                    <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700/60 flex items-center justify-center text-slate-400 text-[10px] font-bold group-hover:border-indigo-500/60 transition-colors">
                      {act.type === 'auth' ? '🔐' : act.type === 'dataset_upload' ? '📂' : act.type === 'dataset_clean' ? '✨' : '📧'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 leading-relaxed font-medium">{act.description}</p>
                      <span className="text-[9px] text-slate-500 font-mono mt-1 block">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
