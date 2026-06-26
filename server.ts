import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from '@google/genai';
import { DBStore, User, Dataset, EmailLog, ActivityLog } from './src/db/store';
import { analyzeDataset, cleanDataset, isNumeric } from './src/lib/dataEngine';

const app = express();
const PORT = 3000;

// Use high limits for large dataset uploads (up to 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Helper: Lazy initialization of Gemini client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please add your Gemini API Key in the Settings -> Secrets panel.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Helper function to upload cleaned CSV to Supabase Storage if credentials exist
async function uploadToSupabaseStorage(datasetId: string, datasetName: string, cleanedData: any[]): Promise<string> {
  const worksheet = XLSX.utils.json_to_sheet(cleanedData);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
  const filename = `${datasetId}_cleaned.csv`;

  const supabaseUrlEnv = process.env.SUPABASE_URL;
  const supabaseAnonKeyEnv = process.env.SUPABASE_ANON_KEY;

  if (supabaseUrlEnv && supabaseAnonKeyEnv) {
    try {
      const cleanUrl = supabaseUrlEnv.replace(/\/$/, "");
      const uploadUrl = `${cleanUrl}/storage/v1/object/cleaned-datasets/${filename}`;
      
      console.log(`Uploading cleaned CSV to Supabase Storage: ${uploadUrl}`);
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKeyEnv}`,
          'Content-Type': 'text/csv',
          'x-upsert': 'true'
        },
        body: csvContent
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Supabase Storage upload failed with status ${response.status}:`, errText);
      } else {
        console.log(`Successfully uploaded cleaned CSV to Supabase Storage for dataset ${datasetId}`);
        return `${cleanUrl}/storage/v1/object/public/cleaned-datasets/${filename}`;
      }
    } catch (err) {
      console.error("Error occurred while uploading to Supabase Storage:", err);
    }
  }

  // Fallback calculated URL format
  const baseDomain = supabaseUrlEnv ? supabaseUrlEnv.replace(/\/$/, "") : "https://datasage-storage.supabase.co";
  return `${baseDomain}/storage/v1/object/public/cleaned-datasets/${filename}`;
}

// Middleware: Authenticate Request via Bearer Token (userId) or token query parameter
function authenticateUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  let userId: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    userId = authHeader.split(' ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    userId = req.query.token;
  }

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized access. Missing or invalid authentication token." });
  }

  const user = DBStore.findUserById(userId);
  if (!user) {
    return res.status(401).json({ error: "User session expired or user not found." });
  }
  // Attach user to request
  (req as any).user = user;
  next();
}

