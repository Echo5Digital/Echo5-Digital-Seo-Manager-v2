import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import ClientOnboardingForm from '../src/components/client/ClientOnboardingForm'
import useClientStore from '../store/clients'
import { PlusIcon, TrashIcon, PencilIcon, EyeIcon } from '@heroicons/react/24/outline'

export default function Clients() {
  const router = useRouter()
  const clients = useClientStore(state => state.clients)
  const fetchClients = useClientStore(state => state.fetchClients)
  const addClient = useClientStore(state => state.addClient)
  const updateClient = useClientStore(state => state.updateClient)
  const deleteClient = useClientStore(state => state.deleteClient)

  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [viewingClient, setViewingClient] = useState(null)
  const [deletingClient, setDeletingClient] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchClients()
      } catch (error) {
        console.error('Error loading clients:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [fetchClients])

  const handleClientComplete = async (clientData) => {
    try {
      console.log('Submitting client data:', clientData)
      
      if (editingClient) {
        await updateClient(editingClient._id, clientData)
        setEditingClient(null)
      } else {
        await addClient(clientData)
      }
      
      setShowOnboarding(false)
      
    } catch (error) {
      console.error('Failed to save client:', error)
      alert(`Failed to save client: ${error.message || 'Unknown error'}`)
    }
  }

  const handleEdit = (client) => {
    // Convert client data to form format for editing
    const clientFormData = {
      name: client.name,
      industry: client.industry || '',
      website: client.website || `https://${client.domain}`,
      locations: client.locations && client.locations.length > 0 
        ? client.locations.map(loc => ({
            city: loc.city || '',
            state: loc.state || '',
            country: loc.country || 'US',
            zip: loc.zip || '',
            radius: loc.radius || 25,
            radiusUnit: loc.radiusUnit || 'miles'
          }))
        : [{ city: '', state: '', country: 'US', zip: '', radius: 25, radiusUnit: 'miles' }],
      services: client.services && client.services.length > 0 ? client.services : [''],
      competitors: client.competitors && client.competitors.length > 0 ? client.competitors : [''],
      primaryKeywords: client.primaryKeywords && client.primaryKeywords.length > 0 
        ? client.primaryKeywords 
        : [{ keyword: '', priority: 1, targetLocation: '', notes: '' }],
      secondaryKeywords: client.secondaryKeywords && client.secondaryKeywords.length > 0 
        ? client.secondaryKeywords 
        : [{ keyword: '', targetLocation: '', notes: '' }],
      seedKeywords: client.seedKeywords && client.seedKeywords.length > 0 
        ? client.seedKeywords 
        : [{ keyword: '', searchVolume: '', difficulty: '', intent: 'informational', source: 'manual' }],
      integrations: client.integrations || {
        googleSearchConsole: false,
        googleAnalytics: false,
        googleBusinessProfile: false,
      }
    }

    setEditingClient(client)
    setShowOnboarding(true)
  }

  const handleDelete = async (id) => {
    try {
      await deleteClient(id)
      setDeletingClient(null)
    } catch (error) {
      alert('Failed to delete client')
      setDeletingClient(null)
    }
  }

  const handleView = (client) => {
    setViewingClient(client)
  }

  if (showOnboarding) {
    return (
      <ClientOnboardingForm
        initialData={editingClient ? {
          name: editingClient.name,
          industry: editingClient.industry || '',
          website: editingClient.website || `https://${editingClient.domain}`,
          locations: editingClient.locations && editingClient.locations.length > 0 
            ? editingClient.locations.map(loc => ({
                city: loc.city || '',
                state: loc.state || '',
                country: loc.country || 'US',
                zip: loc.zip || '',
                radius: loc.radius || 25,
                radiusUnit: loc.radiusUnit || 'miles'
              }))
            : [{ city: '', state: '', country: 'US', zip: '', radius: 25, radiusUnit: 'miles' }],
          services: editingClient.services && editingClient.services.length > 0 ? editingClient.services : [''],
          competitors: editingClient.competitors && editingClient.competitors.length > 0 ? editingClient.competitors : [''],
          primaryKeywords: editingClient.primaryKeywords && editingClient.primaryKeywords.length > 0 
            ? editingClient.primaryKeywords 
            : [{ keyword: '', priority: 1, targetLocation: '', notes: '' }],
          secondaryKeywords: editingClient.secondaryKeywords && editingClient.secondaryKeywords.length > 0 
            ? editingClient.secondaryKeywords 
            : [{ keyword: '', targetLocation: '', notes: '' }],
          seedKeywords: editingClient.seedKeywords && editingClient.seedKeywords.length > 0 
            ? editingClient.seedKeywords 
            : [{ keyword: '', searchVolume: '', difficulty: '', intent: 'informational', source: 'manual' }],
          integrations: editingClient.integrations || {
            googleSearchConsole: false,
            googleAnalytics: false,
            googleBusinessProfile: false,
          },
          assignedStaff: editingClient.assignedStaff 
            ? editingClient.assignedStaff.map(staff => typeof staff === 'string' ? staff : staff._id)
            : []
        } : null}
        onComplete={handleClientComplete}
        onCancel={() => {
          setShowOnboarding(false)
          setEditingClient(null)
        }}
        isEditing={!!editingClient}
      />
    )
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600 mt-1">Manage your client portfolio</p>
          </div>
          <button
            onClick={() => {
              setEditingClient(null)
              setShowOnboarding(true)
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add Client
          </button>
        </div>

        {clients.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first client to the Seo-Ops OS platform.</p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="btn btn-primary"
            >
              Add First Client
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map(client => (
              <div key={client._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{client.name}</h3>
                    {client.domain && (
                      <a
                        href={`https://${client.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline block mb-2"
                      >
                        {client.domain}
                      </a>
                    )}
                    {client.industry && (
                      <p className="text-sm text-gray-600">{client.industry}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleView(client)}
                      className="text-gray-600 hover:text-gray-900 p-1"
                      title="View Details"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(client)}
                      className="text-blue-600 hover:text-blue-900 p-1"
                      title="Edit Client"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingClient(client)}
                      className="text-red-600 hover:text-red-900 p-1"
                      title="Delete Client"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {/* Locations */}
                  {client.locations && client.locations.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Locations</span>
                      <p className="text-sm text-gray-900 mt-1">
                        {client.locations.slice(0, 2).map(loc => `${loc.city}, ${loc.state}`).join('; ')}
                        {client.locations.length > 2 && ` +${client.locations.length - 2} more`}
                      </p>
                    </div>
                  )}

                  {/* Services */}
                  {client.services && client.services.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Services</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {client.services.slice(0, 3).map((service, index) => (
                          <span key={index} className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            {service}
                          </span>
                        ))}
                        {client.services.length > 3 && (
                          <span className="inline-block px-2 py-1 text-xs text-gray-500">
                            +{client.services.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Assigned Staff */}
                  {client.assignedStaff && client.assignedStaff.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned Staff</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {client.assignedStaff.slice(0, 3).map((staff, index) => (
                          <span key={index} className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                            {staff.name}
                          </span>
                        ))}
                        {client.assignedStaff.length > 3 && (
                          <span className="inline-block px-2 py-1 text-xs text-gray-500">
                            +{client.assignedStaff.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Integrations */}
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Integrations</span>
                    <div className="flex gap-1 mt-1">
                      {client.integrations?.googleSearchConsole && (
                        <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">GSC</span>
                      )}
                      {client.integrations?.googleAnalytics && (
                        <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded">GA4</span>
                      )}
                      {client.integrations?.googleBusinessProfile && (
                        <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">GBP</span>
                      )}
                      {!client.integrations?.googleSearchConsole && 
                       !client.integrations?.googleAnalytics && 
                       !client.integrations?.googleBusinessProfile && (
                        <span className="text-xs text-gray-400 italic">None</span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
                    <span className={`badge ${client.isActive ? 'badge-success' : 'badge-secondary'}`}>
                      {client.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleView(client)}
                  className="mt-4 w-full btn btn-secondary text-sm"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}

        {/* View Client Modal */}
        {viewingClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{viewingClient.name}</h2>
                  <p className="text-gray-600">{viewingClient.industry}</p>
                </div>
                <button
                  onClick={() => setViewingClient(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Basic Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-600">Domain:</span> <span className="font-medium">{viewingClient.domain}</span></div>
                      <div><span className="text-gray-600">Website:</span> <span className="font-medium">{viewingClient.website || 'Not specified'}</span></div>
                      <div><span className="text-gray-600">CMS:</span> <span className="font-medium">{viewingClient.cms || 'Not specified'}</span></div>
                      <div><span className="text-gray-600">Created:</span> <span className="font-medium">{new Date(viewingClient.createdAt).toLocaleDateString()}</span></div>
                    </div>
                  </div>

                  {/* Locations */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Locations ({viewingClient.locations?.length || 0})</h3>
                    <div className="space-y-2">
                      {viewingClient.locations?.length > 0 ? (
                        viewingClient.locations.map((location, index) => (
                          <div key={index} className="text-sm bg-white p-2 rounded border">
                            <div className="font-medium">{location.city}, {location.state}</div>
                            {location.zip && <div className="text-gray-600">ZIP: {location.zip}</div>}
                            {location.radius && (
                              <div className="text-gray-600">
                                Radius: {location.radius} {location.radiusUnit}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm italic">No locations specified</p>
                      )}
                    </div>
                  </div>

                  {/* Services */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Services ({viewingClient.services?.length || 0})</h3>
                    <div className="flex flex-wrap gap-2">
                      {viewingClient.services?.length > 0 ? (
                        viewingClient.services.map((service, index) => (
                          <span key={index} className="inline-block px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                            {service}
                          </span>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm italic">No services specified</p>
                      )}
                    </div>
                  </div>

                  {/* Competitors */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Competitors ({viewingClient.competitors?.length || 0})</h3>
                    <div className="space-y-1">
                      {viewingClient.competitors?.length > 0 ? (
                        viewingClient.competitors.map((competitor, index) => (
                          <div key={index} className="text-sm bg-red-50 border border-red-200 p-2 rounded">
                            {competitor}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm italic">No competitors specified</p>
                      )}
                    </div>
                  </div>

                  {/* Primary Keywords */}
                  {viewingClient.primaryKeywords?.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">Primary Keywords ({viewingClient.primaryKeywords.length})</h3>
                      <div className="space-y-2">
                        {viewingClient.primaryKeywords.slice(0, 5).map((keyword, index) => (
                          <div key={index} className="text-sm bg-white p-2 rounded border">
                            <div className="font-medium">{keyword.keyword}</div>
                            <div className="text-gray-600">Priority: {keyword.priority}</div>
                            {keyword.targetLocation && <div className="text-gray-600">Location: {keyword.targetLocation}</div>}
                          </div>
                        ))}
                        {viewingClient.primaryKeywords.length > 5 && (
                          <p className="text-gray-500 text-sm">+{viewingClient.primaryKeywords.length - 5} more keywords</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Integrations */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Integrations</h3>
                    <div className="space-y-2">
                      {[
                        { key: 'googleSearchConsole', name: 'Google Search Console', color: 'blue' },
                        { key: 'googleAnalytics', name: 'Google Analytics', color: 'green' },
                        { key: 'googleBusinessProfile', name: 'Google Business Profile', color: 'yellow' }
                      ].map((integration) => (
                        <div key={integration.key} className="flex justify-between items-center text-sm">
                          <span>{integration.name}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            viewingClient.integrations?.[integration.key] 
                              ? `bg-${integration.color}-100 text-${integration.color}-800`
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {viewingClient.integrations?.[integration.key] ? 'Connected' : 'Not Connected'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setViewingClient(null)
                    handleEdit(viewingClient)
                  }}
                  className="btn btn-primary"
                >
                  Edit Client
                </button>
                <button
                  onClick={() => setViewingClient(null)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Client</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to delete <strong>{deletingClient.name}</strong>? 
                  This action cannot be undone.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setDeletingClient(null)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deletingClient._id)}
                    className="btn bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
