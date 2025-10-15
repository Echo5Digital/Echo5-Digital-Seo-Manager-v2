<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Team Management</h1>
      <p class="text-gray-600 mt-1">Manage team members and permissions</p>
    </div>

    <div class="card text-center py-12">
      <div class="text-6xl mb-4">👨‍💼</div>
      <h2 class="text-2xl font-semibold mb-2">Team Management Coming Soon</h2>
      <p class="text-gray-600">Add team members, assign roles, and manage permissions.</p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ['auth', 'boss'],
})
</script>
