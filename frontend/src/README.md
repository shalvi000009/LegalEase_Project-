# LegalEase Frontend Engine (React 18 + Vite + TypeScript)

AI-powered legal contract analysis platform frontend built by Krina (Frontend Lead).

## 🚀 Quick Start & Development

### Prerequisites
- Node.js >= 18.x
- npm >= 9.x

### Setup & Local Development
```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start local Vite development server
npm run dev

# Run TypeScript type check / linting
npm run lint

# Build production bundle
npm run build
```

## ⚙️ Environment Variables
Create a `.env` file in the `frontend` root:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_AI_SERVICE_URL=http://localhost:8000
VITE_APP_ENV=development
```

## 📐 Tech Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + Vanilla CSS utilities + Framer Motion
- **State Management**: Zustand (`authStore`, `documentStore`, `vaultStore`, `dateStore`, `integrationStore`, `chatStore`, `notificationStore`)
- **Data Fetching**: TanStack Query (React Query v5)
- **Charts & Visualizations**: Chart.js + `react-chartjs-2`
- **Routing**: React Router v6 (Code-split with `React.lazy` and `Suspense`)
- **Icons**: Lucide React

## 📂 Architecture Overview
```
src/
├── api/             # API client modules & Zod schemas
├── components/      # UI components (Admin, Analysis, Chat, Dates, Layout, Vault, UI)
├── context/         # React Context providers (ThemeContext)
├── hooks/           # Custom React & Query hooks
├── pages/           # Page routes (Dashboard, Upload, Documents, Vault, Admin, Settings, etc.)
├── store/           # Zustand state management stores
├── types/           # TypeScript interfaces and contracts
└── utils/           # Helper utilities, cn class-merger, performance monitoring
```

## 🛡️ Key Features Completed (Week 1 - 9)
1. **Auth & Session Management**: JWT auth, persistence, enterprise SSO placeholder.
2. **Contract Upload & Processing**: Drag-and-drop dropzone, live SSE processing status pipeline.
3. **Dual PDF & NLP Analysis View**: Side-by-side resizable viewer, clause highlights, risk scoring (0-100).
4. **Interactive RAG AI Chat**: Streamed response tokens, interactive citation links.
5. **Contract Vault & Calendar**: Expiry tracking, ICS calendar exports, deadline reminders.
6. **Auto-Scan Integrations**: Google Drive, Dropbox, OneDrive, Gmail auto-scanning pipeline.
7. **Admin Analytics Dashboard**: Platform metrics, 4 Chart.js interactive charts, activity log audit.
8. **Responsive & Mobile Polish**: Mobile drawers, swipe gestures, touch targets ≥ 44px.
