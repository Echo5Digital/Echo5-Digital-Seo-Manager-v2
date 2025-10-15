<template>
  <div class="card">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
      <component :is="iconComponent" :class="iconColorClass" />
    </div>
    
    <p :class="valueColorClass">
      {{ formattedValue }}
    </p>
    
    <p v-if="change" class="text-sm mt-2" :class="changeClass">
      <component :is="change > 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon" class="w-4 h-4 inline mr-1" />
      {{ Math.abs(change) }}%
    </p>
  </div>
</template>

<script setup>
import { 
  UsersIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/vue/24/outline'

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
  users: UsersIcon,
  clipboard: ClipboardDocumentListIcon,
  search: MagnifyingGlassIcon,
  chart: ChartBarIcon,
  check: CheckCircleIcon,
  alert: ExclamationTriangleIcon,
}

const colorMap = {
  primary: 'blue',
  success: 'green',
  warning: 'yellow',
  danger: 'red',
}

const iconComponent = computed(() => iconMap[props.icon] || ChartBarIcon)

const iconColorClass = computed(() => {
  const c = colorMap[props.color] || 'blue'
  return `w-8 h-8 text-${c}-600`
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
