import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.slyos.world';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 60000, // RAG operations can be slow
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Knowledge Base CRUD
export const getKnowledgeBases = async () => {
  const response = await api.get('/rag/knowledge-bases');
  return response.data;
};

export const getKnowledgeBase = async (kbId: string) => {
  const response = await api.get(`/rag/knowledge-bases/${kbId}`);
  return response.data;
};

export const createKnowledgeBase = async (data: {
  name: string; description?: string; tier?: number; chunk_size?: number; chunk_overlap?: number;
  model_id?: string; system_prompt?: string; temperature?: number; top_k?: number;
}) => {
  const response = await api.post('/rag/knowledge-bases', data);
  return response.data;
};

export const updateKnowledgeBase = async (kbId: string, data: {
  name?: string; description?: string; chunk_size?: number; chunk_overlap?: number;
  model_id?: string; system_prompt?: string; temperature?: number; top_k?: number;
}) => {
  const response = await api.put(`/rag/knowledge-bases/${kbId}`, data);
  return response.data;
};

export const deleteKnowledgeBase = async (kbId: string) => {
  const response = await api.delete(`/rag/knowledge-bases/${kbId}`);
  return response.data;
};

// Documents
export const uploadDocuments = async (kbId: string, files: File[]) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  // Explicitly delete Content-Type so browser sets multipart/form-data with boundary
  const response = await api.post(`/rag/knowledge-bases/${kbId}/documents/upload`, formData, {
    timeout: 300000,
    maxContentLength: 200 * 1024 * 1024,
    maxBodyLength: 200 * 1024 * 1024,
    headers: { 'Content-Type': undefined },
    transformRequest: [(data) => data], // Prevent axios from transforming FormData
  });
  return response.data;
};

export const scrapeUrl = async (kbId: string, url: string) => {
  const response = await api.post(`/rag/knowledge-bases/${kbId}/documents/scrape`, { url });
  return response.data;
};

export const getDocuments = async (kbId: string) => {
  const response = await api.get(`/rag/knowledge-bases/${kbId}/documents`);
  return response.data;
};

export const deleteDocument = async (kbId: string, docId: string) => {
  const response = await api.delete(`/rag/knowledge-bases/${kbId}/documents/${docId}`);
  return response.data;
};

// RAG Query
export const ragSearch = async (kbId: string, query: string, topK?: number) => {
  const response = await api.post(`/rag/knowledge-bases/${kbId}/search`, { query, top_k: topK || 5 });
  return response.data;
};

export const ragQuery = async (kbId: string, query: string, modelId: string, topK?: number) => {
  const response = await api.post(`/rag/knowledge-bases/${kbId}/query`, { query, top_k: topK || 5, model_id: modelId });
  return response.data;
};

// Sync (Tier 3)
export const syncKnowledgeBase = async (kbId: string, deviceId: string) => {
  const response = await api.post(`/rag/knowledge-bases/${kbId}/sync`, { device_id: deviceId });
  return response.data;
};
