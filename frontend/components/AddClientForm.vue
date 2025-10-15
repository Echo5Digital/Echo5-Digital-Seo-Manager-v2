<template>
  <div class="w-full max-w-lg">
    <div class="mb-6">
      <h3 class="text-lg font-medium leading-6 text-gray-900">Add New Client</h3>
      <p class="mt-1 text-sm text-gray-500">Enter the details of your new client.</p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Client Name -->
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700">Client Name *</label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          required
          class="input mt-1"
          placeholder="e.g., ABC Corporation"
        />
      </div>

      <!-- Domain -->
      <div>
        <label for="domain" class="block text-sm font-medium text-gray-700">Website Domain *</label>
        <input
          id="domain"
          v-model="form.domain"
          type="text"
          required
          class="input mt-1"
          placeholder="e.g., example.com"
        />
        <p class="mt-1 text-xs text-gray-500">Enter without http:// or https://</p>
      </div>

      <!-- Industry -->
      <div>
        <label for="industry" class="block text-sm font-medium text-gray-700">Industry</label>
        <input
          id="industry"
          v-model="form.industry"
          type="text"
          class="input mt-1"
          placeholder="e.g., E-commerce, Healthcare, Tech"
        />
      </div>

      <!-- CMS -->
      <div>
        <label for="cms" class="block text-sm font-medium text-gray-700">CMS Platform</label>
        <select
          id="cms"
          v-model="form.cms"
          class="input mt-1"
        >
          <option value="WordPress">WordPress</option>
          <option value="Shopify">Shopify</option>
          <option value="Wix">Wix</option>
          <option value="Webflow">Webflow</option>
          <option value="Custom">Custom</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <!-- Contact Email -->
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">Contact Email</label>
        <input
          id="email"
          v-model="form.contactInfo.email"
          type="email"
          class="input mt-1"
          placeholder="client@example.com"
        />
      </div>

      <!-- Contact Phone -->
      <div>
        <label for="phone" class="block text-sm font-medium text-gray-700">Contact Phone</label>
        <input
          id="phone"
          v-model="form.contactInfo.phone"
          type="tel"
          class="input mt-1"
          placeholder="+1 (555) 123-4567"
        />
      </div>

      <!-- Primary Contact Name -->
      <div>
        <label for="primaryContact" class="block text-sm font-medium text-gray-700">Primary Contact Name</label>
        <input
          id="primaryContact"
          v-model="form.contactInfo.primaryContact"
          type="text"
          class="input mt-1"
          placeholder="John Doe"
        />
      </div>

      <!-- Error Message -->
      <div v-if="error" class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
        {{ error }}
      </div>

      <!-- Buttons -->
      <div class="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          @click="$emit('cancel')"
          class="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="loading"
          class="btn btn-primary"
        >
          <span v-if="loading">Creating...</span>
          <span v-else>Create Client</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { useClientStore } from '~/stores/clients'

const emit = defineEmits(['success', 'cancel'])

const clientStore = useClientStore()

const form = ref({
  name: '',
  domain: '',
  industry: '',
  cms: 'WordPress',
  contactInfo: {
    email: '',
    phone: '',
    primaryContact: ''
  }
})

const error = ref('')
const loading = ref(false)

const handleSubmit = async () => {
  error.value = ''
  loading.value = true

  try {
    // Clean domain (remove protocol and trailing slash)
    let cleanDomain = form.value.domain.trim()
    cleanDomain = cleanDomain.replace(/^https?:\/\//, '')
    cleanDomain = cleanDomain.replace(/\/$/, '')
    
    const clientData = {
      name: form.value.name.trim(),
      domain: cleanDomain,
      industry: form.value.industry.trim(),
      cms: form.value.cms,
      contactInfo: {
        email: form.value.contactInfo.email.trim(),
        phone: form.value.contactInfo.phone.trim(),
        primaryContact: form.value.contactInfo.primaryContact.trim()
      }
    }

    const { $api } = useNuxtApp()
    const response = await $api.post('/clients', clientData)

    if (response.data.status === 'success') {
      emit('success')
      // Reset form
      form.value = {
        name: '',
        domain: '',
        industry: '',
        cms: 'WordPress',
        contactInfo: {
          email: '',
          phone: '',
          primaryContact: ''
        }
      }
    }
  } catch (err) {
    console.error('Error creating client:', err)
    error.value = err.response?.data?.message || 'Failed to create client. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>
