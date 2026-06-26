import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl: string;
  joinedAt: string;
  uploadedCount: number;
  cleanedCount: number;
  lastLogin: string;
  copilotChatHistory?: { role: 'user' | 'model'; parts: { text: string }[]; timestamp: string }[];
}

export interface DatasetAnalysis {
  rowCount: number;
  colCount: number;
  fileSize: string;
  headers: string[];
  columnTypes: Record<string, string>;
  missingValues: Record<string, number>;
  nullPercentages: Record<string, number>;
  duplicateRows: number;
  emptyColumns: string[];
  constantColumns: string[];
  outliers: Record<string, number>;
  correlations: { col1: string; col2: string; coefficient: number }[];
  summaryStats: Record<string, { min: number; max: number; mean: number; median: number; uniqueCount: number; mostFrequent?: any; lowerBound?: number; upperBound?: number }>;
  healthScore: number;
}

export interface Dataset {
  id: string;
  userId: string;
  name: string;
  fileSize: string;
  uploadedAt: string;
  rows: number;
  columns: number;
  headers: string[];
  originalData: any[];
  cleanedData: any[];
  healthScore: number;
  status: 'analyzed' | 'cleaned';
  analysis: DatasetAnalysis;
  cleaningReport: string[];
  cleanedHeaders?: string[];
  removedColumns?: string[];
  insights?: string;
  chatHistory: { role: 'user' | 'model'; parts: { text: string }[]; timestamp: string }[];
  supabaseUrl?: string;
}

export interface EmailLog {
  id: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  datasetName: string;
  sentAt: string;
  status: 'sent' | 'simulated';
}

export interface ActivityLog {
  id: string;
  userId: string;
  type: string;
  description: string;
  timestamp: string;
}

interface DatabaseSchema {
  users: User[];
  datasets: Dataset[];
  emailsSent: EmailLog[];
  activityLogs: ActivityLog[];
}

const DB_PATH = path.join(process.cwd(), 'database.json');

function initDb(): DatabaseSchema {
  if (!fs.existsSync(DB_PATH)) {
    const initialData: DatabaseSchema = {
      users: [],
      datasets: [],
      emailsSent: [],
      activityLogs: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database file, resetting database", error);
    const initialData: DatabaseSchema = {
      users: [],
      datasets: [],
      emailsSent: [],
      activityLogs: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

export class DBStore {
  private static schema: DatabaseSchema = initDb();

  private static save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.schema, null, 2));
    } catch (error) {
      console.error("Error saving database file", error);
    }
  }

  // Users Table
  static getUsers(): User[] {
    return this.schema.users;
  }

  static findUserByEmail(email: string): User | undefined {
    return this.schema.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  static findUserById(id: string): User | undefined {
    return this.schema.users.find(u => u.id === id);
  }

  static createUser(user: Omit<User, 'avatarUrl' | 'joinedAt' | 'uploadedCount' | 'cleanedCount' | 'lastLogin' | 'copilotChatHistory'>): User {
    const newUser: User = {
      ...user,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.name)}`,
      joinedAt: new Date().toISOString(),
      uploadedCount: 0,
      cleanedCount: 0,
      lastLogin: new Date().toISOString(),
      copilotChatHistory: []
    };
    this.schema.users.push(newUser);
    this.save();
    return newUser;
  }

  static clearCopilotChatHistory(userId: string): User | undefined {
    const idx = this.schema.users.findIndex(u => u.id === userId);
    if (idx === -1) return undefined;
    this.schema.users[idx].copilotChatHistory = [];
    this.save();
    return this.schema.users[idx];
  }

  static updateUser(id: string, updates: Partial<Omit<User, 'id' | 'email' | 'passwordHash'>>): User | undefined {
    const idx = this.schema.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    this.schema.users[idx] = { ...this.schema.users[idx], ...updates };
    this.save();
    return this.schema.users[idx];
  }

  static updateUserPassword(id: string, newPasswordHash: string): boolean {
    const idx = this.schema.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.schema.users[idx].passwordHash = newPasswordHash;
    this.save();
    return true;
  }

  static deleteUser(id: string): boolean {
    const idx = this.schema.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.schema.users.splice(idx, 1);
    // Also delete user's datasets, emails, logs
    this.schema.datasets = this.schema.datasets.filter(d => d.userId !== id);
    this.schema.emailsSent = this.schema.emailsSent.filter(e => e.userId !== id);
    this.schema.activityLogs = this.schema.activityLogs.filter(a => a.userId !== id);
    this.save();
    return true;
  }

  // Datasets Table
  static getDatasets(userId: string): Dataset[] {
    return this.schema.datasets.filter(d => d.userId === userId);
  }

  static findDatasetById(id: string, userId: string): Dataset | undefined {
    return this.schema.datasets.find(d => d.id === id && d.userId === userId);
  }

  static createDataset(dataset: Omit<Dataset, 'uploadedAt' | 'status' | 'cleaningReport' | 'chatHistory'>): Dataset {
    const newDataset: Dataset = {
      ...dataset,
      uploadedAt: new Date().toISOString(),
      status: 'analyzed',
      cleaningReport: [],
      chatHistory: []
    };
    this.schema.datasets.push(newDataset);
    
    // Update user stats
    const user = this.findUserById(dataset.userId);
    if (user) {
      this.updateUser(user.id, { uploadedCount: user.uploadedCount + 1 });
    }

    this.save();
    return newDataset;
  }

  static updateDataset(id: string, userId: string, updates: Partial<Omit<Dataset, 'id' | 'userId'>>): Dataset | undefined {
    const idx = this.schema.datasets.findIndex(d => d.id === id && d.userId === userId);
    if (idx === -1) return undefined;
    this.schema.datasets[idx] = { ...this.schema.datasets[idx], ...updates };
    
    if (updates.status === 'cleaned') {
      const user = this.findUserById(userId);
      if (user) {
        this.updateUser(user.id, { cleanedCount: user.cleanedCount + 1 });
      }
    }
    
    this.save();
    return this.schema.datasets[idx];
  }

  static deleteDataset(id: string, userId: string): boolean {
    const idx = this.schema.datasets.findIndex(d => d.id === id && d.userId === userId);
    if (idx === -1) return false;
    this.schema.datasets.splice(idx, 1);
    this.save();
    return true;
  }

  // Email Logs Table
  static getEmailLogs(userId: string): EmailLog[] {
    return this.schema.emailsSent.filter(e => e.userId === userId);
  }

  static logEmail(email: Omit<EmailLog, 'id' | 'sentAt'>): EmailLog {
    const newEmail: EmailLog = {
      ...email,
      id: Math.random().toString(36).substring(2, 11),
      sentAt: new Date().toISOString()
    };
    this.schema.emailsSent.push(newEmail);
    this.save();
    return newEmail;
  }

  // Activity Logs Table
  static getActivityLogs(userId: string): ActivityLog[] {
    return this.schema.activityLogs
      .filter(a => a.userId === userId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  static logActivity(activity: Omit<ActivityLog, 'id' | 'timestamp'>): ActivityLog {
    const newLog: ActivityLog = {
      ...activity,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString()
    };
    this.schema.activityLogs.push(newLog);
    this.save();
    return newLog;
  }
}
