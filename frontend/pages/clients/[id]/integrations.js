import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../../components/Layout'
import useAuthStore from '../../../store/auth'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowPathIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function ClientIntegrations() {
  const router = useRouter()
  const { id } = router.query
  const { token, user } = useAuthStore()
  
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [gbpConnected, setGbpConnected] = useState(false)
  
  // GA4 state
  const [ga4PropertyId, setGa4PropertyId] = useState('')
  const [ga4Properties, setGa4Properties] = useState([])
  const [loadingGA4, setLoadingGA4] = useState(false)
  const [ga4Discovered, setGa4Discovered] = useState(false)
  
  // GSC state
  const [gscSiteUrl, setGscSiteUrl] = useState('')
  const [gscSites, setGscSites] = useState([])
  const [loadingGSC, setLoadingGSC] = useState(false)
  const [gscDiscovered, setGscDiscovered] = useState(false)
  
  // GBP state
  const [gbpLocationIds, setGbpLocationIds] = useState([])
  const [gbpAccounts, setGbpAccounts] = useState([])
  const [gbpLocations, setGbpLocations] = useState([])
  const [loadingGBP, setLoadingGBP] = useState(false)
  const [selectedGbpAccount, setSelectedGbpAccount] = useState('')
  const [gbpRateLimitCountdown, setGbpRateLimitCountdown] = useState(0)

  // WordPress Plugin state
  const [wpPluginApiKey, setWpPluginApiKey] = useState('')
  const [wpPluginSiteUrl, setWpPluginSiteUrl] = useState('')
  const [wpPluginStatus, setWpPluginStatus] = useState(null)
  const [testingWpPlugin, setTestingWpPlugin] = useState(false)
  const [savingWpPlugin, setSavingWpPlugin] = useState(false)

  const SERVICE_ACCOUNT_EMAIL = 'echo5-analytics-service@capable-epigram-473210-v8.iam.gserviceaccount.com'

  useEffect(() => {
    if (token && id) {
      fetchClient()
      fetchWpPluginStatus()
    }
    
    // Listen for messages from OAuth popup
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return
      
      if (event.data.type === 'GBP_AUTH_SUCCESS') {
        setMessage({ type: 'success', text: 'Google Business Profile connected successfully!' })
        setGbpConnected(true)
        // Don't refetch client - it won't have any new data and will reset form fields
        // fetchClient()
      }
    }
    
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
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
        const fetchedClient = result.data.client
        setClient(fetchedClient)
        setGa4PropertyId(fetchedClient?.integrations?.ga4PropertyId || '')
        setGscSiteUrl(fetchedClient?.integrations?.gscSiteUrl || '')
        setGbpLocationIds(fetchedClient?.integrations?.gbpLocationIds || [])
        setWpPluginSiteUrl(fetchedClient?.website || '')
      }
    } catch (error) {
      console.error('Failed to fetch client:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch WordPress Plugin Status
  const fetchWpPluginStatus = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/clients/${id}/wordpress-plugin/status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const result = await response.json()
      console.log('WordPress Plugin Status:', result)
      if (result.status === 'success') {
        console.log('Setting WP Plugin Status:', result.data)
        setWpPluginStatus(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch WordPress plugin status:', error)
    }
  }

  // Configure WordPress Plugin
  const configureWpPlugin = async () => {
    console.log('Configure Plugin clicked!')
    console.log('API Key:', wpPluginApiKey ? 'Present' : 'Missing')
    console.log('Site URL:', wpPluginSiteUrl)
    
    if (!wpPluginApiKey) {
      console.log('No API key - showing error')
      setMessage({ type: 'error', text: 'Please enter an API key' })
      return
    }

    setSavingWpPlugin(true)
    setMessage(null)
    console.log('Sending configure request...')

    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE}/api/clients/${id}/wordpress-plugin/configure`
      console.log('POST to:', url)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          apiKey: wpPluginApiKey,
          siteUrl: wpPluginSiteUrl || client?.website
        }),
      })
      
      console.log('Response status:', response.status)
      const result = await response.json()
      console.log('Response data:', result)

      if (result.status === 'success') {
        console.log('Configuration successful!')
        setMessage({ type: 'success', text: 'WordPress plugin configured successfully!' })
        setWpPluginApiKey('') // Clear for security
        await fetchWpPluginStatus()
      } else {
        console.error('Configuration failed:', result.message)
        setMessage({ type: 'error', text: result.message || 'Failed to configure plugin' })
      }
    } catch (error) {
      console.error('Failed to configure WordPress plugin:', error)
      setMessage({ type: 'error', text: `Failed to configure WordPress plugin: ${error.message}` })
    } finally {
      setSavingWpPlugin(false)
      console.log('Configure plugin finished')
    }
  }

  // Test WordPress Plugin Connection
  const testWpPlugin = async () => {
    setTestingWpPlugin(true)
    setMessage(null)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/clients/${id}/wordpress-plugin/test`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const result = await response.json()

      if (result.status === 'success' && result.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Plugin connected! Version: ${result.data.data?.version || 'Unknown'}` 
        })
        fetchWpPluginStatus()
      } else {
        setMessage({ 
          type: 'error', 
          text: result.data?.message || 'Plugin connection test failed' 
        })
      }
    } catch (error) {
      console.error('Failed to test WordPress plugin:', error)
      setMessage({ type: 'error', text: 'Failed to test plugin connection' })
    } finally {
      setTestingWpPlugin(false)
    }
  }

  // Auto-discover GA4 properties
  const discoverGA4Properties = async () => {
    setLoadingGA4(true)
    setMessage(null)
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/ga4/properties`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const result = await response.json()
      
      if (result.status === 'success') {
        setGa4Properties(result.data)
        setGa4Discovered(true)
        setMessage({ 
          type: 'success', 
          text: `Found ${result.data.length} GA4 properties` 
        })
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message || 'Failed to discover GA4 properties' 
        })
      }
    } catch (error) {
      console.error('Failed to discover GA4 properties:', error)
      setMessage({ 
        type: 'error', 
        text: 'Failed to discover GA4 properties. Make sure the service account has access.' 
        })
    } finally {
      setLoadingGA4(false)
    }
  }

  // Auto-discover GSC sites
  const discoverGSCSites = async () => {
    setLoadingGSC(true)
    setMessage(null)
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/gsc/sites`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const result = await response.json()
      
      if (result.status === 'success') {
        setGscSites(result.data)
        setGscDiscovered(true)
        setMessage({ 
          type: 'success', 
          text: `Found ${result.data.length} Search Console sites` 
        })
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message || 'Failed to discover GSC sites' 
        })
      }
    } catch (error) {
      console.error('Failed to discover GSC sites:', error)
      setMessage({ 
        type: 'error', 
        text: 'Failed to discover Search Console sites. Make sure the service account has access.' 
      })
    } finally {
      setLoadingGSC(false)
    }
  }

  // Connect GBP
  const connectGBP = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/gbp/auth-url`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const result = await response.json()
      
      if (result.status === 'success') {
        const popup = window.open(
          result.data.authUrl,
          'GBP Authentication',
          'width=600,height=700'
        )
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message || 'Failed to get GBP auth URL' 
        })
      }
    } catch (error) {
      console.error('Failed to connect GBP:', error)
      setMessage({ 
        type: 'error', 
        text: 'Failed to connect Google Business Profile' 
      })
    }
  }

  // Load GBP accounts
  const loadGBPAccounts = async () => {
    setLoadingGBP(true)
    setMessage(null)
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/gbp/accounts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const result = await response.json()
      
      if (result.status === 'success' || result.status === 'warning') {
        setGbpAccounts(result.data?.accounts || result.data || [])
        setGbpConnected(true)
        
        // Handle quota exceeded with warning
        if (result.status === 'warning' || result.data?.quotaExceeded) {
          setMessage({ 
            type: 'warning', 
            text: result.message || 'Google Business Profile API quota temporarily exceeded. Please wait 1-2 minutes and try again.'
          })
        } else {
          const accountCount = result.data?.accounts?.length || result.data?.length || 0
          setMessage({ 
            type: 'success', 
            text: `Found ${accountCount} business account${accountCount !== 1 ? 's' : ''}` 
          })
        }
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message || 'Failed to load GBP accounts. Please reconnect.' 
        })
      }
    } catch (error) {
      console.error('Failed to load GBP accounts:', error)
      setMessage({ 
        type: 'error', 
        text: 'Failed to load business accounts' 
      })
    } finally {
      setLoadingGBP(false)
    }
  }

  // Load GBP locations
  const loadGBPLocations = async (accountName) => {
    if (!accountName) return
    
    setLoadingGBP(true)
    setMessage(null)
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/gbp/locations?accountName=${encodeURIComponent(accountName)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const result = await response.json()
      
      if (result.status === 'success') {
        setGbpLocations(result.data)
        setMessage({ 
          type: 'success', 
          text: `Found ${result.data.length} locations` 
        })
      } else {
        // Check for quota error
        if (result.message && result.message.includes('Quota exceeded')) {
          const retryAfter = result.retryAfter || 'later'
          setMessage({ 
            type: 'error', 
            text: `Google Business Profile API quota exceeded. Please try again ${retryAfter}.` 
          })
        } else {
          setMessage({ 
            type: 'error', 
            text: result.message || 'Failed to load locations' 
          })
        }
      }
    } catch (error) {
      console.error('Failed to load GBP locations:', error)
      setMessage({ 
        type: 'error', 
        text: 'Failed to load locations' 
      })
    } finally {
      setLoadingGBP(false)
    }
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
              ...(client?.integrations || {}),
              ga4PropertyId,
              gscSiteUrl,
              gbpLocationIds
            }
          })
        }
      )
      
      const result = await response.json()
      
      if (result.status === 'success') {
        setClient(result.data.client)
        setMessage({ 
          type: 'success', 
          text: 'Integration settings saved successfully!' 
        })
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message || 'Failed to save settings' 
        })
      }
    } catch (error) {
      console.error('Failed to save:', error)
      setMessage({ 
        type: 'error', 
        text: 'Failed to save integration settings' 
      })
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setMessage({ type: 'success', text: 'Copied to clipboard!' })
  }

  // Check if user can edit
  const canEdit = user && ['Boss', 'Manager', 'Admin', 'Staff'].includes(user.role)

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </Layout>
    )
  }

  if (!client) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Client not found</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Integration Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Connect Google services for {client.name}
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${ message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex">
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 mr-2" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* GA4 Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  Google Analytics 4
                  {ga4PropertyId && (
                    <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                  )}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Track website traffic and user behavior
                </p>
              </div>
            </div>

            {/* Service Account Info */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-2">
                📋 Service Account Email:
              </p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-white px-2 py-1 rounded border border-blue-300 flex-1">
                  {SERVICE_ACCOUNT_EMAIL}
                </code>
                <button
                  onClick={() => copyToClipboard(SERVICE_ACCOUNT_EMAIL)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                  title="Copy to clipboard"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Add this email with "Viewer" access to your GA4 property
              </p>
            </div>

            {/* Auto-Discover Button */}
            <div className="mb-4">
              <button
                onClick={discoverGA4Properties}
                disabled={loadingGA4 || !canEdit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loadingGA4 ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-5 w-5" />
                    Auto-Discover Properties
                  </>
                )}
              </button>
            </div>

            {/* Property Dropdown */}
            {ga4Discovered && ga4Properties.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Property
                </label>
                <select
                  value={ga4PropertyId}
                  onChange={(e) => setGa4PropertyId(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">-- Select a property --</option>
                  {ga4Properties.map((prop) => (
                    <option key={prop.propertyId} value={prop.propertyId}>
                      {prop.displayName} ({prop.propertyId}) - {prop.websiteUrl || 'No URL'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Manual Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Enter Property ID Manually
              </label>
              <input
                type="text"
                value={ga4PropertyId}
                onChange={(e) => setGa4PropertyId(e.target.value)}
                disabled={!canEdit}
                placeholder="e.g., 123456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                Find in GA4: Admin → Property Settings → Property ID
              </p>
            </div>
          </div>

          {/* GSC Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  Google Search Console
                  {gscSiteUrl && (
                    <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                  )}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Monitor search performance and SEO metrics
                </p>
              </div>
            </div>

            {/* Service Account Info */}
            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-900 font-medium mb-2">
                📋 Service Account Email:
              </p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-white px-2 py-1 rounded border border-purple-300 flex-1">
                  {SERVICE_ACCOUNT_EMAIL}
                </code>
                <button
                  onClick={() => copyToClipboard(SERVICE_ACCOUNT_EMAIL)}
                  className="p-2 text-purple-600 hover:bg-purple-100 rounded"
                  title="Copy to clipboard"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-purple-700 mt-2">
                Add this email with "Owner" or "Full" access to your Search Console property
              </p>
            </div>

            {/* Auto-Discover Button */}
            <div className="mb-4">
              <button
                onClick={discoverGSCSites}
                disabled={loadingGSC || !canEdit}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loadingGSC ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-5 w-5" />
                    Auto-Discover Sites
                  </>
                )}
              </button>
            </div>

            {/* Site Dropdown */}
            {gscDiscovered && gscSites.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Site
                </label>
                <select
                  value={gscSiteUrl}
                  onChange={(e) => setGscSiteUrl(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">-- Select a site --</option>
                  {gscSites.map((site) => (
                    <option key={site.siteUrl} value={site.siteUrl}>
                      {site.siteUrl} ({site.permissionLevel})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Manual Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Enter Site URL Manually
              </label>
              <input
                type="text"
                value={gscSiteUrl}
                onChange={(e) => setGscSiteUrl(e.target.value)}
                disabled={!canEdit}
                placeholder="e.g., https://example.com/ or sc-domain:example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                URL prefix: https://example.com/ | Domain property: sc-domain:example.com
              </p>
            </div>
          </div>

          {/* GBP Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  Google Business Profile
                  {gbpLocationIds.length > 0 && (
                    <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                  )}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage business listings and local SEO
                </p>
              </div>
            </div>

            {/* Connect Button */}
            <div className="mb-4">
              <button
                onClick={connectGBP}
                disabled={!canEdit}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {gbpConnected ? 'Reconnect' : 'Connect'} Google Business Profile
              </button>
            </div>

            {gbpConnected && (
              <>
                <div className="mb-4">
                  <button
                    onClick={loadGBPAccounts}
                    disabled={loadingGBP || !canEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingGBP ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load Business Accounts'
                    )}
                  </button>
                </div>

                {gbpAccounts.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Business Account
                    </label>
                    <select
                      value={selectedGbpAccount}
                      onChange={(e) => {
                        setSelectedGbpAccount(e.target.value)
                        loadGBPLocations(e.target.value)
                      }}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">-- Select an account --</option>
                      {gbpAccounts.map((account) => (
                        <option key={account.name} value={account.name}>
                          {account.accountName || account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {gbpLocations.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Locations
                    </label>
                    <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                      {gbpLocations.map((location) => (
                        <label
                          key={location.name}
                          className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={gbpLocationIds.includes(location.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setGbpLocationIds([...gbpLocationIds, location.name])
                              } else {
                                setGbpLocationIds(gbpLocationIds.filter(id => id !== location.name))
                              }
                            }}
                            disabled={!canEdit}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {location.title} - {location.address || 'No address'}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Selected: {gbpLocationIds.length} location(s)
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* WordPress Plugin Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  WordPress Plugin Integration
                  {wpPluginStatus?.status === 'active' && (
                    <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                  )}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Direct content access via Echo5 SEO Exporter plugin (100x faster than scraping)
                </p>
              </div>
            </div>

            {/* Plugin Status */}
            {wpPluginStatus ? (
              wpPluginStatus.hasApiKey ? (
                <div className={`mb-4 p-3 rounded-lg border ${
                  wpPluginStatus.status === 'active' 
                    ? 'bg-green-50 border-green-200' 
                    : wpPluginStatus.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Status: <span className={`${
                          wpPluginStatus.status === 'active' ? 'text-green-700' :
                          wpPluginStatus.status === 'error' ? 'text-red-700' :
                          'text-gray-700'
                        }`}>
                          {wpPluginStatus.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </p>
                      {wpPluginStatus.pluginVersion && (
                        <p className="text-xs text-gray-600 mt-1">
                          Plugin v{wpPluginStatus.pluginVersion}
                        </p>
                      )}
                      {wpPluginStatus.lastSync && (
                        <p className="text-xs text-gray-600">
                          Last sync: {new Date(wpPluginStatus.lastSync).toLocaleString()}
                        </p>
                      )}
                      {wpPluginStatus.errorMessage && (
                        <p className="text-xs text-red-600 mt-1">
                          Error: {wpPluginStatus.errorMessage}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={testWpPlugin}
                      disabled={testingWpPlugin}
                      className="ml-4 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
                      title={testingWpPlugin ? 'Testing...' : 'Click to test plugin connection'}
                    >
                      {testingWpPlugin ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        'Test Connection'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ No API key configured. Please enter an API key below and click "Configure Plugin".
                  </p>
                </div>
              )
            ) : (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  Loading plugin status...
                </p>
              </div>
            )}

            {/* Configuration Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WordPress Site URL
                </label>
                <input
                  type="url"
                  value={wpPluginSiteUrl}
                  onChange={(e) => setWpPluginSiteUrl(e.target.value)}
                  placeholder="https://your-site.com"
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plugin API Key
                  <span className="text-xs text-gray-500 ml-2">
                    (Get from WordPress → Settings → Echo5 SEO Exporter)
                  </span>
                </label>
                <input
                  type="text"
                  value={wpPluginApiKey}
                  onChange={(e) => setWpPluginApiKey(e.target.value)}
                  placeholder="echo5_xxxxxxxxxxxxx"
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={configureWpPlugin}
                  disabled={!wpPluginApiKey || savingWpPlugin || !canEdit}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {savingWpPlugin ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {wpPluginStatus?.hasApiKey ? 'Update' : 'Configure'} Plugin
                    </>
                  )}
                </button>
              </div>

              {/* Installation Instructions */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  📦 Plugin Installation:
                </p>
                <ol className="text-xs text-blue-800 space-y-1 ml-4 list-decimal">
                  <li>Download plugin from <code className="bg-white px-1 rounded">wordpress-plugin/echo5-seo-exporter.zip</code></li>
                  <li>In WordPress: Plugins → Add New → Upload Plugin</li>
                  <li>Activate the plugin</li>
                  <li>Go to Settings → Echo5 SEO Exporter</li>
                  <li>Copy the API key and paste it above</li>
                  <li>Click "Configure Plugin" then "Test Connection"</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {canEdit && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Save Integration Settings'
                )}
              </button>
            </div>
          )}

          {!canEdit && (
            <div className="text-center text-sm text-gray-600 italic">
              You don't have permission to edit integration settings
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
