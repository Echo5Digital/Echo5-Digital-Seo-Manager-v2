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
}));

export default useKeywordPlannerStore;