// ==========================================
// 🔐 AUTHENTICATION ENDPOINTS
// ==========================================

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Full Name, Email, and Password are required." });
    }
    const existing = DBStore.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "A user with this email already exists." });
    }

    // In a real app we'd use bcrypt, but for our Hackathon MVP a standard hash or simple token is sufficient
    const passwordHash = `hash_${password}`;
    const user = DBStore.createUser({ id: Math.random().toString(36).substring(2, 11), name, email, passwordHash });
    
    DBStore.logActivity({
      userId: user.id,
      type: 'auth',
      description: `New user account registered: ${name} (${email})`
    });

    res.json({ success: true, token: user.id, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const user = DBStore.findUserByEmail(email);
    if (!user || user.passwordHash !== `hash_${password}`) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Update last login
    DBStore.updateUser(user.id, { lastLogin: new Date().toISOString() });

    DBStore.logActivity({
      userId: user.id,
      type: 'auth',
      description: `User successfully logged in: ${user.name}`
    });

    res.json({ success: true, token: user.id, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get profile
app.get('/api/auth/me', authenticateUser, (req, res) => {
  res.json({ user: (req as any).user });
});

// Update profile
app.put('/api/auth/profile', authenticateUser, (req, res) => {
  try {
    const user = (req as any).user;
    const { name, avatarUrl } = req.body;
    const updates: any = {};
    if (name) updates.name = name;
    if (avatarUrl) updates.avatarUrl = avatarUrl;

    const updated = DBStore.updateUser(user.id, updates);
    DBStore.logActivity({
      userId: user.id,
      type: 'profile',
      description: `User updated profile information.`
    });
    res.json({ success: true, user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Change Password
app.put('/api/auth/password', authenticateUser, (req, res) => {
  try {
    const user = (req as any).user;
    const { currentPassword, newPassword } = req.body;
    
    if (user.passwordHash !== `hash_${currentPassword}`) {
      return res.status(400).json({ error: "Current password does not match." });
    }

    DBStore.updateUserPassword(user.id, `hash_${newPassword}`);
    DBStore.logActivity({
      userId: user.id,
      type: 'profile',
      description: `User successfully updated password.`
    });
    res.json({ success: true, message: "Password updated successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Account
app.delete('/api/auth/delete', authenticateUser, (req, res) => {
  try {
    const user = (req as any).user;
    DBStore.deleteUser(user.id);
    res.json({ success: true, message: "Account and all associated datasets deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 📊 DATASETS & FILE OPERATIONS
// ==========================================

// Helper: Format File Size
function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Upload Dataset
app.post('/api/datasets/upload', authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, content, autoClean = true } = req.body; // Base64 content or text content

    if (!name || !content) {
      return res.status(400).json({ error: "Dataset name and content are required." });
    }

    // Parse CSV / XLSX file on server using open source xlsx sheet parser
    let workbook: XLSX.WorkBook;
    let sizeBytes = 0;

    if (content.startsWith('data:') && content.includes(';base64,')) {
      const base64 = content.split(';base64,')[1];
      const buffer = Buffer.from(base64, 'base64');
      sizeBytes = buffer.length;
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } else {
      // Raw string content (CSV)
      sizeBytes = Buffer.byteLength(content, 'utf8');
      workbook = XLSX.read(content, { type: 'string' });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Convert to JSON array of objects
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (rawRows.length === 0) {
      return res.status(400).json({ error: "The uploaded file is empty." });
    }

    // Get Headers from keys
    const headers = Object.keys(rawRows[0]);
    const fileSizeStr = formatBytes(sizeBytes);

    // Conduct statistical analysis of the dataset
    const analysis = analyzeDataset(headers, rawRows, fileSizeStr);

    const dataset = DBStore.createDataset({
      id: Math.random().toString(36).substring(2, 11),
      userId: user.id,
      name,
      fileSize: fileSizeStr,
      rows: rawRows.length,
      columns: headers.length,
      headers,
      originalData: rawRows,
      cleanedData: JSON.parse(JSON.stringify(rawRows)), // duplicate initially
      healthScore: analysis.healthScore,
      analysis
    });

    let finalDataset = dataset;
    if (autoClean) {
      const cleanResult = cleanDataset(dataset, {
        removeDuplicates: true,
        handleMissing: true,
        handleOutliers: true,
        normalizeNumeric: false,
        standardizeFormats: true,
        removeUninformativeColumns: true
      });
      // Re-run statistical analysis on the cleaned data to update analysis counters
      const cleanedAnalysis = analyzeDataset(cleanResult.cleanedHeaders, cleanResult.cleanedData, fileSizeStr);
      const supabaseUrl = await uploadToSupabaseStorage(dataset.id, dataset.name, cleanResult.cleanedData);
      finalDataset = DBStore.updateDataset(dataset.id, user.id, {
        cleanedData: cleanResult.cleanedData,
        cleaningReport: cleanResult.cleaningReport,
        healthScore: cleanedAnalysis.healthScore,
        analysis: cleanedAnalysis,
        status: 'cleaned',
        supabaseUrl,
        cleanedHeaders: cleanResult.cleanedHeaders,
        removedColumns: cleanResult.removedColumns
      }) || dataset;
    }

    DBStore.logActivity({
      userId: user.id,
      type: 'dataset_upload',
      description: autoClean 
        ? `Uploaded and automatically cleaned dataset: ${name} (${rawRows.length} rows, ${headers.length} columns). New health score: ${finalDataset.healthScore}/100`
        : `Uploaded and analyzed dataset: ${name} (${rawRows.length} rows, ${headers.length} columns)`
    });

    res.json({ success: true, dataset: finalDataset });
  } catch (error: any) {
    console.error("Dataset upload error: ", error);
    res.status(500).json({ error: `File Parsing Error: ${error.message}` });
  }
});

// List all datasets
app.get('/api/datasets', authenticateUser, (req, res) => {
  try {
    const user = (req as any).user;
    const datasets = DBStore.getDatasets(user.id);
    // Strip heavy row-data for high-speed listing
    const lightDatasets = datasets.map(d => ({
      id: d.id,
      name: d.name,
      fileSize: d.fileSize,
      uploadedAt: d.uploadedAt,
      rows: d.rows,
      columns: d.columns,
      headers: d.headers,
      healthScore: d.healthScore,
      status: d.status,
      analysis: {
        rowCount: d.analysis.rowCount,
        colCount: d.analysis.colCount,
        healthScore: d.analysis.healthScore,
        duplicateRows: d.analysis.duplicateRows,
        columnTypes: d.analysis.columnTypes
      }
    }));
    res.json({ datasets: lightDatasets });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single dataset
app.get('/api/datasets/:id', authenticateUser, (req, res) => {
  try {
    const user = (req as any).user;
    const dataset = DBStore.findDatasetById(req.params.id, user.id);
    if (!dataset) {
      return res.status(404).json({ error: "Dataset not found or does not belong to you." });
    }
    res.json({ dataset });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clean Dataset
app.post('/api/datasets/:id/clean', authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const dataset = DBStore.findDatasetById(req.params.id, user.id);
    if (!dataset) {
      return res.status(404).json({ error: "Dataset not found." });
    }

    const {
      removeDuplicates = true,
      handleMissing = true,
      handleOutliers = true,
      normalizeNumeric = false,
      standardizeFormats = true,
      removeUninformativeColumns = false,
      columnsToRemove = []
    } = req.body;

    const result = cleanDataset(dataset, {
      removeDuplicates,
      handleMissing,
      handleOutliers,
      normalizeNumeric,
      standardizeFormats,
      removeUninformativeColumns,
      columnsToRemove
    });

    // Re-run statistical analysis on the cleaned data to update analysis counters
    const cleanedAnalysis = analyzeDataset(result.cleanedHeaders, result.cleanedData, dataset.fileSize);
    const supabaseUrl = await uploadToSupabaseStorage(dataset.id, dataset.name, result.cleanedData);

    const updated = DBStore.updateDataset(dataset.id, user.id, {
      cleanedData: result.cleanedData,
      cleaningReport: result.cleaningReport,
      healthScore: cleanedAnalysis.healthScore,
      analysis: cleanedAnalysis,
      status: 'cleaned',
      supabaseUrl,
      cleanedHeaders: result.cleanedHeaders,
      removedColumns: result.removedColumns
    });

    DBStore.logActivity({
      userId: user.id,
      type: 'dataset_clean',
      description: `Cleaned dataset: ${dataset.name}. New health score: ${result.healthScore}/100`
    });

    res.json({ success: true, dataset: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Download cleaned dataset as CSV
app.get('/api/datasets/:id/download', authenticateUser, (req, res) => {
  try {
    const user = (req as any).user;
    const dataset = DBStore.findDatasetById(req.params.id, user.id);
    if (!dataset) {
      return res.status(404).json({ error: "Dataset not found." });
    }

    const isOriginal = req.query.original === 'true';
    const targetData = isOriginal ? dataset.originalData : dataset.cleanedData;

    // Convert data to CSV string
    const worksheet = XLSX.utils.json_to_sheet(targetData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);

    const suffix = isOriginal ? '_original.csv' : '_cleaned.csv';
    const cleanFilename = dataset.name.replace(/\.[^/.]+$/, "") + suffix;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
    res.status(200).send(csvContent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Dataset
app.delete('/api/datasets/:id', authenticateUser, (req, res) => {
  try {
    const user = (req as any).user;
    const deleted = DBStore.deleteDataset(req.params.id, user.id);
    if (!deleted) {
      return res.status(404).json({ error: "Dataset not found." });
    }

    DBStore.logActivity({
      userId: user.id,
      type: 'dataset_delete',
      description: `Deleted dataset ID: ${req.params.id}`
    });

    res.json({ success: true, message: "Dataset deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 🧠 GEMINI API INTEGRATIONS
// ==========================================

// Generate AI Insights
app.post('/api/datasets/:id/insights', authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const dataset = DBStore.findDatasetById(req.params.id, user.id);
    if (!dataset) {
      return res.status(404).json({ error: "Dataset not found." });
    }

    // Prepare metadata summary to keep prompt lightweight yet statistically rich
    const summaryStats = Object.entries(dataset.analysis.summaryStats).map(([col, stats]: any) => {
      if (dataset.analysis.columnTypes[col] === 'numeric') {
        return `Column [${col}] (Numeric): Min=${stats.min}, Max=${stats.max}, Mean=${stats.mean}, Median=${stats.median}, Outliers=${dataset.analysis.outliers[col] ?? 0}`;
      } else {
        return `Column [${col}] (Categorical): UniqueValues=${stats.uniqueCount}, MostFrequent='${stats.mostFrequent}'`;
      }
    }).join('\n');

    const topCorrelations = dataset.analysis.correlations
      .sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))
      .slice(0, 5)
      .map(c => `[${c.col1}] and [${c.col2}] correlation coefficient = ${c.coefficient}`)
      .join('\n');

    const sampleRows = JSON.stringify(dataset.originalData.slice(0, 3), null, 2);

    const prompt = `You are DataSage AI, an elite AI data scientist and data consultant. Your job is to analyze the statistical summary of a dataset and deliver brilliant, action-oriented business and technical insights.

Dataset Metadata:
- Name: ${dataset.name}
- Total Rows: ${dataset.rows}
- Total Columns: ${dataset.columns}
- Health Score: ${dataset.healthScore}/100

Column Statistics:
${summaryStats}

Top Correlations:
${topCorrelations || 'None detected.'}

Sample Rows (first 3):
${sampleRows}

Provide a comprehensive analysis report with the following 5 distinct sections in clean Markdown format:
1. ### Dataset Executive Summary
   Provide a high-level summary of the dataset, its overall quality, and what it represents.
2. ### Data Quality & Integrity Audit
   Highlight any major data issues detected (missing values, skewed cols, duplicates, outliers) and what their statistical impact is.
3. ### Key Analytical Insights & Correlational Discoveries
   Explain interesting relational findings, high correlations, or underlying statistical patterns.
4. ### Strategic Recommendations & Business Applications
   Detail 3 concrete, realistic business decisions, strategies, or opportunities that can be launched based on this data.
5. ### Suggested Advanced Analytics & Next Steps
   Suggest what machine learning models, modeling techniques, or further data collections would benefit this project.

Write directly, professionally, and in depth. Do not include boring metadata lists.`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const insights = response.text || "No insights could be generated at this moment.";
    
    // Save to DB
    DBStore.updateDataset(dataset.id, user.id, { insights });

    DBStore.logActivity({
      userId: user.id,
      type: 'dataset_insights',
      description: `Generated comprehensive AI Insights Report for dataset: ${dataset.name}`
    });

    res.json({ success: true, insights });
  } catch (error: any) {
    console.error("Gemini insights error:", error);
    res.status(500).json({ error: `AI Generation Error: ${error.message}` });
  }
});

// Chat with Dataset Assistant
app.post('/api/datasets/:id/chat', authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const dataset = DBStore.findDatasetById(req.params.id, user.id);
    if (!dataset) {
      return res.status(404).json({ error: "Dataset not found." });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    // Build the stats context for Gemini
    const summaryStats = Object.entries(dataset.analysis.summaryStats).map(([col, stats]: any) => {
      if (dataset.analysis.columnTypes[col] === 'numeric') {
        return `Column [${col}]: Type=Numeric, Min=${stats.min}, Max=${stats.max}, Mean=${stats.mean}, Median=${stats.median}, OutliersCount=${dataset.analysis.outliers[col]}`;
      } else {
        return `Column [${col}]: Type=Categorical, UniqueVals=${stats.uniqueCount}, Mode='${stats.mostFrequent}'`;
      }
    }).join('\n');

    // Retrieve active chat history
    const history = dataset.chatHistory || [];

    // System instruction to guide the conversation based on the dataset
    const systemInstruction = `You are DataSage Assistant, a friendly, professional AI co-pilot who has complete statistical access to the dataset '${dataset.name}'.
The dataset has ${dataset.rows} rows and ${dataset.columns} columns.
Below is the statistical summary of the dataset:
${summaryStats}

Instructions:
1. Always base your calculations, assertions, or charts suggestions on the statistics and variables provided.
2. If the user asks for averages, counts, unique values, or correlations, reference the stats.
3. If they ask a complex query requiring full row computation (like "Show me the row where age is max"), compute using the stats or explain how they can calculate it.
4. Keep your responses concise, visually beautiful with bolding, and highly analytical. Give short and direct answers. No fluff!`;

    // Initialize Gemini Chat
    const ai = getGeminiClient();
    
    // Compile full chat session contents including history
    const contents: any[] = [];
    for (const chatMsg of history) {
      contents.push({
        role: chatMsg.role,
        parts: chatMsg.parts
      });
    }
    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction
      }
    });

    const reply = response.text || "I was unable to process that analytical query.";

    // Append to Chat History in DB
    const updatedHistory = [
      ...history,
      { role: 'user' as const, parts: [{ text: message }], timestamp: new Date().toISOString() },
      { role: 'model' as const, parts: [{ text: reply }], timestamp: new Date().toISOString() }
    ];

    DBStore.updateDataset(dataset.id, user.id, { chatHistory: updatedHistory });

    res.json({ success: true, reply, chatHistory: updatedHistory });
  } catch (error: any) {
    console.error("Gemini chat error:", error);
    res.status(500).json({ error: `AI Chat Error: ${error.message}` });
  }
});

// Chat with Global DataSage Copilot
app.post('/api/copilot/chat', authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { message, datasetId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const history = user.copilotChatHistory || [];

    let datasetContext = "";
    if (datasetId) {
      const dataset = DBStore.findDatasetById(datasetId, user.id);
      if (dataset) {
        const summaryStats = Object.entries(dataset.analysis.summaryStats).map(([col, stats]: any) => {
          if (dataset.analysis.columnTypes[col] === 'numeric') {
            return `Column [${col}]: Type=Numeric, Min=${stats.min}, Max=${stats.max}, Mean=${stats.mean}, Median=${stats.median}, OutliersCount=${dataset.analysis.outliers[col]}`;
          } else {
            return `Column [${col}]: Type=Categorical, UniqueVals=${stats.uniqueCount}, Mode='${stats.mostFrequent}'`;
          }
        }).join('\n');
        datasetContext = `The user has currently selected their dataset named "${dataset.name}" as context for this chat session. This dataset contains ${dataset.rows} rows and ${dataset.columns} columns.
Below is the statistical summary of the selected dataset:
${summaryStats}

Keep this dataset in mind, and help answer the user's questions about it. Direct your analysis, code tips, and visualizations to this specific dataset when appropriate.`;
      }
    }

    const systemInstruction = `You are DataSage Copilot, an elite AI companion and professional data scientist. You have complete knowledge of data pre-processing, feature engineering, machine learning pipelines, and statistics.
    
${datasetContext}

Instructions:
1. Provide highly analytical, smart, and business-focused recommendations.
2. If asked about a selected dataset, use the stats to make precise assertions.
3. Keep answers compact, structured using Markdown, utilizing bolding and code blocks. Answer the question directly with zero fluff.`;

    const ai = getGeminiClient();
    const contents: any[] = [];
    for (const chatMsg of history) {
      contents.push({
        role: chatMsg.role,
        parts: chatMsg.parts
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction
      }
    });

    const reply = response.text || "I'm sorry, I could not generate a reply at this time.";

    const updatedHistory = [
      ...history,
      { role: 'user' as const, parts: [{ text: message }], timestamp: new Date().toISOString() },
      { role: 'model' as const, parts: [{ text: reply }], timestamp: new Date().toISOString() }
    ];

    DBStore.updateUser(user.id, { copilotChatHistory: updatedHistory });

    res.json({ success: true, reply, chatHistory: updatedHistory });
  } catch (error: any) {
    console.error("Copilot chat error:", error);
    res.status(500).json({ error: `Copilot Chat Error: ${error.message}` });
  }
});

// Clear Copilot Chat History
app.post('/api/copilot/chat/clear', authenticateUser, (req, res) => {
  try {
    const user = (req as any).user;
    const updated = DBStore.clearCopilotChatHistory(user.id);
    res.json({ success: true, user: updated, message: "Chat history cleared successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 📧 EMAIL & EXPORTS
// ==========================================

// Email Cleaned Dataset
app.post('/api/datasets/:id/email', authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const dataset = DBStore.findDatasetById(req.params.id, user.id);
    if (!dataset) {
      return res.status(404).json({ error: "Dataset not found." });
    }

    const { recipientEmail } = req.body;
    const finalRecipient = recipientEmail || user.email;

    // Convert cleaned data to CSV content
    const worksheet = XLSX.utils.json_to_sheet(dataset.cleanedData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const csvFilename = dataset.name.replace(/\.[^/.]+$/, "") + '_cleaned.csv';

    // Build elegant HTML email body
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
        <h2 style="color: #6366f1; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">DataSage AI – Dataset Ready</h2>
        <p>Hello,</p>
        <p>Your dataset <strong>${dataset.name}</strong> has been successfully preprocessed, cleaned, and analyzed by the DataSage AI Engine.</p>
        
        <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #4f46e5; border-radius: 4px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #1e293b;">⚡ Process Summary</h4>
          <ul style="margin: 0; padding-left: 20px; color: #475569;">
            <li>Original Health Score: <strong>${dataset.analysis.healthScore}/100</strong></li>
            <li>Post-Cleaned Health Score: <strong>${dataset.healthScore}/100</strong></li>
            <li>Records Parsed: <strong>${dataset.rows} rows</strong></li>
            <li>Features Processed: <strong>${dataset.columns} columns</strong></li>
          </ul>
        </div>

        <p>Attached to this email, you will find the <strong>fully cleaned and formatted CSV dataset</strong>, optimized for machine learning models and business analysis tools.</p>
        
        ${dataset.insights ? `
          <h3 style="color: #334155; margin-top: 30px;">🧠 Highlight AI Insights</h3>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; font-size: 14px; color: #334155; line-height: 1.6; max-height: 300px; overflow-y: auto;">
            ${dataset.insights.substring(0, 1000).replace(/\n/g, '<br/>')}...
          </div>
        ` : ''}

        <p style="margin-top: 30px; font-size: 13px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Generated with ❤ by DataSage AI Assistant.
        </p>
      </div>
    `;

    let status: 'sent' | 'simulated' = 'simulated';

    // Check if real Resend integration is active
    if (process.env.RESEND_API_KEY) {
      try {
        const base64Csv = Buffer.from(csvContent).toString('base64');
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'DataSage AI <onboarding@resend.dev>',
            to: [finalRecipient],
            subject: `Your Cleaned Dataset is Ready: ${dataset.name}`,
            html: emailHtml,
            attachments: [
              {
                filename: csvFilename,
                content: base64Csv
              }
            ]
          })
        });

        if (response.ok) {
          status = 'sent';
        } else {
          const errText = await response.text();
          console.error("Resend API failed:", errText);
          let userMessage = "Resend API Error: Failed to send email.";
          try {
            const parsed = JSON.parse(errText);
            if (parsed.message) {
              userMessage = `Resend API Error: ${parsed.message}`;
            }
          } catch (_) {}
          return res.status(400).json({ error: userMessage });
        }
      } catch (err: any) {
        console.error("Failed to call Resend API:", err);
        return res.status(500).json({ error: `Failed to call Resend API: ${err.message}` });
      }
    }

    // Save Log in DB
    DBStore.logEmail({
      userId: user.id,
      recipient: finalRecipient,
      subject: `Your Cleaned Dataset is Ready: ${dataset.name}`,
      body: emailHtml,
      datasetName: dataset.name,
      status
    });

    DBStore.logActivity({
      userId: user.id,
      type: 'dataset_email',
      description: `Emailed dataset ${dataset.name} to ${finalRecipient} (Status: ${status})`
    });

    res.json({
      success: true,
      message: `Cleaned dataset successfully sent to ${finalRecipient}!`,
      recipient: finalRecipient,
      status,
      emailBody: emailHtml
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 🔔 ACTIVITY LOGS
// ==========================================
app.get('/api/activities', authenticateUser, (req, res) => {
  try {
    const user = (req as any).user;
    const activities = DBStore.getActivityLogs(user.id);
    res.json({ activities });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// VITE DEV SERVER AND PRODUCTION SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DataSage AI server listening on http://0.0.0.0:${PORT} [ENV: ${process.env.NODE_ENV || 'development'}]`);
  });
}

startServer();
