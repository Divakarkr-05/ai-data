export const API_URL = '';

function getHeaders() {
  const token = localStorage.getItem('datasage_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = getHeaders();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! Status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data: any) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/api/auth/me'),
  updateProfile: (data: any) => request('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data: any) => request('/api/auth/password', { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: () => request('/api/auth/delete', { method: 'DELETE' }),

  // Datasets
  getDatasets: () => request('/api/datasets'),
  getDataset: (id: string) => request(`/api/datasets/${id}`),
  uploadDataset: (name: string, content: string, autoClean: boolean = true) => request('/api/datasets/upload', {
    method: 'POST',
    body: JSON.stringify({ name, content, autoClean })
  }),
  cleanDataset: (id: string, options: any) => request(`/api/datasets/${id}/clean`, {
    method: 'POST',
    body: JSON.stringify(options)
  }),
  getInsights: (id: string) => request(`/api/datasets/${id}/insights`, { method: 'POST' }),
  sendChat: (id: string, message: string) => request(`/api/datasets/${id}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message })
  }),
  sendCopilotChat: (message: string, datasetId?: string | null) => request('/api/copilot/chat', {
    method: 'POST',
    body: JSON.stringify({ message, datasetId })
  }),
  clearCopilotChat: () => request('/api/copilot/chat/clear', {
    method: 'POST'
  }),
  emailDataset: (id: string, recipientEmail?: string) => request(`/api/datasets/${id}/email`, {
    method: 'POST',
    body: JSON.stringify({ recipientEmail })
  }),
  deleteDataset: (id: string) => request(`/api/datasets/${id}`, { method: 'DELETE' }),

  // Activities
  getActivities: () => request('/api/activities')
};
