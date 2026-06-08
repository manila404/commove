# Commove 🚀
> **Modern Community Event & Permit Management Platform**

Commove is a premium web application designed to connect communities, facilitate event discovery, manage official permitting workflows, and provide powerful administrative insights. 

Built with **React 19**, **Vite**, **TypeScript**, and **Tailwind CSS 4**, Commove integrates smart services including the **Gemini AI API** for personalized recommendations and **Sanity.io CMS** for headless content storage.

---

## ✨ Key Features

### 📅 Event Hub & Scheduling
- **Dynamic Events**: Create and discover local events with rich descriptions, locations, and category filters.
- **Recurrence Engine**: Support for complex recurring events (daily, weekly, custom recurrence patterns).
- **Interactive UI**: Fluid slide-outs, date/time pickers, and event detail views powered by Framer Motion.

### 🗺️ Interactive Community Map
- **OSM & Geoapify Mapping**: Visual map representation of events, venues, and local zones.
- **Location-Based Discovery**: Interactive markers showing current events in your proximity.

### 📋 Facilitator Permit Workflow
- **Application Portal**: Hosts can submit new permit requests directly through the app.
- **Real-Time Tracking**: Users can monitor their permit applications (Draft, Pending, Approved, Rejected).
- **KYC Verification**: Identity verification module (documents upload, OTP validation) for trusted organizers.

### 📊 Admin Panel & Advanced Analytics
- **Interactive Dashboards**: Comprehensive stats on user registrations, active events, and permit volumes.
- **Visual Analytics**: Interactive charting components built with Recharts.
- **Data Exporting**: One-click Excel sheet exporting utilizing `xlsx` and `xlsx-js-style` libraries.

### 🤖 Smart Assistant (Chatbot)
- **AI Recommendations**: Powered by Google Gemini, helping users find relevant events and answering FAQs in real-time.
- **Context-Aware Assistance**: Smart response generation based on active local events.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Core** | React 19, TypeScript, Vite |
| **Styling & Motion** | Tailwind CSS 4, Framer Motion, Styled Components |
| **State & Navigation** | React Context API, Lucide React (Icons) |
| **Backend & Services** | Firebase (Auth & Firestore), Sanity CMS, EmailJS |
| **AI / APIs** | Google Gemini API, Geoapify Map API |

---

## 🚀 Getting Started

### 📋 Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and configure the following variables:
```env
# Sanity CMS Config
VITE_SANITY_PROJECT_ID=your_sanity_project_id
VITE_SANITY_DATASET=production
VITE_SANITY_AUTH_TOKEN=your_sanity_auth_token

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Maps & Geocoding
GEOAPIFY_API_KEY=your_geoapify_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key

# EmailJS Configuration (OTP/Emails)
VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key

# Security
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

### 3. Run the Development Server
To launch the frontend web application:
```bash
npm run dev
```

To run the Sanity CMS local environment:
```bash
npm run sanity:dev
```

### 4. Build for Production
```bash
# Build web app
npm run build

# Build Sanity studio
npm run sanity:build
```

---

## 📂 Project Structure

```
├── components/          # React components (AdminPanel, ChatBot, Map, Auth, etc.)
├── contexts/            # Context Providers (Alert, Network, Permissions)
├── services/            # API Services (Firebase, Gemini, Sanity, OSM, etc.)
├── utils/               # Helper utilities & date formatters
├── App.tsx              # Main App entrypoint
├── index.css            # Global styling setup
├── types.ts             # Global TypeScript type definitions
└── vite.config.ts       # Vite build configurations
```
