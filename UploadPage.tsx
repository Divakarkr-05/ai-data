import React, { useState, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  UploadCloud, 
  FileText, 
  Database, 
  Trash2, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UploadPageProps {
  setActivePage: (page: any) => void;
  setSelectedDatasetId: (id: string | null) => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ 
  setActivePage, 
  setSelectedDatasetId 
}) => {
  const { addToast } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [autoClean, setAutoClean] = useState(true);
  const [parsedPreview, setParsedPreview] = useState<{ headers: string[]; rows: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  // Validation
  const validateAndProcessFile = (selectedFile: File) => {
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    
    // Check extension
    if (extension !== 'csv' && extension !== 'xlsx') {
      addToast('Invalid file format. Only CSV and XLSX spreadsheets are accepted.', 'error');
      return;
    }

    // Check size (50MB Limit)
    const maxSizeInBytes = 50 * 1024 * 1024;
    if (selectedFile.size > maxSizeInBytes) {
      addToast('File too large. Maximum acceptable file size is 50 MB.', 'error');
      return;
    }

    setFile(selectedFile);
    addToast(`Loaded: ${selectedFile.name}`, 'info');

    // Parse the preview client-side to display immediately!
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        // Basic parser for quick preview
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.replace(/["']/g, '').trim());
          const rows = lines.slice(1, 11).map(line => {
            const cells = line.split(',');
            const rowObj: any = {};
            headers.forEach((h, index) => {
              rowObj[h] = cells[index]?.replace(/["']/g, '').trim() || '';
            });
            return rowObj;
          });
          setParsedPreview({ headers, rows });
        }
      } catch (err) {
        console.error("Client preview parsing failed", err);
      }
    };
    reader.readAsText(selectedFile);
  };

  const clearFile = () => {
    setFile(null);
    setParsedPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadSubmit = async () => {
    if (!file) return;
    setUploading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Content = e.target?.result as string;
        
        // Post base64 content of Excel/CSV to server for complete server-side parsing, database registration, and stats analysis
        const res = await api.uploadDataset(file.name, base64Content, autoClean);
        
        addToast(
          autoClean 
            ? 'Dataset successfully uploaded and auto-cleaned with AI preprocessors!' 
            : 'Dataset successfully uploaded and analyzed!', 
          'success'
        );
        setSelectedDatasetId(res.dataset.id);
        setActivePage('dataset');
      } catch (error: any) {
        addToast(error.message || 'Failed to upload and parse dataset.', 'error');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerInputClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-8 text-left h-full">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-100 bg-clip-text text-transparent">
          Upload Dataset
        </h2>
        <p className="text-slate-400 text-sm mt-1">Upload your messy spreadsheets and let our AI handle cleaning and analytics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* DRAG AND DROP ZONE (Left 7 columns or full) */}
        <div className={`flex flex-col gap-6 ${file ? 'lg:col-span-6' : 'lg:col-span-12'}`}>
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`glass-card p-12 rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center text-center gap-5 cursor-pointer min-h-[350px] relative overflow-hidden group select-none ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-500/5' 
                : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/10'
            }`}
            onClick={triggerInputClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Glowing inner effect */}
            <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md group-hover:scale-110 transition-all duration-300">
              <UploadCloud className="w-8 h-8 text-indigo-400" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-200">Drag and drop your spreadsheet here</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-sm">
                Supports CSV or XLSX Excel spreadsheets.<br />
                Maximum acceptable file size is <span className="font-semibold text-slate-400">50 MB</span>.
              </p>
            </div>

            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              Browse Files
            </button>
          </div>
        </div>

        {/* SELECTED FILE METRICS & PREVIEW (Right 6 columns, only shown when file selected) */}
        <AnimatePresence>
          {file && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-6 flex flex-col gap-6"
            >
              {/* File Info Card */}
              <div className="glass-card p-6 rounded-2xl border border-slate-800/40 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 truncate max-w-[200px] md:max-w-xs">{file.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.name.split('.').pop()?.toUpperCase()} Spreadsheet
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Rows preview */}
              {parsedPreview && (
                <div className="glass-card p-5 rounded-2xl border border-slate-800/40 shadow-xl flex flex-col gap-4 text-left">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Row Preview (First 5 Rows)</h4>
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Format Verified
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-800/40 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse divide-y divide-slate-800/40">
                      <thead className="bg-slate-900/60 font-mono text-slate-400">
                        <tr>
                          {parsedPreview.headers.slice(0, 4).map((h, i) => (
                            <th key={i} className="p-3 truncate max-w-[120px]">{h}</th>
                          ))}
                          {parsedPreview.headers.length > 4 && <th className="p-3 text-slate-500">+{parsedPreview.headers.length - 4} more</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/20 text-slate-300">
                        {parsedPreview.rows.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/10">
                            {parsedPreview.headers.slice(0, 4).map((h, i) => (
                              <td key={i} className="p-3 truncate max-w-[120px]">{row[h] || '-'}</td>
                            ))}
                            {parsedPreview.headers.length > 4 && <td className="p-3 text-slate-500">...</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Auto Clean Toggle Card */}
              <div className="glass-card p-5 rounded-2xl border border-white/5 shadow-xl bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors">
                <label className="flex items-start gap-4 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={autoClean} 
                    onChange={(e) => setAutoClean(e.target.checked)}
                    className="w-5 h-5 rounded border-white/10 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/20 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200">Auto-clean dataset with AI preprocessors</h4>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                      Removes duplicates, standardizes numeric/date columns, handles blank/missing values, and winsorizes outliers instantly.
                    </p>
                  </div>
                </label>
              </div>

              {/* Upload CTA Button */}
              <button
                onClick={handleUploadSubmit}
                disabled={uploading}
                className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:opacity-95 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing statistical health metrics...
                  </>
                ) : (
                  <>
                    Proceed to Dataset Analysis
                    <ArrowRight className="w-4.5 h-4.5" />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};
