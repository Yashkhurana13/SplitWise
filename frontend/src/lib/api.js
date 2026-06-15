const API_URL = import.meta.env.VITE_API_URL || '/api';

export const apiCall = async (endpoint, options = {}) => {
  const authData = JSON.parse(localStorage.getItem('splitwise_auth') || 'null');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authData?.token) {
    headers['Authorization'] = `Bearer ${authData.token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }

  return data;
};
