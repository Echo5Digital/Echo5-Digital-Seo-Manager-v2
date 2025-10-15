<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Pages & Content</h1>
        <p class="text-gray-600 mt-1">Manage SEO-optimized pages, blogs, and metadata</p>
      </div>
      <button @click="showAddModal = true" class="btn btn-primary">
        <PlusIcon class="w-5 h-5 mr-2" />
        Add Page
      </button>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <select v-model="selectedClient" @change="filterPages" class="input">
          <option value="">All Clients</option>
          <option v-for="client in clients" :key="client._id" :value="client._id">
            {{ client.name }}
          </option>
        </select>

        <select v-model="selectedType" @change="filterPages" class="input">
          <option value="">All Types</option>
          <option value="page">Page</option>
          <option value="blog">Blog Post</option>
          <option value="product">Product</option>
          <option value="category">Category</option>
          <option value="landing">Landing Page</option>
        </select>

        <select v-model="selectedStatus" @change="filterPages" class="input">
          <option value="">All Status</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Archived">Archived</option>
        </select>

        <div class="flex items-center">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search pages..."
            class="input"
            @input="filterPages"
          />
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div class="card">
        <h3 class="text-sm font-medium text-gray-500 mb-2">Total Pages</h3>
        <span class="text-4xl font-bold text-blue-600">{{ pageStore.totalPages }}</span>
      </div>
      <div class="card">
        <h3 class="text-sm font-medium text-gray-500 mb-2">Published</h3>
        <span class="text-4xl font-bold text-green-600">{{ pageStore.publishedPages.length }}</span>
      </div>
      <div class="card">
        <h3 class="text-sm font-medium text-gray-500 mb-2">With Issues</h3>
        <span class="text-4xl font-bold text-red-600">{{ pageStore.pagesWithIssues.length }}</span>
      </div>
      <div class="card">
        <h3 class="text-sm font-medium text-gray-500 mb-2">Avg SEO Score</h3>
        <span class="text-4xl font-bold" :class="getScoreColor(pageStore.averageSEOScore)">
          {{ pageStore.averageSEOScore }}
        </span>
      </div>
    </div>

    <!-- Pages Table -->
    <div class="card">
      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>

      <div v-else-if="filteredPages.length === 0" class="text-center py-12">
        <DocumentTextIcon class="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 class="text-lg font-semibold mb-2">No Pages Found</h3>
        <p class="text-gray-600 mb-4">Start managing your SEO-optimized content.</p>
        <button @click="showAddModal = true" class="btn btn-primary">
          Add First Page
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SEO Score</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="page in filteredPages" :key="page._id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <div>
                  <div class="font-medium text-gray-900">{{ page.title }}</div>
                  <div class="text-sm text-gray-500 truncate max-w-xs">{{ page.url }}</div>
                  <div class="text-xs text-gray-400 mt-1">{{ page.metaDescription?.substring(0, 60) }}...</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ page.clientId?.name }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getTypeBadgeClass(page.type)">
                  {{ page.type }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getStatusBadgeClass(page.status)">
                  {{ page.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span v-if="page.seo?.seoScore" class="text-2xl font-bold" :class="getScoreColor(page.seo.seoScore)">
                  {{ page.seo.seoScore }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span v-if="page.issues && page.issues.length > 0" class="badge badge-danger">
                  {{ page.issues.length }} issues
                </span>
                <span v-else class="badge badge-success">No issues</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button @click="viewPage(page)" class="text-blue-600 hover:text-blue-900" title="View Details">
                  <EyeIcon class="w-5 h-5" />
                </button>
                <button @click="editPage(page)" class="text-indigo-600 hover:text-indigo-900" title="Edit">
                  <PencilIcon class="w-5 h-5" />
                </button>
                <button @click="analyzePage(page)" class="text-purple-600 hover:text-purple-900" title="AI Analyze">
                  <SparklesIcon class="w-5 h-5" />
                </button>
                <button @click="deletePage(page._id)" class="text-red-600 hover:text-red-900" title="Delete">
                  <TrashIcon class="w-5 h-5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Page Modal -->
    <Modal :show="showAddModal" @close="showAddModal = false">
      <template #title>
        {{ editingPage ? 'Edit Page' : 'Add New Page' }}
      </template>
      <template #content>
        <form @submit.prevent="handleSubmit" class="space-y-4 max-h-[70vh] overflow-y-auto">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <select v-model="formData.clientId" required class="input">
                <option value="">Select Client</option>
                <option v-for="client in clients" :key="client._id" :value="client._id">
                  {{ client.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Page Type *</label>
              <select v-model="formData.type" required class="input">
                <option value="page">Page</option>
                <option value="blog">Blog Post</option>
                <option value="product">Product</option>
                <option value="category">Category</option>
                <option value="landing">Landing Page</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Page Title * (Max 60 chars)</label>
            <input 
              v-model="formData.title" 
              type="text" 
              required 
              maxlength="60"
              class="input"
              placeholder="SEO-optimized page title"
            />
            <div class="text-xs text-gray-500 mt-1">{{ formData.title.length }}/60 characters</div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URL *</label>
            <input v-model="formData.url" type="url" required class="input" placeholder="https://example.com/page" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input v-model="formData.slug" type="text" required class="input" placeholder="page-slug" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">H1 Heading</label>
            <input v-model="formData.h1" type="text" class="input" placeholder="Main page heading" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Meta Description (Max 160 chars)</label>
            <textarea 
              v-model="formData.metaDescription" 
              class="input"
              rows="3"
              maxlength="160"
              placeholder="Compelling meta description for search results"
            ></textarea>
            <div class="text-xs text-gray-500 mt-1">{{ (formData.metaDescription || '').length }}/160 characters</div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select v-model="formData.status" class="input">
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Robots</label>
              <select v-model="formData.seo.robots" class="input">
                <option value="index,follow">Index, Follow</option>
                <option value="noindex,follow">No Index, Follow</option>
                <option value="index,nofollow">Index, No Follow</option>
                <option value="noindex,nofollow">No Index, No Follow</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Focus Keyword</label>
            <input v-model="formData.seo.focusKeyword" type="text" class="input" placeholder="Primary keyword for this page" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Canonical URL</label>
            <input v-model="formData.seo.canonical" type="url" class="input" placeholder="Canonical URL (if different)" />
          </div>

          <!-- Open Graph -->
          <div class="border-t pt-4">
            <h4 class="text-md font-semibold mb-3">Open Graph Tags</h4>
            <div class="space-y-3">
              <input v-model="formData.openGraph.title" type="text" class="input" placeholder="OG Title" />
              <textarea v-model="formData.openGraph.description" class="input" rows="2" placeholder="OG Description"></textarea>
              <input v-model="formData.openGraph.image" type="url" class="input" placeholder="OG Image URL" />
            </div>
          </div>

          <!-- Twitter Card -->
          <div class="border-t pt-4">
            <h4 class="text-md font-semibold mb-3">Twitter Card</h4>
            <div class="space-y-3">
              <select v-model="formData.twitter.card" class="input">
                <option value="summary">Summary</option>
                <option value="summary_large_image">Summary Large Image</option>
              </select>
              <input v-model="formData.twitter.title" type="text" class="input" placeholder="Twitter Title" />
              <input v-model="formData.twitter.image" type="url" class="input" placeholder="Twitter Image URL" />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t">
            <button type="button" @click="showAddModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="submitting" class="btn btn-primary">
              {{ submitting ? 'Saving...' : (editingPage ? 'Update Page' : 'Add Page') }}
            </button>
          </div>
        </form>
      </template>
    </Modal>

    <!-- View Page Details Modal -->
    <Modal :show="showDetailsModal" @close="showDetailsModal = false" size="large">
      <template #title>
        Page Details: {{ selectedPage?.title }}
      </template>
      <template #content>
        <div v-if="selectedPage" class="space-y-6 max-h-[70vh] overflow-y-auto">
          <!-- SEO Score & Issues -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="card">
              <h4 class="text-sm font-medium text-gray-500 mb-2">SEO Score</h4>
              <span class="text-5xl font-bold" :class="getScoreColor(selectedPage.seo?.seoScore || 0)">
                {{ selectedPage.seo?.seoScore || 'N/A' }}
              </span>
            </div>
            <div class="card">
              <h4 class="text-sm font-medium text-gray-500 mb-2">Issues</h4>
              <span class="text-5xl font-bold" :class="selectedPage.issues?.length > 0 ? 'text-red-600' : 'text-green-600'">
                {{ selectedPage.issues?.length || 0 }}
              </span>
            </div>
          </div>

          <!-- Issues List -->
          <div v-if="selectedPage.issues && selectedPage.issues.length > 0" class="card">
            <h4 class="font-semibold mb-3">SEO Issues</h4>
            <div class="space-y-2">
              <div v-for="(issue, index) in selectedPage.issues" :key="index" 
                   class="p-3 rounded" :class="getIssueBgClass(issue.severity)">
                <div class="flex items-start gap-2">
                  <ExclamationTriangleIcon class="w-5 h-5 flex-shrink-0" :class="getIssueIconClass(issue.severity)" />
                  <div class="flex-1">
                    <div class="font-medium">{{ issue.category }}</div>
                    <div class="text-sm">{{ issue.message }}</div>
                  </div>
                  <span class="badge" :class="getSeverityBadge(issue.severity)">
                    {{ issue.severity }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Metadata -->
          <div class="card">
            <h4 class="font-semibold mb-3">SEO Metadata</h4>
            <dl class="grid grid-cols-1 gap-3">
              <div>
                <dt class="text-sm font-medium text-gray-500">Title</dt>
                <dd class="text-sm text-gray-900">{{ selectedPage.title }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Meta Description</dt>
                <dd class="text-sm text-gray-900">{{ selectedPage.metaDescription || 'Not set' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">URL</dt>
                <dd class="text-sm text-blue-600"><a :href="selectedPage.url" target="_blank">{{ selectedPage.url }}</a></dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Focus Keyword</dt>
                <dd class="text-sm text-gray-900">{{ selectedPage.seo?.focusKeyword || 'Not set' }}</dd>
              </div>
            </dl>
          </div>

          <!-- Structured Data -->
          <div v-if="selectedPage.structuredData?.schema" class="card">
            <h4 class="font-semibold mb-3">Structured Data (JSON-LD)</h4>
            <pre class="bg-gray-50 p-4 rounded text-xs overflow-x-auto">{{ JSON.stringify(selectedPage.structuredData.schema, null, 2) }}</pre>
          </div>

          <!-- Images -->
          <div v-if="selectedPage.images && selectedPage.images.length > 0" class="card">
            <h4 class="font-semibold mb-3">Images ({{ selectedPage.images.length }})</h4>
            <div class="space-y-2">
              <div v-for="(image, index) in selectedPage.images" :key="index" class="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <div class="flex-1">
                  <div class="text-sm font-medium">{{ image.alt || 'No alt text' }}</div>
                  <div class="text-xs text-gray-500 truncate">{{ image.url }}</div>
                </div>
                <span v-if="!image.alt" class="badge badge-warning">Missing alt</span>
                <span v-else class="badge badge-success">Has alt</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { 
  PlusIcon, 
  DocumentTextIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  SparklesIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'
import { usePageStore } from '~/stores/pages'
import { useClientStore } from '~/stores/clients'

definePageMeta({
  middleware: ['auth'],
})

const pageStore = usePageStore()
const clientStore = useClientStore()

const loading = ref(true)
const showAddModal = ref(false)
const showDetailsModal = ref(false)
const submitting = ref(false)
const editingPage = ref(null)
const selectedPage = ref(null)

const selectedClient = ref('')
const selectedType = ref('')
const selectedStatus = ref('')
const searchQuery = ref('')

const clients = ref([])
const filteredPages = ref([])

const formData = ref({
  clientId: '',
  url: '',
  slug: '',
  title: '',
  metaDescription: '',
  h1: '',
  type: 'page',
  status: 'Draft',
  seo: {
    canonical: '',
    robots: 'index,follow',
    focusKeyword: '',
  },
  openGraph: {
    title: '',
    description: '',
    image: '',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '',
    image: '',
  },
})

onMounted(async () => {
  try {
    loading.value = true
    await Promise.all([
      clientStore.fetchClients(),
      pageStore.fetchPages(),
    ])
    clients.value = clientStore.clients
    filteredPages.value = pageStore.pages
  } catch (error) {
    console.error('Error loading pages:', error)
  } finally {
    loading.value = false
  }
})

const filterPages = () => {
  let pages = pageStore.pages

  if (selectedClient.value) {
    pages = pages.filter(p => p.clientId === selectedClient.value || p.clientId?._id === selectedClient.value)
  }

  if (selectedType.value) {
    pages = pages.filter(p => p.type === selectedType.value)
  }

  if (selectedStatus.value) {
    pages = pages.filter(p => p.status === selectedStatus.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    pages = pages.filter(p => 
      p.title?.toLowerCase().includes(query) ||
      p.url?.toLowerCase().includes(query) ||
      p.slug?.toLowerCase().includes(query)
    )
  }

  filteredPages.value = pages
}

const handleSubmit = async () => {
  try {
    submitting.value = true
    
    if (editingPage.value) {
      await pageStore.updatePage(editingPage.value._id, formData.value)
    } else {
      await pageStore.addPage(formData.value)
    }
    
    showAddModal.value = false
    resetForm()
    filterPages()
  } catch (error) {
    console.error('Error saving page:', error)
    alert('Failed to save page')
  } finally {
    submitting.value = false
  }
}

const editPage = (page) => {
  editingPage.value = page
  formData.value = {
    clientId: page.clientId?._id || page.clientId,
    url: page.url,
    slug: page.slug,
    title: page.title,
    metaDescription: page.metaDescription || '',
    h1: page.h1 || '',
    type: page.type,
    status: page.status,
    seo: page.seo || { canonical: '', robots: 'index,follow', focusKeyword: '' },
    openGraph: page.openGraph || { title: '', description: '', image: '', type: 'website' },
    twitter: page.twitter || { card: 'summary_large_image', title: '', image: '' },
  }
  showAddModal.value = true
}

const viewPage = (page) => {
  selectedPage.value = page
  showDetailsModal.value = true
}

const analyzePage = async (page) => {
  if (!confirm('Analyze this page with AI? This may take a moment.')) return
  
  try {
    const analysis = await pageStore.analyzePage(page._id)
    alert(`AI Analysis Complete!\nSEO Score: ${analysis.score}\nIssues Found: ${analysis.issues.length}`)
    filterPages()
  } catch (error) {
    console.error('Error analyzing page:', error)
    alert('Failed to analyze page')
  }
}

const deletePage = async (id) => {
  if (!confirm('Are you sure you want to delete this page?')) return
  
  try {
    await pageStore.deletePage(id)
    filterPages()
  } catch (error) {
    console.error('Error deleting page:', error)
    alert('Failed to delete page')
  }
}

const resetForm = () => {
  editingPage.value = null
  formData.value = {
    clientId: '',
    url: '',
    slug: '',
    title: '',
    metaDescription: '',
    h1: '',
    type: 'page',
    status: 'Draft',
    seo: { canonical: '', robots: 'index,follow', focusKeyword: '' },
    openGraph: { title: '', description: '', image: '', type: 'website' },
    twitter: { card: 'summary_large_image', title: '', image: '' },
  }
}

const getScoreColor = (score) => {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

const getTypeBadgeClass = (type) => {
  const map = {
    page: 'badge badge-info',
    blog: 'badge badge-primary',
    product: 'badge badge-success',
    category: 'badge badge-warning',
    landing: 'badge badge-secondary',
  }
  return map[type] || 'badge badge-secondary'
}

const getStatusBadgeClass = (status) => {
  const map = {
    Published: 'badge badge-success',
    Draft: 'badge badge-warning',
    Scheduled: 'badge badge-info',
    Archived: 'badge badge-secondary',
  }
  return map[status] || 'badge badge-secondary'
}

const getSeverityBadge = (severity) => {
  const map = {
    critical: 'badge-danger',
    high: 'badge-warning',
    medium: 'badge-info',
    low: 'badge-secondary',
  }
  return map[severity] || 'badge-secondary'
}

const getIssueBgClass = (severity) => {
  const map = {
    critical: 'bg-red-50',
    high: 'bg-orange-50',
    medium: 'bg-yellow-50',
    low: 'bg-blue-50',
  }
  return map[severity] || 'bg-gray-50'
}

const getIssueIconClass = (severity) => {
  const map = {
    critical: 'text-red-600',
    high: 'text-orange-600',
    medium: 'text-yellow-600',
    low: 'text-blue-600',
  }
  return map[severity] || 'text-gray-600'
}
</script>
