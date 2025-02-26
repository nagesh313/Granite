import { queryClient } from "./queryClient";

const API_BASE = "/api";

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  },

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  },

  async delete(endpoint: string): Promise<void> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
  },

  async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('photos', file);

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Upload failed: ${response.statusText}`);
    }

    const urls = await response.json();
    return Array.isArray(urls) ? urls[0] : urls;
  }
};

export const invalidateQueries = (keys: string[]) => {
  keys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
};