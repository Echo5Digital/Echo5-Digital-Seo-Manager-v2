import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import useClientStore from '../store/clients';
import useKeywordPlannerStore from '../store/keywordPlanner';
import useKeywordStore from '../store/keywords';
import useAuthStore from '../store/auth';

export default function RankChecker() {
  const clients = useClientStore(state => state.clients);
  const fetchClients = useClientStore(state => state.fetchClients);
  const { checkRank, bulkCheckRank, getMonthlyComparison } = useKeywordPlannerStore();
  const keywords = useKeywordStore(state => state.keywords);
  const fetchKeywords = useKeywordStore(state => state.fetchKeywords);
  const token = useAuthStore(state => state.token);
  
  // View mode: 'single' or 'bulk' or 'monthly'
  const [viewMode, setViewMode] = useState('single');
  
  // Single check mode states
  const [rankClientId, setRankClientId] = useState('');
  const [rankDomain, setRankDomain] = useState('');
  const [rankKeyword, setRankKeyword] = useState('');
  const [rankLocation, setRankLocation] = useState('United States');
  const [checkingRank, setCheckingRank] = useState(false);
  const [rankResult, setRankResult] = useState(null);
  const [rankError, setRankError] = useState(null);
  
  // Bulk check mode states
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [bulkClientId, setBulkClientId] = useState('');
  const [bulkDomain, setBulkDomain] = useState('');
  const [bulkLocation, setBulkLocation] = useState('United States');
  const [bulkChecking, setBulkChecking] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const [bulkError, setBulkError] = useState(null);
  
  // Monthly comparison states
  const [monthlyClientId, setMonthlyClientId] = useState('');
  const [monthlyDomain, setMonthlyDomain] = useState('');
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState(null);
  const [monthlyView, setMonthlyView] = useState('summary'); // summary, timeline, performance, detailed
  const [monthlyFilter, setMonthlyFilter] = useState('all'); // all, improved, declined, stable, new
  const [monthlySortBy, setSortlySort] = useState('change'); // change, keyword, currentRank
  const [expandedKeyword, setExpandedKeyword] = useState(null);
  
  // Rank history
  const [rankHistory, setRankHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedClients, setExpandedClients] = useState({});
  
  // Keyword suggestions
  const [keywordSuggestions, setKeywordSuggestions] = useState([]);
  const [showKeywordDropdown, setShowKeywordDropdown] = useState(false);
  const keywordInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load last search inputs from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedInputs = localStorage.getItem('lastRankSearch');
      if (savedInputs) {
        const { clientId, domain, keyword, location } = JSON.parse(savedInputs);
        if (clientId) setRankClientId(clientId);
        if (domain) setRankDomain(domain);
        if (keyword) setRankKeyword(keyword);
        if (location) setRankLocation(location);
      }
    }
  }, []);

  // Fetch rank history from database
  const fetchRankHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/keyword-planner/rank-history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setRankHistory(result.data || []);
        console.log('📊 Loaded rank history from database:', result.data?.length || 0, 'records');
      }
    } catch (error) {
      console.error('❌ Error loading rank history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchKeywords();
    fetchRankHistory(); // Load history from database
  }, [fetchClients, fetchKeywords]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          keywordInputRef.current && !keywordInputRef.current.contains(event.target)) {
        setShowKeywordDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeywordInputChange = (e) => {
    const value = e.target.value;
    setRankKeyword(value);
    
    if (value.trim().length > 0) {
      // Filter keywords that match the input
      let filtered = keywords.filter(kw => kw.keyword && kw.keyword.toLowerCase().includes(value.toLowerCase()));
      
      // If a client is selected, only show that client's keywords
      if (rankClientId) {
        filtered = filtered.filter(kw => {
          const kwClientId = kw.clientId?._id || kw.clientId;
          return kwClientId === rankClientId;
        });
      }
      
      filtered = filtered.slice(0, 10); // Show max 10 suggestions
      
      setKeywordSuggestions(filtered);
      setShowKeywordDropdown(filtered.length > 0);
    } else {
      setKeywordSuggestions([]);
      setShowKeywordDropdown(false);
    }
  };

  const selectKeywordSuggestion = (keyword) => {
    setRankKeyword(keyword.keyword);
    setShowKeywordDropdown(false);
    
    // If keyword has a client associated, auto-fill client details
    if (keyword.clientId) {
      const client = clients.find(c => c._id === keyword.clientId._id || c._id === keyword.clientId);
      if (client) {
        setRankClientId(client._id);
        if (client.website) {
          try {
            const url = client.website.startsWith('http') ? client.website : `https://${client.website}`;
            const domain = new URL(url).hostname.replace('www.', '');
            setRankDomain(domain);
          } catch {
            setRankDomain(client.website);
          }
        }
        if (client.location) {
          setRankLocation(client.location);
        }
      }
    }
  };

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCheckRank = async () => {
    if (!rankDomain.trim() || !rankKeyword.trim()) return;
    setCheckingRank(true);
    setRankResult(null);
    setRankError(null);
    try {
      const payload = { 
        domain: rankDomain.trim(), 
        keyword: rankKeyword.trim() 
      };
      
      // Add location if provided
      if (rankLocation.trim()) {
        payload.location = rankLocation.trim();
      }
      
      const resp = await checkRank(payload);
      if (resp && resp.status === 'success') {
        setRankResult(resp.data);
        
        // Reload history from database to get the newly saved result
        await fetchRankHistory();
      } else if (resp && resp.status === 'error') {
        // Check if it's a timeout error
        if (resp.error === 'TIMEOUT') {
          setRankError('⏱️ Request timeout - The API took too long to respond. Please try again in a moment.');
        } else if (resp.error === 'IP_NOT_WHITELISTED') {
          setRankError('🔒 ' + (resp.message || 'IP address not whitelisted in DataForSEO account'));
        } else {
          setRankError(resp.message || 'Rank check failed');
        }
      } else {
        setRankError('Rank check failed');
      }
    } catch (err) {
      console.error('Error checking rank:', err);
      setRankError(err.message || 'An error occurred while checking rank');
    } finally {
      setCheckingRank(false);
    }
  };

  const handleRankClientChange = (e) => {
    const clientId = e.target.value;
    setRankClientId(clientId);
    const client = clients.find(c => c._id === clientId);
    if (client) {
      // Auto-fill domain
      if (client.website) {
        try {
          const url = client.website.startsWith('http') ? client.website : `https://${client.website}`;
          const domain = new URL(url).hostname.replace('www.', '');
          setRankDomain(domain);
        } catch {
          setRankDomain(client.website);
        }
      }
      // Auto-fill location
      if (client.location) {
        setRankLocation(client.location);
      }
    }
    
    // Update keyword suggestions if user has already typed something
    if (rankKeyword.trim().length > 0) {
      let filtered = keywords.filter(kw => kw.keyword && kw.keyword.toLowerCase().includes(rankKeyword.toLowerCase()));
      
      if (clientId) {
        filtered = filtered.filter(kw => {
          const kwClientId = kw.clientId?._id || kw.clientId;
          return kwClientId === clientId;
        });
      }
      
      filtered = filtered.slice(0, 10);
      setKeywordSuggestions(filtered);
      setShowKeywordDropdown(filtered.length > 0);
    }
  };

  // Bulk check handler
  const handleBulkCheckRank = async () => {
    if (!bulkDomain.trim() || selectedKeywords.length === 0) return;
    
    setBulkChecking(true);
    setBulkResults(null);
    setBulkError(null);
    
    try {
      const keywordsList = selectedKeywords.map(kw => kw.keyword);
      const keywordIds = selectedKeywords.map(kw => kw._id);
      
      const payload = {
        domain: bulkDomain.trim(),
        keywords: keywordsList,
        keywordIds: keywordIds,
        location: bulkLocation.trim(),
        clientId: bulkClientId || null
      };
      
      const resp = await bulkCheckRank(payload);
      if (resp && resp.status === 'success') {
        setBulkResults(resp.data);
        await fetchRankHistory();
      } else {
        setBulkError(resp?.message || 'Bulk rank check failed');
      }
    } catch (err) {
      console.error('Error in bulk rank check:', err);
      setBulkError(err.message || 'An error occurred during bulk rank check');
    } finally {
      setBulkChecking(false);
    }
  };

  // Monthly comparison handler
  const handleFetchMonthlyComparison = async () => {
    if (!monthlyDomain.trim() && !monthlyClientId) return;
    
    setMonthlyLoading(true);
    setMonthlyError(null);
    
    try {
      const params = {};
      if (monthlyDomain.trim()) params.domain = monthlyDomain.trim();
      if (monthlyClientId) params.clientId = monthlyClientId;
      params.months = 12; // Last 12 months to show all available data
      
      const resp = await getMonthlyComparison(params);
      if (resp && resp.status === 'success') {
        setMonthlyData(resp.data);
        console.log('📊 Monthly comparison data received:', {
          totalKeywords: resp.data?.summary?.totalKeywords,
          monthsAnalyzed: resp.data?.metadata?.monthsAnalyzed,
          keywordTimelineCount: resp.data?.keywordTimeline?.length,
          monthlyStatsCount: resp.data?.monthlyStats?.length
        });
      } else {
        setMonthlyError(resp?.message || 'Failed to fetch monthly comparison');
      }
    } catch (err) {
      console.error('Error fetching monthly comparison:', err);
      setMonthlyError(err.message || 'An error occurred while fetching monthly comparison');
    } finally {
      setMonthlyLoading(false);
    }
  };

  // Handle bulk client change
  const handleBulkClientChange = (e) => {
    const clientId = e.target.value;
    setBulkClientId(clientId);
    const client = clients.find(c => c._id === clientId);
    if (client) {
      if (client.website) {
        try {
          const url = client.website.startsWith('http') ? client.website : `https://${client.website}`;
          const domain = new URL(url).hostname.replace('www.', '');
          setBulkDomain(domain);
        } catch {
          setBulkDomain(client.website);
        }
      }
      if (client.location) {
        setBulkLocation(client.location);
      }
    }
  };

  // Handle monthly client change
  const handleMonthlyClientChange = (e) => {
    const clientId = e.target.value;
    setMonthlyClientId(clientId);
    const client = clients.find(c => c._id === clientId);
    if (client && client.website) {
      try {
        const url = client.website.startsWith('http') ? client.website : `https://${client.website}`;
        const domain = new URL(url).hostname.replace('www.', '');
        setMonthlyDomain(domain);
      } catch {
        setMonthlyDomain(client.website);
      }
    }
  };

  // Toggle keyword selection
  const toggleKeywordSelection = (keyword) => {
    setSelectedKeywords(prev => {
      const exists = prev.find(k => k._id === keyword._id);
      if (exists) {
        return prev.filter(k => k._id !== keyword._id);
      } else {
        return [...prev, keyword];
      }
    });
  };

  // Select all keywords for a client
  const selectAllClientKeywords = () => {
    if (!bulkClientId) return;
    const clientKeywords = keywords.filter(kw => {
      const kwClientId = kw.clientId?._id || kw.clientId;
      return kwClientId === bulkClientId;
    });
    setSelectedKeywords(clientKeywords);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDateOnly = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Group rank history by client and date
  const groupedHistory = () => {
    if (rankHistory.length === 0) return {};
    
    const grouped = {};
    
    rankHistory.forEach(item => {
      // Try to find client name from the clients array by matching domain
      let clientName = item.domain;
      let clientId = null;
      
      // If item has a client reference, use it
      if (item.client) {
        const client = clients.find(c => c._id === item.client || c._id === item.client._id);
        if (client) {
          clientName = client.name;
          clientId = client._id;
        }
      } else {
        // Try to find client by matching domain
        const client = clients.find(c => {
          const clientDomain = c.website?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
          const itemDomain = item.domain?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
          return clientDomain === itemDomain;
        });
        
        if (client) {
          clientName = client.name;
          clientId = client._id;
        }
      }
      
      const clientKey = clientId || item.domain;
      const dateKey = formatDateOnly(item.checkedAt);
      
      if (!grouped[clientKey]) {
        grouped[clientKey] = {
          clientName,
          domain: item.domain,
          dates: {}
        };
      }
      
      if (!grouped[clientKey].dates[dateKey]) {
        grouped[clientKey].dates[dateKey] = [];
      }
      
      grouped[clientKey].dates[dateKey].push(item);
    });
    
    return grouped;
  };

  const toggleClientExpand = (clientKey) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientKey]: !prev[clientKey]
    }));
  };

  const renderGroupedHistory = () => {
    const grouped = groupedHistory();
    const clientKeys = Object.keys(grouped).sort((a, b) => {
      // Sort by client name alphabetically
      return grouped[a].clientName.localeCompare(grouped[b].clientName);
    });
    
    if (clientKeys.length === 0) return null;
    
    return clientKeys.map(clientKey => {
      const clientData = grouped[clientKey];
      const isExpanded = expandedClients[clientKey] !== false; // Default to expanded
      const totalChecks = Object.values(clientData.dates).reduce((sum, checks) => sum + checks.length, 0);
      
      return (
        <div key={clientKey} className="mb-6 last:mb-0">
          {/* Client Header - Clickable */}
          <div 
            onClick={() => toggleClientExpand(clientKey)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 border-b border-indigo-100 cursor-pointer hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg 
                  className={`w-5 h-5 text-white transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div>
                  <h3 className="text-base font-bold text-white">{clientData.clientName}</h3>
                  <p className="text-xs text-indigo-100 mt-0.5">{clientData.domain}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white bg-opacity-20 rounded-full px-3 py-1">
                  <span className="text-sm font-semibold text-white">{totalChecks} check{totalChecks > 1 ? 's' : ''}</span>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full px-3 py-1">
                  <span className="text-sm font-semibold text-white">{Object.keys(clientData.dates).length} date{Object.keys(clientData.dates).length > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Client Data - Collapsible */}
          {isExpanded && (
            <>
              {Object.keys(clientData.dates).sort((a, b) => new Date(b) - new Date(a)).map(dateKey => (
                <div key={dateKey} className="border-l-4 border-indigo-200">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <span className="text-xs font-medium text-gray-700">
                      📅 {dateKey} ({clientData.dates[dateKey].length} check{clientData.dates[dateKey].length > 1 ? 's' : ''})
                    </span>
                  </div>
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-100">
                      {clientData.dates[dateKey].map((item, index) => (
                        <tr key={item._id || `${item.keyword}-${item.checkedAt}-${index}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700 w-1/3">{item.keyword}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 w-1/4">{item.location || 'Global'}</td>
                          <td className="px-4 py-3 w-1/6">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.rank && item.rank <= 10 
                                ? 'bg-green-100 text-green-800' 
                                : item.rank && item.rank <= 30
                                ? 'bg-blue-100 text-blue-800'
                                : item.rank
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {item.rank ? `#${item.rank}` : 'Not ranked'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 w-1/6">{item.difficulty}/100</td>
                          <td className="px-4 py-3 w-1/6">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              item.source === 'dataforseo' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {item.source === 'dataforseo' && (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                              {item.source === 'dataforseo' ? 'Live' : item.source}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{new Date(item.checkedAt).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}
        </div>
      );
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Keyword Rank Checker</h1>
            <p className="text-sm text-gray-600 mt-1">Check where your keywords rank in Google search results</p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setViewMode('single')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === 'single'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Single Check
              </button>
              <button
                onClick={() => setViewMode('bulk')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === 'bulk'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Bulk Check
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === 'monthly'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Monthly Comparison
              </button>
            </nav>
          </div>
        </div>

        {/* Single Check Mode */}
        {viewMode === 'single' && (
          <>
        {/* Rank Checker Form */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Client (Optional)</label>
              <select
                value={rankClientId}
                onChange={handleRankClientChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">-- Select a client --</option>
                {Array.isArray(clients) && clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain *</label>
              <input
                type="text"
                placeholder="example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={rankDomain}
                onChange={(e) => setRankDomain(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country/Location</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={rankLocation}
                onChange={(e) => setRankLocation(e.target.value)}
              >
                <option value="">-- Select Country --</option>
                <option value="India">India</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
                <option value="UAE">UAE</option>
                <option value="Singapore">Singapore</option>
                <option value="Germany">Germany</option>
                <option value="France">France</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Auto-filled from client or select manually
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Keyword *</label>
              <input
                ref={keywordInputRef}
                type="text"
                placeholder="enter keyword to check"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={rankKeyword}
                onChange={handleKeywordInputChange}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && rankDomain.trim() && rankKeyword.trim() && !showKeywordDropdown) {
                    handleCheckRank();
                  }
                }}
              />
              
              {/* Keyword Suggestions Dropdown */}
              {showKeywordDropdown && keywordSuggestions.length > 0 && (
                <div 
                  ref={dropdownRef}
                  className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  {keywordSuggestions.map((kw) => (
                    <div
                      key={kw._id}
                      onClick={() => selectKeywordSuggestion(kw)}
                      className="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{kw.keyword}</div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        {kw.clientId?.name && (
                          <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                            {kw.clientId.name}
                          </span>
                        )}
                        {kw.volume && (
                          <span>Vol: {kw.volume}</span>
                        )}
                        {kw.difficulty && (
                          <span>Diff: {kw.difficulty}/100</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-1">
                {keywordSuggestions.length > 0 
                  ? `${keywordSuggestions.length} suggestion${keywordSuggestions.length > 1 ? 's' : ''} from your keywords` 
                  : 'Type to search from existing keywords'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCheckRank}
              disabled={!rankDomain.trim() || !rankKeyword.trim() || checkingRank}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {checkingRank ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking...
                </span>
              ) : (
                'Check Rank'
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {rankError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{rankError}</p>
              </div>
              <button
                onClick={() => setRankError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Current Result */}
        {rankResult && (
          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Result</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="text-sm text-indigo-600 font-medium">Rank Position</div>
                <div className="text-3xl font-bold text-indigo-900 mt-2">
                  {rankResult.rank ? `#${rankResult.rank}` : 'Not in top 100'}
                </div>
                {rankResult.message && (
                  <div className="text-xs text-indigo-600 mt-1">{rankResult.message}</div>
                )}
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-sm text-purple-600 font-medium">Difficulty</div>
                <div className="text-3xl font-bold text-purple-900 mt-2">{rankResult.difficulty}/100</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-600 font-medium">Location</div>
                <div className="text-lg font-semibold text-blue-900 mt-2">{rankResult.location || 'Global'}</div>
              </div>
              <div className={`border rounded-lg p-4 ${
                rankResult.source === 'dataforseo' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className={`text-sm font-medium ${
                  rankResult.source === 'dataforseo' ? 'text-green-600' : 'text-gray-600'
                }`}>Source</div>
                <div className={`text-lg font-semibold mt-2 capitalize flex items-center gap-2 ${
                  rankResult.source === 'dataforseo' ? 'text-green-900' : 'text-gray-900'
                }`}>
                  {rankResult.source === 'dataforseo' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {rankResult.source === 'dataforseo' ? 'Live Data' : rankResult.source || 'Demo'}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-700">Domain:</span>
                  <span className="ml-2 text-gray-600">{rankResult.domain}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Keyword:</span>
                  <span className="ml-2 text-gray-600">{rankResult.keyword}</span>
                </div>
                <div className="text-xs text-gray-500">
                  Checked: {formatDate(rankResult.checkedAt)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rank History - Grouped by Client and Date */}
        {loadingHistory ? (
          <div className="bg-white border rounded-lg shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading rank history...</p>
          </div>
        ) : rankHistory.length > 0 ? (
          <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Checks</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {rankHistory.length} total check{rankHistory.length > 1 ? 's' : ''} grouped by client and date
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
                  <span>Top 10</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div>
                  <span>Top 30</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300"></div>
                  <span>Top 100</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              {renderGroupedHistory()}
            </div>
          </div>
        ) : (
          <div className="bg-white border rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600">No rank checks yet. Start by checking a keyword rank above.</p>
          </div>
        )}

        {/* Empty State */}
        {!rankResult && rankHistory.length === 0 && !checkingRank && (
          <div className="bg-white border rounded-lg p-12 text-center shadow-sm">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No rank checks yet</h3>
            <p className="text-sm text-gray-600">Enter a domain and keyword above to check its Google ranking</p>
          </div>
        )}
        </>
        )}

        {/* Bulk Check Mode */}
        {viewMode === 'bulk' && (
          <>
            <div className="bg-white border rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk Keyword Rank Check</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Client</label>
                  <select
                    value={bulkClientId}
                    onChange={handleBulkClientChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select a client --</option>
                    {clients.map(client => (
                      <option key={client._id} value={client._id}>{client.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                  <input
                    type="text"
                    value={bulkDomain}
                    onChange={(e) => setBulkDomain(e.target.value)}
                    placeholder="example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={bulkLocation}
                    onChange={(e) => setBulkLocation(e.target.value)}
                    placeholder="United States"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {bulkClientId && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Keywords ({selectedKeywords.length} selected)
                    </label>
                    <button
                      onClick={selectAllClientKeywords}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Select All Client Keywords
                    </button>
                  </div>
                  <div className="border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {keywords.filter(kw => (kw.clientId?._id || kw.clientId) === bulkClientId).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {keywords
                          .filter(kw => (kw.clientId?._id || kw.clientId) === bulkClientId)
                          .map(kw => (
                            <label key={kw._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedKeywords.some(k => k._id === kw._id)}
                                onChange={() => toggleKeywordSelection(kw)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-700">{kw.keyword}</span>
                            </label>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No keywords found for this client</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleBulkCheckRank}
                  disabled={!bulkDomain.trim() || selectedKeywords.length === 0 || bulkChecking}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {bulkChecking ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Checking {selectedKeywords.length} keywords...
                    </span>
                  ) : (
                    `Check ${selectedKeywords.length} Keyword${selectedKeywords.length > 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            </div>

            {bulkError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{bulkError}</p>
              </div>
            )}

            {bulkResults && (
              <div className="bg-white border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk Check Results</h2>
                <div className="mb-4 flex items-center gap-4 text-sm">
                  <span className="text-gray-600">Checked: <strong>{bulkResults.checked}</strong></span>
                  <span className="text-green-600">Successful: <strong>{bulkResults.successful}</strong></span>
                  <span className="text-red-600">Failed: <strong>{bulkResults.checked - bulkResults.successful}</strong></span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keyword</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Previous</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bulkResults.results.map((result, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{result.keyword}</td>
                          <td className="px-4 py-3">
                            {result.rank ? (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                result.rank <= 10 ? 'bg-green-100 text-green-800' :
                                result.rank <= 30 ? 'bg-blue-100 text-blue-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                #{result.rank}
                              </span>
                            ) : (
                              <div className="flex flex-col">
                                <span className="text-gray-400 text-sm">Not in top 100</span>
                                {result.message && (
                                  <span className="text-xs text-gray-500 mt-0.5">{result.message}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {result.previousRank ? `#${result.previousRank}` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            {result.rankChange !== null && result.rankChange !== undefined ? (
                              <span className={`flex items-center gap-1 text-sm font-medium ${
                                result.rankChange > 0 ? 'text-green-600' :
                                result.rankChange < 0 ? 'text-red-600' :
                                'text-gray-600'
                              }`}>
                                {result.rankChange > 0 && (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {result.rankChange < 0 && (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {result.rankChange > 0 ? `+${result.rankChange}` : result.rankChange}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {result.difficulty !== null ? `${result.difficulty}/100` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              result.status === 'success' ? 'bg-green-100 text-green-800' :
                              result.status === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {result.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Monthly Comparison Mode */}
        {viewMode === 'monthly' && (
          <>
            <div className="bg-white border rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Rank Comparison & Analytics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Client</label>
                  <select
                    value={monthlyClientId}
                    onChange={handleMonthlyClientChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select a client --</option>
                    {clients.map(client => (
                      <option key={client._id} value={client._id}>{client.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                  <input
                    type="text"
                    value={monthlyDomain}
                    onChange={(e) => setMonthlyDomain(e.target.value)}
                    placeholder="example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                onClick={handleFetchMonthlyComparison}
                disabled={(!monthlyDomain.trim() && !monthlyClientId) || monthlyLoading}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {monthlyLoading ? 'Loading Analysis...' : 'Load 6-Month Analysis'}
              </button>
            </div>

            {monthlyError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{monthlyError}</p>
              </div>
            )}

            {monthlyData && (
              <>
                {/* Metadata */}
                {monthlyData.metadata && (
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-700"><strong>Domain:</strong> {monthlyData.metadata.domain}</span>
                        <span className="text-gray-700"><strong>Period:</strong> {monthlyData.metadata.dateRange}</span>
                        <span className="text-gray-700"><strong>Total Keywords:</strong> {monthlyData.summary.totalKeywords}</span>
                      </div>
                      <button className="px-4 py-2 bg-white border border-indigo-300 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50">
                        📄 Export Report
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Stats Summary */}
                <div className="bg-white border rounded-lg p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                      <div className="text-sm text-green-700 font-medium mb-1">✅ Improved</div>
                      <div className="text-3xl font-bold text-green-900">{monthlyData.summary.improved}</div>
                      <div className="text-xs text-green-600 mt-1">Rankings moved up</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
                      <div className="text-sm text-red-700 font-medium mb-1">⚠️ Declined</div>
                      <div className="text-3xl font-bold text-red-900">{monthlyData.summary.declined}</div>
                      <div className="text-xs text-red-600 mt-1">Rankings dropped</div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4">
                      <div className="text-sm text-gray-700 font-medium mb-1">➖ Stable</div>
                      <div className="text-3xl font-bold text-gray-900">{monthlyData.summary.unchanged}</div>
                      <div className="text-xs text-gray-600 mt-1">No change</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                      <div className="text-sm text-blue-700 font-medium mb-1">🆕 New</div>
                      <div className="text-3xl font-bold text-blue-900">{monthlyData.summary.new}</div>
                      <div className="text-xs text-blue-600 mt-1">New rankings</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
                      <div className="text-sm text-orange-700 font-medium mb-1">📉 Lost</div>
                      <div className="text-3xl font-bold text-orange-900">{monthlyData.summary.lost}</div>
                      <div className="text-xs text-orange-600 mt-1">Lost rankings</div>
                    </div>
                  </div>
                </div>

                {/* Performance Categories */}
                {monthlyData.performanceCategories && (
                  <div className="bg-white border rounded-lg p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Keyword Performance Categories</h2>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">🏆 Top Performers</span>
                          <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                            {monthlyData.performanceCategories.topPerformers}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Improved & ranking in top 30</p>
                      </div>
                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">⚡ Need Attention</span>
                          <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">
                            {monthlyData.performanceCategories.needAttention}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Declining or ranking below 50</p>
                      </div>
                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">👻 Lost Visibility</span>
                          <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded-full">
                            {monthlyData.performanceCategories.lostVisibility}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Previously ranked, now not in top 100</p>
                      </div>
                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">✔️ Stable</span>
                          <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2 py-1 rounded-full">
                            {monthlyData.performanceCategories.stable}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Consistent rankings</p>
                      </div>
                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">🌟 New Entries</span>
                          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                            {monthlyData.performanceCategories.new}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Recently started tracking</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Monthly Stats Trend */}
                {monthlyData.monthlyStats && monthlyData.monthlyStats.length > 0 && (
                  <div className="bg-white border rounded-lg p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Monthly Statistics Trend
                      {monthlyData.metadata?.weeklyTrackingEnabled && (
                        <span className="ml-2 text-xs text-indigo-600 font-normal">
                          📅 Weekly tracking enabled
                        </span>
                      )}
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weekly Checks</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keywords Tracked</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Position</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Top 10</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Top 30</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Top 100</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Not Ranking</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {monthlyData.monthlyStats.map((stat, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{stat.monthName}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                  {stat.stats?.totalChecks || stat.totalKeywords} checks
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{stat.totalKeywords}</td>
                              <td className="px-4 py-3">
                                {stat.averageRank ? (
                                  <span className="text-sm font-semibold text-indigo-600">#{stat.averageRank}</span>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {stat.top10Count}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {stat.top30Count}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  {stat.top100Count}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {stat.notRankingCount}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Keyword Timeline (Historical Data) */}
                {monthlyData.keywordTimeline && monthlyData.keywordTimeline.length > 0 && (
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">Keyword Historical Timeline</h2>
                      <div className="flex items-center gap-2">
                        <select
                          value={monthlyFilter}
                          onChange={(e) => setMonthlyFilter(e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="all">All Keywords</option>
                          <option value="improved">Improved</option>
                          <option value="declined">Declined</option>
                          <option value="stable">Stable</option>
                          <option value="new">New</option>
                        </select>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">Keyword</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Best</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worst</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Change</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">History</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {monthlyData.keywordTimeline
                            .filter(kw => monthlyFilter === 'all' || kw.trend === monthlyFilter)
                            .map((kw, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                                {kw.keyword}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  kw.trend === 'improved' ? 'bg-green-100 text-green-800' :
                                  kw.trend === 'declined' ? 'bg-red-100 text-red-800' :
                                  kw.trend === 'stable' ? 'bg-gray-100 text-gray-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {kw.trend === 'improved' && '↗️ '}
                                  {kw.trend === 'declined' && '↘️ '}
                                  {kw.trend === 'stable' && '→ '}
                                  {kw.trend === 'new' && '✨ '}
                                  {kw.trend}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {kw.currentRank ? (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    kw.currentRank <= 10 ? 'bg-green-100 text-green-800' :
                                    kw.currentRank <= 30 ? 'bg-blue-100 text-blue-800' :
                                    'bg-orange-100 text-orange-800'
                                  }`}>
                                    #{kw.currentRank}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-600 font-semibold">
                                {kw.bestRank ? `#${kw.bestRank}` : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-red-600">
                                {kw.worstRank ? `#${kw.worstRank}` : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {kw.averageRank ? `#${kw.averageRank}` : '-'}
                              </td>
                              <td className="px-4 py-3">
                                {kw.totalChange !== null ? (
                                  <span className={`flex items-center gap-1 text-sm font-medium ${
                                    kw.totalChange > 0 ? 'text-green-600' :
                                    kw.totalChange < 0 ? 'text-red-600' :
                                    'text-gray-600'
                                  }`}>
                                    {kw.totalChange > 0 && '↑ '}
                                    {kw.totalChange < 0 && '↓ '}
                                    {kw.totalChange > 0 ? `+${kw.totalChange}` : kw.totalChange}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {kw.history.map((h, hidx) => {
                                    // Check if this month has weekly checks
                                    const hasWeeklyChecks = h.weeklyChecks && h.weeklyChecks.length > 0;
                                    
                                    if (hasWeeklyChecks) {
                                      // Show all weekly checks for this month
                                      return (
                                        <div key={hidx} className="flex flex-col gap-0.5">
                                          <div className="text-xs text-gray-500 font-medium mb-0.5">{h.monthName}</div>
                                          <div className="flex gap-0.5">
                                            {h.weeklyChecks.map((check, checkIdx) => (
                                              <div
                                                key={checkIdx}
                                                className={`w-7 h-7 rounded flex items-center justify-center text-xs font-medium ${
                                                  check.rank && check.rank <= 10 ? 'bg-green-500 text-white' :
                                                  check.rank && check.rank <= 30 ? 'bg-blue-500 text-white' :
                                                  check.rank && check.rank <= 100 ? 'bg-orange-500 text-white' :
                                                  'bg-gray-200 text-gray-500'
                                                }`}
                                                title={`${check.checkedDateFull || check.checkedDate}: ${check.rank ? `#${check.rank}` : 'Not ranked'}`}
                                              >
                                                {check.rank || '-'}
                                              </div>
                                            ))}
                                          </div>
                                          {h.rankRange && (
                                            <div className="text-xs text-gray-500 mt-0.5">
                                              {h.rankRange.min}-{h.rankRange.max} (avg: {h.rankRange.average})
                                            </div>
                                          )}
                                        </div>
                                      );
                                    } else {
                                      // Fallback: Show single month rank
                                      return (
                                        <div
                                          key={hidx}
                                          className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium ${
                                            h.rank && h.rank <= 10 ? 'bg-green-500 text-white' :
                                            h.rank && h.rank <= 30 ? 'bg-blue-500 text-white' :
                                            h.rank && h.rank <= 100 ? 'bg-orange-500 text-white' :
                                            'bg-gray-200 text-gray-500'
                                          }`}
                                          title={`${h.monthName}: ${h.rank ? `#${h.rank}` : 'Not ranked'}`}
                                        >
                                          {h.rank || '-'}
                                        </div>
                                      );
                                    }
                                  })}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Recent Month Comparison (Keep existing table) */}
                {monthlyData.comparisons && monthlyData.comparisons.length > 0 && (
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-gray-50">
                      <h2 className="text-lg font-semibold text-gray-900">Recent Month-over-Month Comparison</h2>
                      <p className="text-sm text-gray-600 mt-1">Comparing current month vs previous month</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keyword</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Rank</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Previous Rank</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">% Change</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {monthlyData.comparisons.map((comp, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{comp.keyword}</td>
                              <td className="px-4 py-3">
                                {comp.currentRank ? (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    comp.currentRank <= 10 ? 'bg-green-100 text-green-800' :
                                    comp.currentRank <= 30 ? 'bg-blue-100 text-blue-800' :
                                    'bg-orange-100 text-orange-800'
                                  }`}>
                                    #{comp.currentRank}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {comp.previousRank ? `#${comp.previousRank}` : '-'}
                              </td>
                              <td className="px-4 py-3">
                                {comp.change !== null ? (
                                  <span className={`flex items-center gap-1 text-sm font-medium ${
                                    comp.change > 0 ? 'text-green-600' :
                                    comp.change < 0 ? 'text-red-600' :
                                    'text-gray-600'
                                  }`}>
                                    {comp.change > 0 && (
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                    {comp.change < 0 && (
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                    {comp.change > 0 ? `+${comp.change}` : comp.change}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {comp.percentChange !== null ? (
                                  <span className={`text-sm font-medium ${
                                    parseFloat(comp.percentChange) > 0 ? 'text-green-600' :
                                    parseFloat(comp.percentChange) < 0 ? 'text-red-600' :
                                    'text-gray-600'
                                  }`}>
                                    {parseFloat(comp.percentChange) > 0 ? '+' : ''}{comp.percentChange}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  comp.status === 'improved' ? 'bg-green-100 text-green-800' :
                                  comp.status === 'declined' ? 'bg-red-100 text-red-800' :
                                  comp.status === 'unchanged' ? 'bg-gray-100 text-gray-800' :
                                  comp.status === 'new' || comp.status === 'now_ranking' ? 'bg-blue-100 text-blue-800' :
                                  comp.status === 'lost_ranking' ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {comp.status === 'now_ranking' ? 'New Ranking' : comp.status.replace('_', ' ')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

      </div>
    </Layout>
  );
}
