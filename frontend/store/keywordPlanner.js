import { create } from 'zustand';
import useAuthStore from './auth';

const useKeywordPlannerStore = create((set, get) => ({
  loading: false,
  error: null,

  analyzeKeywords: async (data) => {
    set({ loading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/keyword-planner/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      set({ loading: false });
      return result;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.message || 'Failed to analyze keywords' 
      });
      throw error;
    }
  },
  // Check keyword rank for a given domain + keyword
  checkRank: async (data) => {
    set({ loading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/keyword-planner/rank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      set({ loading: false });
      return result;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.message || 'Failed to check rank' 
      });
      throw error;
    }
  },

  // Bulk rank check for multiple keywords
  bulkCheckRank: async (data) => {
    set({ loading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/keyword-planner/bulk-rank-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      set({ loading: false });
      return result;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.message || 'Failed to bulk check ranks' 
      });
      throw error;
    }
  },

  // Get monthly comparison data
  getMonthlyComparison: async (params) => {
    set({ loading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      const queryParams = new URLSearchParams(params).toString();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/keyword-planner/monthly-comparison?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      set({ loading: false });
      return result;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.message || 'Failed to fetch monthly comparison' 
      });
      throw error;
    }
  },
}));

export default useKeywordPlannerStore;
