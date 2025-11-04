import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../../components/Layout'
import useAuthStore from '../../../store/auth'
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export default function ClientIntegrations() {
  const router = useRouter()
  const { id } = router.query
  const { token, user } = useAuthStore()
  
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  
  const [formData, setFormData] = useState({
    ga4PropertyId: '',
    gscSiteUrl: '',
    gbpLocationIds: []
  })

  const [gbpAccounts, setGbpAccounts] = useState([])
  const [gbpLocations, setGbpLocations] = useState([])
  const [loadingGBP, setLoadingGBP] = useState(false)

  useEffect(() => {
    if (token && id) {
      fetchClient()
    }
    
    // Listen for messages from OAuth popup
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'GBP_AUTH_SUCCESS') {
        setMessage({ type: 'success', text: 'Google Business Profile connected successfully!' });
        // Refresh client data to get updated integration status
        fetchClient();
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [token, id])

  const fetchClient = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/clients/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const result = await response.json()
      if (result.status === 'success') {
        setClient(result.data)
        setFormData({
          ga4PropertyId: result.data.integrations?.ga4PropertyId || '',
          gscSiteUrl: result.data.integrations?.gscSiteUrl || '',
          gbpLocationIds: result.data.integrations?.gbpLocationIds || []
        })
      }
    } catch (error) {
      console.error('Failed to fetch client:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/clients/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            integrations: {
              ...client.integrations,
              ga4PropertyId: formData.ga4PropertyId,
              gscSiteUrl: formData.gscSiteUrl,
              gbpLocationIds: formData.gbpLocationIds
            }
          }),
        }
      )
      
      const result = await response.json()
      if (result.status === 'success') {
        setMessage({ type: 'success', text: 'Integration settings saved successfully!' })
        fetchClient()
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const connectGBP = async () => {
    try {
      console.log('Fetching GBP auth URL...');
      
      // Open popup immediately to avoid popup blockers
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        'about:blank',
        'Google Business Profile Authorization',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,copyhistory=no`
      );
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/gbp/auth-url`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const result = await response.json()
      console.log('GBP auth response:', JSON.stringify(result, null, 2));
      console.log('result.data:', result.data);
      console.log('result.data.authUrl:', result.data?.authUrl);
      
      if (result.status === 'success' && result.data && result.data.authUrl) {
        console.log('Opening OAuth URL in popup:', result.data.authUrl);
        // Set the popup location to the OAuth URL
        popup.location.href = result.data.authUrl;
        setMessage({ type: 'success', text: 'Opening Google authorization window...' });
      } else {
        if (popup) popup.close();
        console.error('Invalid response:', result);
        setMessage({ type: 'error', text: result.message || 'Failed to get auth URL - invalid response' });
      }
    } catch (error) {
      console.error('GBP connection error:', error);
      setMessage({ type: 'error', text: 'Failed to initiate GBP connection: ' + error.message })
    }
  }

  const loadGBPLocations = async () => {
    setLoadingGBP(true)
    try {
      // First, get accounts
      const accountsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/gbp/accounts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const accountsResult = await accountsResponse.json()
      
      if (accountsResult.status === 'success' && accountsResult.data.accounts.length > 0) {
        setGbpAccounts(accountsResult.data.accounts)
        
        // Get locations for the first account
        const accountName = accountsResult.data.accounts[0].name
        const locationsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/gbp/locations?accountName=${encodeURIComponent(accountName)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        const locationsResult = await locationsResponse.json()
        
        if (locationsResult.status === 'success') {
          setGbpLocations(locationsResult.data.locations)
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load GBP locations' })
    } finally {
      setLoadingGBP(false)
    }
  }

  const toggleLocation = (locationId) => {
    setFormData(prev => ({
      ...prev,
      gbpLocationIds: prev.gbpLocationIds.includes(locationId)
        ? prev.gbpLocationIds.filter(id => id !== locationId)
        : [...prev.gbpLocationIds, locationId]
    }))
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    )
  }

  if (!client) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Client not found</p>
        </div>
      </Layout>
    )
  }

  // Check if user has permission
  const canEdit = ['Boss', 'Manager', 'Admin'].includes(user?.role)

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Integration Settings</h1>
          <p className="text-gray-600 mt-2">Configure Google Analytics, Search Console, and Business Profile for {client.name}</p>
        </div>

        {message && (
          <div
            className={`${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            } border rounded-lg p-4 flex items-start gap-2`}
          >
            {message.type === 'success' ? (
              <CheckCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p>{message.text}</p>
          </div>
        )}

        {!canEdit && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">You don't have permission to edit integration settings.</p>
          </div>
        )}

        {/* Google Analytics 4 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Google Analytics 4</h2>
              <p className="text-sm text-gray-500 mt-1">
                Enter your GA4 Property ID (e.g., 123456789)
              </p>
            </div>
            {formData.ga4PropertyId && (
              <CheckCircleIcon className="w-6 h-6 text-green-500" />
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GA4 Property ID
            </label>
            <input
              type="text"
              name="ga4PropertyId"
              value={formData.ga4PropertyId}
              onChange={handleChange}
              disabled={!canEdit}
              placeholder="123456789"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-2">
              Find this in GA4: Admin → Property Settings → Property ID
            </p>
          </div>
        </div>

        {/* Google Search Console */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Google Search Console</h2>
              <p className="text-sm text-gray-500 mt-1">
                Enter the full site URL (e.g., https://example.com)
              </p>
            </div>
            {formData.gscSiteUrl && (
              <CheckCircleIcon className="w-6 h-6 text-green-500" />
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site URL
            </label>
            <input
              type="url"
              name="gscSiteUrl"
              value={formData.gscSiteUrl}
              onChange={handleChange}
              disabled={!canEdit}
              placeholder="https://example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-2">
              Must match exactly as shown in Search Console (include https://)
            </p>
          </div>
        </div>

        {/* Google Business Profile */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Google Business Profile</h2>
              <p className="text-sm text-gray-500 mt-1">
                Connect your Google Business Profile to view insights
              </p>
            </div>
            {formData.gbpLocationIds.length > 0 && (
              <CheckCircleIcon className="w-6 h-6 text-green-500" />
            )}
          </div>

          {canEdit && (
            <div className="space-y-4">
              <button
                onClick={connectGBP}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Google Business Profile
              </button>

              <button
                onClick={loadGBPLocations}
                disabled={loadingGBP}
                className="ml-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400 flex items-center gap-2"
              >
                {loadingGBP && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                Load Locations
              </button>

              {gbpLocations.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Select Locations:</p>
                  <div className="space-y-2">
                    {gbpLocations.map((location) => (
                      <label key={location.name} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.gbpLocationIds.includes(location.name)}
                          onChange={() => toggleLocation(location.name)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">
                          {location.title || location.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formData.gbpLocationIds.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected Locations: {formData.gbpLocationIds.length}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save Button */}
        {canEdit && (
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 flex items-center gap-2"
            >
              {saving && <ArrowPathIcon className="w-5 h-5 animate-spin" />}
              {saving ? 'Saving...' : 'Save Integration Settings'}
            </button>
          </div>
        )}

        {/* Setup Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Setup Instructions</h3>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <p className="font-medium">Google Analytics 4:</p>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Go to GA4 Admin → Property Settings</li>
                <li>Copy the Property ID (numeric only)</li>
                <li>The service account email must have Viewer access to this property</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">Google Search Console:</p>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Add the service account email as a user in Search Console</li>
                <li>Grant Full or Owner permissions</li>
                <li>Enter the exact site URL as shown in GSC</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">Google Business Profile:</p>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Click "Connect Google Business Profile"</li>
                <li>Sign in with your Google account that manages the business</li>
                <li>Grant the requested permissions</li>
                <li>After connecting, click "Load Locations" to see available locations</li>
                <li>Select the locations you want to track</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
