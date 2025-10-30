import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import useClientStore from '../store/clients';
import useKeywordPlannerStore from '../store/keywordPlanner';
import useKeywordStore from '../store/keywords';

export default function RankChecker() {
  const clients = useClientStore(state => state.clients);
  const fetchClients = useClientStore(state => state.fetchClients);
  const checkRank = useKeywordPlannerStore(state => state.checkRank);
  const keywords = useKeywordStore(state => state.keywords);
  const fetchKeywords = useKeywordStore(state => state.fetchKeywords);
  
  const [rankClientId, setRankClientId] = useState('');
  const [rankDomain, setRankDomain] = useState('');
  const [rankKeyword, setRankKeyword] = useState('');
  const [rankLocation, setRankLocation] = useState('');
  const [checkingRank, setCheckingRank] = useState(false);
  const [rankResult, setRankResult] = useState(null);
  const [rankHistory, setRankHistory] = useState([]);
  const [rankError, setRankError] = useState(null);
  const [keywordSuggestions, setKeywordSuggestions] = useState([]);
  const [showKeywordDropdown, setShowKeywordDropdown] = useState(false);
  const keywordInputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchClients();
    fetchKeywords();
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
        
        // Add to history
        setRankHistory(prev => [{
          ...resp.data,
          id: Date.now(),
          domain: rankDomain,
          keyword: rankKeyword
        }, ...prev.slice(0, 9)]); // Keep last 10 results
      } else if (resp && resp.status === 'error') {
        setRankError(resp.message || 'Rank check failed');
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
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

        {/* Rank History */}
        {rankHistory.length > 0 && (
          <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Recent Checks</h2>
              <p className="text-sm text-gray-600 mt-1">Your last {rankHistory.length} rank checks</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Domain</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Keyword</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Difficulty</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Checked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rankHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.domain}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.keyword}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.location || 'Global'}</td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-sm text-gray-700">{item.difficulty}/100</td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(item.checkedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
      </div>
    </Layout>
  );
}
