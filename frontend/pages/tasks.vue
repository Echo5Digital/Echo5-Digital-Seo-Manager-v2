<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Tasks</h1>
        <p class="text-gray-600 mt-1">Manage and track SEO tasks</p>
      </div>
      <button v-if="authStore.isBoss" @click="showAddModal = true" class="btn btn-primary">
        <PlusIcon class="w-5 h-5 mr-2" />
        Create Task
      </button>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="flex gap-4">
        <select v-model="filterStatus" @change="filterTasks" class="input">
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <select v-model="filterClient" @change="filterTasks" class="input">
          <option value="">All Clients</option>
          <option v-for="client in clients" :key="client._id" :value="client._id">
            {{ client.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Tasks Grid -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
    </div>

    <div v-else-if="filteredTasks.length === 0" class="card text-center py-12">
      <CheckCircleIcon class="w-16 h-16 mx-auto mb-4 text-gray-400" />
      <h3 class="text-lg font-semibold mb-2">No Tasks Found</h3>
      <p class="text-gray-600 mb-4">Create tasks to track your SEO work.</p>
      <button v-if="authStore.isBoss" @click="showAddModal = true" class="btn btn-primary">
        Create First Task
      </button>
    </div>

    <div v-else class="grid gap-4">
      <div v-for="task in filteredTasks" :key="task._id" class="card hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="text-lg font-semibold text-gray-900">{{ task.title }}</h3>
              <span :class="getStatusBadgeClass(task.status)">
                {{ task.status }}
              </span>
              <span :class="getPriorityBadgeClass(task.priority)">
                {{ task.priority }}
              </span>
            </div>
            
            <p class="text-gray-600 mb-3">{{ task.description }}</p>
            
            <div class="flex items-center gap-6 text-sm text-gray-500">
              <div class="flex items-center gap-1">
                <UsersIcon class="w-4 h-4" />
                {{ task.clientId?.name || 'No Client' }}
              </div>
              <div class="flex items-center gap-1">
                <UserIcon class="w-4 h-4" />
                {{ task.assignedTo?.name || 'Unassigned' }}
              </div>
              <div class="flex items-center gap-1">
                <CalendarIcon class="w-4 h-4" />
                Due: {{ formatDate(task.dueDate) }}
              </div>
            </div>
          </div>
          
          <div class="flex gap-2 ml-4">
            <button v-if="canUpdateTask(task)" @click="updateTaskStatus(task)" class="btn btn-sm btn-primary">
              <ArrowPathIcon class="w-4 h-4" />
            </button>
            <button v-if="authStore.isBoss" @click="deleteTask(task._id)" class="btn btn-sm btn-secondary">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Task Modal -->
    <Modal :show="showAddModal" @close="showAddModal = false">
      <template #title>Create New Task</template>
      <template #content>
        <form @submit.prevent="handleCreateTask" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input v-model="newTask.title" type="text" required class="input" 
                   placeholder="Task title" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea v-model="newTask.description" rows="3" required class="input" 
                      placeholder="Task description"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select v-model="newTask.clientId" required class="input">
                <option value="">Select Client</option>
                <option v-for="client in clients" :key="client._id" :value="client._id">
                  {{ client.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
              <select v-model="newTask.assignedTo" required class="input">
                <option value="">Select User</option>
                <option v-for="user in users" :key="user._id" :value="user._id">
                  {{ user.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select v-model="newTask.priority" class="input">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input v-model="newTask.dueDate" type="date" required class="input" />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button type="button" @click="showAddModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="submitting" class="btn btn-primary">
              {{ submitting ? 'Creating...' : 'Create Task' }}
            </button>
          </div>
        </form>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { CheckCircleIcon, PlusIcon, TrashIcon, ArrowPathIcon, UsersIcon, UserIcon, CalendarIcon } from '@heroicons/vue/24/outline'
import { useTaskStore } from '~/stores/tasks'
import { useClientStore } from '~/stores/clients'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: ['auth'],
})

const taskStore = useTaskStore()
const clientStore = useClientStore()
const authStore = useAuthStore()

const loading = ref(true)
const showAddModal = ref(false)
const submitting = ref(false)
const filterStatus = ref('')
const filterClient = ref('')
const clients = ref([])
const users = ref([])
const filteredTasks = ref([])

const newTask = ref({
  title: '',
  description: '',
  clientId: '',
  assignedTo: '',
  priority: 'Medium',
  dueDate: '',
})

onMounted(async () => {
  try {
    loading.value = true
    await Promise.all([
      taskStore.fetchTasks(),
      clientStore.fetchClients(),
      fetchUsers(),
    ])
    clients.value = clientStore.clients
    filteredTasks.value = taskStore.tasks
  } catch (error) {
    console.error('Error loading tasks:', error)
  } finally {
    loading.value = false
  }
})

const fetchUsers = async () => {
  try {
    const response = await $fetch('/api/users', {
      baseURL: 'http://localhost:5001',
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    })
    users.value = response.data.users
  } catch (error) {
    console.error('Error fetching users:', error)
  }
}

const filterTasks = () => {
  let tasks = taskStore.tasks
  
  if (filterStatus.value) {
    tasks = tasks.filter(t => t.status === filterStatus.value)
  }
  
  if (filterClient.value) {
    tasks = tasks.filter(t => t.clientId?._id === filterClient.value)
  }
  
  filteredTasks.value = tasks
}

const handleCreateTask = async () => {
  try {
    submitting.value = true
    await taskStore.createTask(newTask.value)
    showAddModal.value = false
    newTask.value = {
      title: '',
      description: '',
      clientId: '',
      assignedTo: '',
      priority: 'Medium',
      dueDate: '',
    }
    filterTasks()
  } catch (error) {
    console.error('Error creating task:', error)
    alert('Failed to create task')
  } finally {
    submitting.value = false
  }
}

const updateTaskStatus = async (task) => {
  const statusOrder = ['Pending', 'In Progress', 'Completed']
  const currentIndex = statusOrder.indexOf(task.status)
  const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]
  
  try {
    await taskStore.updateTask(task._id, { status: nextStatus })
    filterTasks()
  } catch (error) {
    console.error('Error updating task:', error)
    alert('Failed to update task')
  }
}

const deleteTask = async (id) => {
  if (!confirm('Are you sure you want to delete this task?')) return
  
  try {
    await taskStore.deleteTask(id)
    filterTasks()
  } catch (error) {
    console.error('Error deleting task:', error)
    alert('Failed to delete task')
  }
}

const canUpdateTask = (task) => {
  return authStore.isBoss || task.assignedTo?._id === authStore.user._id
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

const getStatusBadgeClass = (status) => {
  const classes = {
    'Pending': 'px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800',
    'In Progress': 'px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800',
    'Completed': 'px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800',
  }
  return classes[status] || classes['Pending']
}

const getPriorityBadgeClass = (priority) => {
  const classes = {
    'Low': 'px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800',
    'Medium': 'px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800',
    'High': 'px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800',
  }
  return classes[priority] || classes['Medium']
}
</script>
