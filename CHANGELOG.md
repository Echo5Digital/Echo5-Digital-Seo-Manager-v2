# Changelog

All notable changes to the Echo5 Digital SEO Ops platform will be documented in this file.

## [Unreleased]

### Added - 2025-10-31

#### Comprehensive User Settings Panel
- **Enhanced Settings Page** (`frontend/pages/settings.js`)
  - **Updated Design to Match Application Theme**
    - Gradient-styled section headers with icons
    - Consistent border and shadow styling
    - Gradient action buttons (blue-indigo for save, purple-pink for password)
    - Loading spinners with animations
    - Icon-enhanced success/error messages
    - Professional card-based layout
    - Improved visual hierarchy with colored accents
  
  - **Profile Information Section**
    - Editable name field for all users
    - Read-only email field (cannot be changed)
    - Read-only role display
    - Visual feedback with disabled styling for read-only fields
  
  - **Password Change Section**
    - Current password verification
    - New password input with strength validation (minimum 6 characters)
    - Confirm password field with matching validation
    - Show/hide password toggles for all password fields
    - Secure password change with backend validation
    - Success/error messaging
  
  - **Profile Picture Management**
    - Google account linking for automatic avatar sync
    - Manual image URL input option
    - Live avatar preview (96x96px)
    - Fallback to gradient circle with user initial
  
  - **User Experience Features**
    - Clean, organized layout with separate sections
    - Real-time validation feedback
    - Loading states during save operations
    - Auto-dismissing success messages
    - Password visibility toggles with eye icons

- **Backend Password Change Endpoint** (`backend/routes/auth.routes.js`)
  - PUT `/api/auth/change-password` endpoint
  - Validates current password before allowing change
  - Enforces minimum password length (6 characters)
  - Secure password hashing with bcrypt
  - Protected route requiring authentication

#### User Avatars Throughout Application
- **Created reusable UserAvatar component** (`frontend/components/UserAvatar.js`)
  - Supports 5 size variants: xs (24px), sm (32px), md (40px), lg (48px), xl (64px)
  - Displays user profile picture from Google OAuth or manual URL
  - Automatic fallback to gradient circle with user initial
  - Optional name display next to avatar
  - Tooltip support for hover states
  - Proper error handling with fallback icons

- **Enhanced Task Management** (`frontend/pages/tasks.js`)
  - Added "Assigned To" column in task tables with avatars
  - Task detail modal now shows avatars for "Assigned To" and "Created By"
  - Small avatars (sm) in task lists for compact display
  - Medium avatars (md) in modal with full names

- **Enhanced Dashboard** (`frontend/pages/dashboard.js`)
  - Added large avatar (xl) next to welcome message
  - Creates more personalized user experience

- **Enhanced Client Cards** (`frontend/pages/clients.js`)
  - Assigned staff shown as overlapping avatar stack
  - Up to 3 avatars displayed with tooltip on hover
  - "+N more" indicator for additional staff members
  - Professional "stacked avatars" design pattern

- **Enhanced Team Management** (`frontend/pages/team.js`)
  - User list displays avatars with names
  - Replaced gradient initials with UserAvatar component
  - Consistent avatar display across all team members

#### Audit Pagination
- Added pagination controls to audit results page
- Display 10 pages per view with "Previous" and "Next" buttons
- Improved performance for large audit reports

#### PDF Export Enhancements
- **AI Suggestions Modal** (`frontend/components/SEOFixSuggestionsModal.js`)
  - Fixed jsPDF import (changed to named import)
  - Fixed object/array display issues showing "[object] [object]"
  - Added proper JSON formatting for structured data
  - Improved PDF generation with formatted values

- **Audit Reports** (`frontend/pages/audits-detailed.js`)
  - Replaced JSON download with professional styled PDF
  - Shows ALL pages (not just top 10)
  - Removed scoring system, focuses on issues
  - Highlights critical, warning, and info level issues
  - Includes company logo and audit metadata
  - Better text wrapping for long descriptions

#### Google OAuth Avatar Integration
- **Profile Settings** (`frontend/pages/settings.js`)
  - Comprehensive profile management page
  - "Connect Google Account" button for linking OAuth
  - Manual image URL input for non-Google users
  - Live 96x96px avatar preview
  - Success/error messaging for updates
  
- **Backend Support** (`backend/routes/auth.routes.js`)
  - Updated `/api/auth/update-profile` endpoint
  - Accepts `picture` field with URL validation
  - Supports both Google OAuth and manual URLs

### Fixed - 2025-10-31
- Fixed React key prop warning in rank-checker.js
- Fixed jsPDF splitTextToSize method not available error
- Fixed object/array rendering in AI suggestion modals
- Fixed PDF export only showing 10 pages instead of all

### Technical Details
- **Component Architecture**: Created reusable UserAvatar component for consistency
- **Avatar Sources**: Supports Google OAuth photos and manual image URLs
- **Fallback Strategy**: Gradient circle with user initial → UserCircleIcon
- **Image Loading**: referrerPolicy="no-referrer" for cross-origin images
- **Error Handling**: onError handler gracefully switches to fallback
- **Responsive Design**: Multiple size variants for different contexts
- **Accessibility**: Title attributes for tooltips, proper alt text

### Design Patterns
- **Stacked Avatars**: Used in client cards for multiple staff members
- **Avatar + Name**: Used in tables and lists for easy identification
- **Large Avatar**: Used in dashboard welcome section for personalization
- **Tooltip Integration**: Hover states show full names in compact views
