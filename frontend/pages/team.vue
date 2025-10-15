<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Team Management</h1>
        <p class="text-gray-600 mt-1">Manage team members and permissions</p>
      </div>
      <button @click="showAddModal = true" class="btn btn-primary flex items-center gap-2">
        <PlusIcon class="w-5 h-5" />
        Add Team Member
      </button>
    </div>

    <!-- Team Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Total Members</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ users.length }}</p>
          </div>
          <UserGroupIcon class="w-12 h-12 text-blue-500" />
        </div>
      </div>
      
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Admins</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ adminCount }}</p>
          </div>
          <ShieldCheckIcon class="w-12 h-12 text-green-500" />
        </div>
      </div>
      
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Members</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ memberCount }}</p>
          </div>
          <UserIcon class="w-12 h-12 text-purple-500" />
        </div>
      </div>
    </div>

    <!-- Team List -->
    <div class="card">
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading team members...</p>
      </div>

      <div v-else-if="users.length === 0" class="text-center py-12">
        <UserGroupIcon class="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p class="text-gray-500">No team members found</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="user in users" :key="user._id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span class="text-blue-600 font-semibold">{{ user.name.charAt(0).toUpperCase() }}</span>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ user.name }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ user.email }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="[
                  'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full',
                  user.role === 'boss' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                ]">
                  {{ user.role === 'boss' ? 'Admin' : 'Member' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  Active
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(user.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button 
                  v-if="user._id !== authStore.user._id"
                  @click="handleDeleteUser(user._id)" 
                  class="text-red-600 hover:text-red-900"
                >
                  <TrashIcon class="w-5 h-5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Member Modal -->
    <Modal :show="showAddModal" @close="showAddModal = false">
      <template #title>Add Team Member</template>
      <template #content>
        <form @submit.prevent="handleAddMember" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input v-model="newUser.name" type="text" required class="input" 
                   placeholder="Full name" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input v-model="newUser.email" type="email" required class="input" 
                   placeholder="email@example.com" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input v-model="newUser.password" type="password" required class="input" 
                   placeholder="Minimum 6 characters" minlength="6" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select v-model="newUser.role" required class="input">
              <option value="member">Member</option>
              <option value="boss">Admin</option>
            </select>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button type="button" @click="showAddModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="submitting" class="btn btn-primary">
              {{ submitting ? 'Adding...' : 'Add Member' }}
            </button>
          </div>
        </form>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { UserGroupIcon, PlusIcon, TrashIcon, ShieldCheckIcon, UserIcon } from '@heroicons/vue/24/outline'
import { useAuthStore } from '~/stores/auth'
import { format } from 'date-fns'

definePageMeta({
  middleware: ['auth', 'boss'],
})

const authStore = useAuthStore()
const config = useRuntimeConfig()

const loading = ref(true)
const showAddModal = ref(false)
const submitting = ref(false)
const users = ref([])

const newUser = ref({
  name: '',
  email: '',
  password: '',
  role: 'member'
})

const adminCount = computed(() => users.value.filter(u => u.role === 'boss').length)
const memberCount = computed(() => users.value.filter(u => u.role === 'member').length)

const formatDate = (date) => {
  return format(new Date(date), 'MMM dd, yyyy')
}

const fetchUsers = async () => {
  try {
    const response = await $fetch(`${config.public.apiBase}/api/users`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    users.value = response.data
  } catch (error) {
    console.error('Error fetching users:', error)
  } finally {
    loading.value = false
  }
}

const handleAddMember = async () => {
  submitting.value = true
  try {
    const response = await $fetch(`${config.public.apiBase}/api/auth/register`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: newUser.value
    })
    
    users.value.push(response.data.user)
    showAddModal.value = false
    newUser.value = { name: '', email: '', password: '', role: 'member' }
  } catch (error) {
    console.error('Error adding user:', error)
    alert('Failed to add team member')
  } finally {
    submitting.value = false
  }
}

const handleDeleteUser = async (userId) => {
  if (!confirm('Are you sure you want to remove this team member?')) return
  
  try {
    await $fetch(`${config.public.apiBase}/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    
    users.value = users.value.filter(u => u._id !== userId)
  } catch (error) {
    console.error('Error deleting user:', error)
    alert('Failed to remove team member')
  }
}

onMounted(() => {
  fetchUsers()
})
</script>
