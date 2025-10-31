import { create } from 'zustand';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5001';

const useBlogStore = create((set, get) => ({
  blogs: [],
  currentBlog: null,
  loading: false,
  error: null,
  generatedTitles: [],
  generatingTitles: false,
  generatingContent: false,

  // Fetch all blogs
  fetchBlogs: async (token, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(`${API_BASE}/api/blogs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.status === 'success') {
        set({ blogs: data.data.blogs, loading: false });
      } else {
        set({ error: data.message, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Fetch single blog
  fetchBlog: async (token, blogId) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/blogs/${blogId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.status === 'success') {
        set({ currentBlog: data.data.blog, loading: false });
        return data.data.blog;
      } else {
        set({ error: data.message, loading: false });
        return null;
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  // Generate blog title suggestions
  generateTitles: async (token, keyword, clientId, options = {}) => {
    set({ generatingTitles: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/blogs/generate-titles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          clientId,
          ...options,
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        set({ generatedTitles: data.data.titles, generatingTitles: false });
        return data.data.titles;
      } else {
        set({ error: data.message, generatingTitles: false });
        return [];
      }
    } catch (error) {
      set({ error: error.message, generatingTitles: false });
      return [];
    }
  },

  // Generate full blog content
  generateContent: async (token, blogOptions) => {
    set({ generatingContent: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/blogs/generate-content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(blogOptions),
      });

      const data = await response.json();

      if (data.status === 'success') {
        set({ generatingContent: false });
        return data.data;
      } else {
        set({ error: data.message, generatingContent: false });
        return null;
      }
    } catch (error) {
      set({ error: error.message, generatingContent: false });
      return null;
    }
  },

  // Create blog
  createBlog: async (token, blogData) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/blogs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(blogData),
      });

      const data = await response.json();

      if (data.status === 'success') {
        set(state => ({
          blogs: [data.data.blog, ...state.blogs],
          currentBlog: data.data.blog,
          loading: false,
        }));
        return data.data.blog;
      } else {
        set({ error: data.message, loading: false });
        return null;
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  // Update blog
  updateBlog: async (token, blogId, updates) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/blogs/${blogId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (data.status === 'success') {
        set(state => ({
          blogs: state.blogs.map(blog =>
            blog._id === blogId ? data.data.blog : blog
          ),
          currentBlog: data.data.blog,
          loading: false,
        }));
        return data.data.blog;
      } else {
        set({ error: data.message, loading: false });
        return null;
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  // Delete blog
  deleteBlog: async (token, blogId) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/blogs/${blogId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.status === 'success') {
        set(state => ({
          blogs: state.blogs.filter(blog => blog._id !== blogId),
          loading: false,
        }));
        return true;
      } else {
        set({ error: data.message, loading: false });
        return false;
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return false;
    }
  },

  // Publish blog
  publishBlog: async (token, blogId) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/blogs/${blogId}/publish`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.status === 'success') {
        set(state => ({
          blogs: state.blogs.map(blog =>
            blog._id === blogId ? data.data.blog : blog
          ),
          currentBlog: data.data.blog,
          loading: false,
        }));
        return true;
      } else {
        set({ error: data.message, loading: false });
        return false;
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return false;
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Reset generated titles
  resetTitles: () => set({ generatedTitles: [] }),
}));

export default useBlogStore;
