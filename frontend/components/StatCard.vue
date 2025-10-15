<template>
  <div class="card">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
      <div :class="iconColorClass">
        {{ iconMap[icon] || '📊' }}
      </div>
    </div>
    
    <p :class="valueColorClass">
      {{ formattedValue }}
    </p>
    
    <p v-if="change" class="text-sm mt-2" :class="changeClass">
      {{ change > 0 ? '↑' : '↓' }} {{ Math.abs(change) }}%
    </p>
  </div>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  value: {
    type: [Number, String],
    required: true,
  },
  icon: {
    type: String,
    default: 'chart',
  },
  color: {
    type: String,
    default: 'primary',
  },
  change: {
    type: Number,
    default: null,
  },
})

const iconMap = {
  users: '👥',
  clipboard: '📋',
  search: '🔍',
  chart: '📊',
  check: '✓',
  alert: '⚠️',
}

const colorMap = {
  primary: 'blue',
  success: 'green',
  warning: 'yellow',
  danger: 'red',
}

const iconColorClass = computed(() => {
  const c = colorMap[props.color] || 'blue'
  return `text-3xl text-${c}-600`
})

const valueColorClass = computed(() => {
  const c = colorMap[props.color] || 'blue'
  return `text-3xl font-bold text-${c}-600`
})

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString()
  }
  return props.value
})

const changeClass = computed(() => {
  if (!props.change) return ''
  return props.change > 0 ? 'text-green-600' : 'text-red-600'
})
</script>
