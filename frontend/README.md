# Frontend Setup Guide (Nuxt 3)

## Prerequisites
- Node.js 18+ installed
- Backend API running on http://localhost:5000

## Installation Steps

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```

Edit `.env`:
```env
NUXT_PUBLIC_API_URL=http://localhost:5000
NUXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. Run Development Server
```bash
npm run dev
```

App will start at: **http://localhost:3000**

### 4. Login
Use the credentials you created in the backend:
- Email: admin@example.com
- Password: password123

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run generate` - Generate static site
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
frontend/
├── pages/              # Auto-routed pages
│   ├── index.vue
│   ├── login.vue
│   ├── dashboard.vue
│   ├── clients/
│   ├── keywords/
│   ├── tasks/
│   └── settings/
│
├── components/         # Vue components
│   ├── Sidebar.vue
│   ├── Navbar.vue
│   ├── ClientCard.vue
│   ├── StatCard.vue
│   └── ...
│
├── layouts/           # App layouts
│   └── default.vue
│
├── stores/            # Pinia state stores
│   ├── auth.js
│   ├── clients.js
│   └── notifications.js
│
├── composables/       # Vue composables
│   └── useApi.js
│
├── plugins/           # Nuxt plugins
│   └── api.js
│
├── middleware/        # Route middleware
│   ├── auth.js
│   └── boss.js
│
├── assets/           # CSS & assets
│   └── css/
│       └── main.css
│
├── public/           # Static files
│
├── nuxt.config.js    # Nuxt configuration
├── tailwind.config.js # Tailwind config
└── package.json
```

## Features

### Authentication
- JWT-based authentication
- Role-based access control (Boss, Staff, Developer)
- Auto token refresh
- Protected routes

### State Management (Pinia)
- **auth** - User authentication state
- **clients** - Client management
- **notifications** - Real-time notifications

### Real-time Features
- Socket.io integration
- Live notifications
- Instant updates

### Styling
- Tailwind CSS
- Responsive design
- Custom utility classes
- Dark mode ready

## Key Pages

### Dashboard (`/dashboard`)
- Overview of all clients
- Stats and metrics
- Recent activity
- Quick actions

### Clients (`/clients`)
- List all clients
- Add/edit/delete clients
- View client details
- SEO health scores

### Keywords (`/keywords`)
- Manage keywords
- Rank tracking
- AI difficulty analysis
- CSV import/export

### Tasks (`/tasks`)
- Task management
- Assignment & tracking
- Priority filtering
- Time tracking

### Reports (`/reports`)
- Generate SEO reports
- Export PDF/Excel
- Historical data
- AI summaries

## Adding New Pages

Nuxt 3 uses file-based routing. Simply create a `.vue` file in `/pages`:

```vue
<!-- pages/my-page.vue -->
<template>
  <div>
    <h1>My New Page</h1>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ['auth'], // Protect with auth
})
</script>
```

## Adding New Components

Create components in `/components`:

```vue
<!-- components/MyComponent.vue -->
<template>
  <div class="card">
    {{ title }}
  </div>
</template>

<script setup>
defineProps({
  title: String,
})
</script>
```

Components are auto-imported - no need to import them!

## Troubleshooting

### API Connection Error
- Ensure backend is running
- Check API URL in `.env`
- Verify CORS settings in backend

### Build Errors
```bash
# Clear Nuxt cache
rm -rf .nuxt .output node_modules/.cache

# Reinstall
npm install
```

### Styling Issues
```bash
# Rebuild Tailwind
npm run dev
```

## Deployment

### Vercel
```bash
npm run build
vercel deploy
```

### Netlify
```bash
npm run generate
netlify deploy --prod
```

### Environment Variables
Set in your hosting platform:
- `NUXT_PUBLIC_API_URL` - Production API URL
- `NUXT_PUBLIC_SOCKET_URL` - Production Socket URL

## Next Steps

1. Customize branding in `nuxt.config.js`
2. Add your logo to `/public`
3. Configure email templates
4. Set up monitoring & analytics
5. Deploy to production!
