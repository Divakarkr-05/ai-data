import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Database, Search, Trash2, Eye, Download, History, RefreshCw 
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

interface HistoryPageProps {
  setActivePage: (page: any) => void;
  setSelectedDatasetId: (id: string | null) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ 
  setActivePage, 
  setSelectedDatasetId 
}) => {
  const { token, addToast } = useAuth();
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const res = await api.getDatasets();
      setDatasets(res.datasets);
    } catch (error: any) {
      addToast(error.message || 'Failed to retrieve dataset catalog.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"?`)) return;
    try {
      await api.deleteDataset(id);
      addToast('Dataset permanently removed from your storage workspace.', 'success');
      fetchDatasets();
    } catch (error: any) {
      addToast(error.message || 'Deletion failed.', 'error');
    }
  };

  const viewDataset = (id: string) => {
    setSelectedDatasetId(id);
    setActivePage('dataset');
  };

  const filteredDatasets = datasets.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 font-medium">Retrieving dataset catalog...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 text-left h-full">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-100 bg-clip-text text-transparent">
            Dataset History
          </h2>
          <p className="text-slate-400 text-sm mt-1">Revisit previously analyzed metrics or resume cleaning previous datasets.</p>
        </div>
        
        {/* Simple count summary */}
        <span className="text-xs text-slate-500 font-mono self-start sm:self-auto">
          Stored Space: {datasets.length} Active spread-items
        </span>
      </div>

      {/* SEARCH AND FILTER WORKSPACE */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
        <input
          type="text"
          placeholder="Filter previously uploaded spreadsheets by filename..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/20 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* DATASETS CATALOG GRID */}
      {filteredDatasets.length === 0 ? (
        <div className="glass-card py-20 px-6 rounded-3xl border border-slate-800/40 text-center flex flex-col items-center justify-center gap-4">
          <History className="w-12 h-12 text-slate-700 animate-pulse" />
          <div>
            <h4 className="font-bold text-slate-300">No matching datasets</h4>
            <p className="text-xs text-slate-500 mt-1">Upload files on our active upload dashboard to populate your timeline history.</p>
          </div>
          <button
            onClick={() => setActivePage('upload')}
            className="mt-2 text-xs font-semibold px-5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl hover:bg-indigo-500/20"
          >
            Upload spread item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDatasets.map((ds) => (
            <motion.div
              key={ds.id}
              whileHover={{ y: -4 }}
              className="glass-card p-6 rounded-2xl border border-slate-800/40 flex flex-col justify-between shadow-xl relative overflow-hidden group min-h-[220px]"
            >
              
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                    <Database className="w-5 h-5" />
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider font-mono ${
                    ds.status === 'cleaned'
                      ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                      : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                  }`}>
                    {ds.status === 'cleaned' ? 'Cleaned' : 'Raw'}
                  </span>
                </div>

                <div className="min-w-0">
                  <h4 
                    onClick={() => viewDataset(ds.id)}
                    className="font-bold text-base truncate text-slate-200 group-hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    {ds.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Uploaded {new Date(ds.uploadedAt).toLocaleDateString()} • {ds.fileSize}
                  </p>
                </div>
              </div>

              {/* Stats Block inside card */}
              <div className="grid grid-cols-3 gap-2 border-t border-b border-slate-800/60 py-3.5 my-4 text-left select-none">
                <div>
                  <span className="text-[9px] text-slate-500 font-mono uppercase font-semibold">Rows</span>
                  <p className="text-xs font-bold text-slate-200 font-mono mt-0.5">{ds.rows}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-mono uppercase font-semibold">Columns</span>
                  <p className="text-xs font-bold text-slate-200 font-mono mt-0.5">{ds.columns}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-mono uppercase font-semibold">Health</span>
                  <p className="text-xs font-bold text-emerald-400 font-mono mt-0.5">{ds.healthScore}</p>
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleDelete(ds.id, ds.name)}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Delete permanently"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href={`/api/datasets/${ds.id}/download?token=${token}`}
                    className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors inline-block cursor-pointer"
                    title="Download Spreadsheet"
                    download
                  >
                    <Download className="w-4.5 h-4.5" />
                  </a>
                  <button
                    onClick={() => viewDataset(ds.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 group-hover:border-indigo-500/40 text-slate-300 group-hover:text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>

            </motion.div>
          ))}
        </div>
      )}

    </div>
  );
};
