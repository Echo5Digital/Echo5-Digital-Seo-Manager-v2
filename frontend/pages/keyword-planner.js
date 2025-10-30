import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import useClientStore from '../store/clients';
import useKeywordPlannerStore from '../store/keywordPlanner';

export default function KeywordPlanner() {
  const clients = useClientStore(state => state.clients);
  const fetchClients = useClientStore(state => state.fetchClients);
  const analyzeKeywords = useKeywordPlannerStore(state => state.analyzeKeywords);
  
  const locationInputRef = useRef(null);
  
  const [selectedClientId, setSelectedClientId] = useState('');
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [fetchingLocations, setFetchingLocations] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [keywordIdeas, setKeywordIdeas] = useState([]);

  const selectedClient = clients.find(c => c._id === selectedClientId);

  const keywordCount = keywordsInput
    .split(/[\n,]/)
    .map(k => k.trim())
    .filter(k => k.length > 0).length;

  const averageSearchVolume = results.length === 0 ? 0 : 
    Math.round(results.reduce((sum, r) => sum + r.searchVolume, 0) / results.length);

  const lowCompetitionCount = results.filter(r => r.competition === 'Low').length;

  const averageCPC = results.length === 0 ? '0.00' :
    (results.reduce((sum, r) => sum + parseFloat(r.cpc), 0) / results.length).toFixed(2);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    console.log('Clients:', clients);
    console.log('Is Array:', Array.isArray(clients));
  }, [clients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (locationInputRef.current && !locationInputRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClientChange = (e) => {
    const clientId = e.target.value;
    setSelectedClientId(clientId);
    const client = clients.find(c => c._id === clientId);
    if (client && client.location) {
      setLocation(client.location);
    }
  };

  const handleLocationChange = async (e) => {
    const value = e.target.value;
    setLocation(value);
    
    if (value.length >= 2) {
      setFetchingLocations(true);
      try {
        // Using Nominatim (OpenStreetMap) geocoding API - free and no API key required
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&addressdetails=1&limit=10`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'SEO-Ops-KeywordPlanner/1.0'
            }
          }
        );
        
        const data = await response.json();
        
        // Format location suggestions with proper hierarchy
        const formatted = data.map(item => {
          const parts = [];
          
          if (item.address.city) parts.push(item.address.city);
          else if (item.address.town) parts.push(item.address.town);
          else if (item.address.village) parts.push(item.address.village);
          else if (item.address.municipality) parts.push(item.address.municipality);
          
          if (item.address.state) parts.push(item.address.state);
          if (item.address.country) parts.push(item.address.country);
          
          return {
            display: parts.length > 0 ? parts.join(', ') : item.display_name,
            full: item.display_name,
            type: item.type,
            importance: item.importance
          };
        });
        
        // Remove duplicates and sort by importance
        const unique = formatted.filter((item, index, self) => 
          index === self.findIndex(t => t.display === item.display)
        ).sort((a, b) => b.importance - a.importance);
        
        setLocationSuggestions(unique);
        setShowLocationDropdown(unique.length > 0);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setLocationSuggestions([]);
      } finally {
        setFetchingLocations(false);
      }
    } else {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
    }
  };

  const selectLocation = (locationObj) => {
    setLocation(locationObj.display);
    setShowLocationDropdown(false);
    setLocationSuggestions([]);
  };

  const useClientLocation = () => {
    if (selectedClient && selectedClient.location) {
      setLocation(selectedClient.location);
      setShowLocationDropdown(false);
    }
  };

  const handleAnalyzeKeywords = async () => {
    if (!keywordsInput.trim() || !location.trim()) return;

    setLoading(true);
    try {
      const keywords = keywordsInput
        .split(/[\n,]/)
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const response = await analyzeKeywords({
        keywords,
        location: location,
        clientId: selectedClientId || null,
      });

      setResults(response.data.results || []);
      setKeywordIdeas(response.data.ideas || []);
    } catch (error) {
      console.error('Failed to analyze keywords:', error);
    } finally {
      setLoading(false);
    }
  };

  const addIdeaToInput = (idea) => {
    const currentKeywords = keywordsInput
      .split(/[\n,]/)
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    if (!currentKeywords.includes(idea.keyword)) {
      setKeywordsInput([...currentKeywords, idea.keyword].join('\n'));
    }
  };

  const formatNumber = (num) => num.toLocaleString();

  const competitionClass = (competition) => {
    const classes = {
      'Low': 'bg-green-100 text-green-800',
      'Medium': 'bg-orange-100 text-orange-800',
      'High': 'bg-red-100 text-red-800',
    };
    return classes[competition] || 'bg-gray-100 text-gray-800';
  };

  const intentClass = (intent) => {
    const classes = {
      'Informational': 'bg-blue-100 text-blue-800',
      'Navigational': 'bg-purple-100 text-purple-800',
      'Transactional': 'bg-green-100 text-green-800',
      'Commercial': 'bg-orange-100 text-orange-800',
    };
    return classes[intent] || 'bg-gray-100 text-gray-800';
  };

  const difficultyColor = (difficulty) => {
    if (difficulty <= 30) return 'bg-green-500';
    if (difficulty <= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Keyword Planner</h1>
            <p className="text-sm text-gray-600 mt-1">Research keywords with search volume, competition, and CPC data</p>
          </div>
        </div>

      {/* Input Section */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Client Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Client</label>
            <select
              value={selectedClientId}
              onChange={handleClientChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Select a client --</option>
              {Array.isArray(clients) && clients.map((client) => (
                <option key={client._id} value={client._id}>
                  {client.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {Array.isArray(clients) ? `${clients.length} clients available` : 'Loading clients...'}
            </p>
          </div>

          {/* Location Picker */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Target Location</label>
            <div className="flex gap-2">
              <div className="flex-1 relative" ref={locationInputRef}>
                <input
                  value={location}
                  onChange={handleLocationChange}
                  onFocus={() => location && locationSuggestions.length > 0 && setShowLocationDropdown(true)}
                  type="text"
                  placeholder="Type a location (city, state, or country)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                {/* Loading indicator */}
                {fetchingLocations && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
                
                {/* Location Suggestions Dropdown */}
                {showLocationDropdown && locationSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {locationSuggestions.map((locObj, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectLocation(locObj)}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-b-0"
                      >
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{locObj.display}</div>
                            {locObj.full !== locObj.display && (
                              <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{locObj.full}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedClient && (
                <button
                  onClick={useClientLocation}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg whitespace-nowrap"
                >
                  Use Client Location
                </button>
              )}
            </div>
            {selectedClient && selectedClient.location && (
              <p className="text-xs text-gray-500 mt-1">
                Client location: {selectedClient.location}
              </p>
            )}
          </div>
        </div>

        {/* Keyword Input */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Enter Keywords</label>
          <textarea
            value={keywordsInput}
            onChange={(e) => setKeywordsInput(e.target.value)}
            placeholder="Enter keywords (one per line or comma-separated)&#10;Example:&#10;web development kochi&#10;seo services kerala&#10;digital marketing"
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            {keywordCount} keyword(s) entered
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleAnalyzeKeywords}
          disabled={loading || !keywordsInput.trim() || !location.trim()}
          className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span>
              <svg className="inline-block animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </span>
          ) : (
            'Get Keyword Data'
          )}
        </button>
      </div>

      {/* Results Section */}
      {results.length > 0 ? (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-gray-600">Total Keywords</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{results.length}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-gray-600">Avg. Monthly Searches</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{averageSearchVolume.toLocaleString()}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-gray-600">Low Competition</div>
              <div className="text-2xl font-bold text-green-600 mt-1">{lowCompetitionCount}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-gray-600">Avg. CPC</div>
              <div className="text-2xl font-bold text-purple-600 mt-1">${averageCPC}</div>
            </div>
          </div>

          {/* Keywords Table */}
          <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Keyword Data</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Keyword</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Avg. Monthly Searches</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Competition</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">CPC</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Intent</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Difficulty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((result, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{result.keyword}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatNumber(result.searchVolume)}</td>
                      <td className="px-4 py-3">
                        <span className={`${competitionClass(result.competition)} inline-flex items-center px-2 py-1 rounded-full text-xs font-medium`}>
                          {result.competition}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">${result.cpc}</td>
                      <td className="px-4 py-3">
                        <span className={`${intentClass(result.intent)} inline-flex items-center px-2 py-1 rounded-full text-xs font-medium`}>
                          {result.intent}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div style={{ width: `${result.difficulty}%` }} className={`${difficultyColor(result.difficulty)} h-2 rounded-full`}></div>
                          </div>
                          <span className="text-xs text-gray-600 w-8">{result.difficulty}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Keyword Ideas Section */}
          {keywordIdeas.length > 0 && (
            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Related Keyword Ideas</h2>
                <p className="text-sm text-gray-600 mt-1">AI-generated keyword suggestions based on your input</p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {keywordIdeas.map((idea, idx) => (
                    <div 
                      key={idx} 
                      className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer" 
                      onClick={() => addIdeaToInput(idea)}
                    >
                      <div className="font-medium text-sm text-gray-900 mb-1">{idea.keyword}</div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span>Vol: {formatNumber(idea.volume)}</span>
                        <span className={
                          idea.competition === 'Low' ? 'text-green-600' :
                          idea.competition === 'Medium' ? 'text-orange-600' : 'text-red-600'
                        }>
                          {idea.competition}
                        </span>
                        <span className="text-purple-600">${idea.cpc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : !loading ? (
        <div className="bg-white border rounded-lg p-12 text-center shadow-sm">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No keyword data yet</h3>
          <p className="text-sm text-gray-600">Enter keywords above and click "Get Keyword Data" to start your research</p>
        </div>
      ) : null}
    </div>
    </Layout>
  );
}
