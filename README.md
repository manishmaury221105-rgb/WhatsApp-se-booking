# WhatsApp Appointment & Booking Automation Mobile Application (Android & iOS)

A complete, production-ready, cross-platform appointment and booking automation system. Customers can book, reschedule, and cancel appointments seamlessly directly through the business's WhatsApp number with an intelligent AI Booking Agent. Business owners and staff manage their entire appointment business, schedule, staff, services, automations, and WhatsApp AI through the modern Flutter mobile application.

---

## 🌟 Key Features

### 1. Real-Time WhatsApp AI Booking Agent
- **Conversational Booking in Natural Language**: Supports Hindi, Hinglish, and English.
- **Strict Anti-Hallucination Function Calling**: Calls backend slot engine tools (`get_services`, `get_available_slots`, `create_booking`, `reschedule_booking`, `cancel_booking`).
- **Atomic Double-Booking Prevention**: Mathematical locking guarantees zero double-bookings under concurrent customer requests.
- **Verification & Confirmation**: Enforces customer confirmation before creating, rescheduling, or cancelling appointments.

### 2. Cross-Platform Flutter Mobile Application (Android & iOS)
- **Role-Based Access Control**: `ADMIN` and `STAFF` access levels.
- **Executive Dashboard**: Real-time KPI cards (Today's, Upcoming, Pending, Confirmed, Completed, Cancelled, No-Show, Revenue, Total Customers) and upcoming appointment feed.
- **Quick Action Bar**: Shortcuts for `+ Add Booking`, `+ Add Customer`, `+ Add Service`, `+ Add Staff`, `Block Time`, `WhatsApp Cloud API`, and `AI Agent`.
- **Comprehensive Calendar**: Day, Week, and Month views with appointment chips and tap-to-reschedule.
- **Interactive Booking Flow**: Live customer selector/creator, real-time slot picker calling the backend slot engine, instant price breakdown, and automated confirmation dispatch.
- **Customer CRM**: Complete customer profiles, metrics (Total, Completed, Cancelled, No-Show), appointment history, and 1-tap direct WhatsApp links (`https://wa.me/...`).
- **Services & Staff Management**: Service catalog with active switches, staff schedules with customizable working hours and breaks.
- **Availability & Time Blocking**: Weekly business schedule (Mon-Sun), holidays, and custom blocked intervals.
- **WhatsApp Cloud API Integration**: Secure configuration with live Test Message sender. Credentials are never exposed on client devices.
- **AI Agent Trainer & Simulator**: Configure AI persona name, language, tone, FAQs knowledge base, custom prompt rules, and live interactive WhatsApp chat simulator inside the app.
- **Automations & Reminder Worker**: Background cron worker dispatching 24-hour and 2-hour appointment reminders and post-service feedback follow-up messages.
- **Message Templates**: Dynamic variable replacement (`{{customer_name}}`, `{{service_name}}`, `{{date}}`, `{{time}}`, `{{booking_id}}`, `{{business_name}}`) with live preview.
- **Analytics & Charts**: Visual reports using `fl_chart` for revenue trends, popular services, hourly booking density, and WhatsApp AI vs Manual ratios.

---

## 🏗️ Architecture

```
                  ┌───────────────────────────────┐
                  │    Customer WhatsApp User     │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │ Meta WhatsApp Cloud Graph API │
                  └───────────────┬───────────────┘
                                  │ Webhook Ingestion
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND ENGINE (Node.js/TS)                  │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐  │
│  │ Webhook Controller   │  │ Gemini AI Agent (Function Call)  │  │
│  └──────────┬───────────┘  └────────────────┬─────────────────┘  │
│             │                               │                    │
│             ▼                               ▼                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │         Transaction-Safe Slot Engine & Double-Booking Guard │  │
│  └──────────────────────────────┬─────────────────────────────┘  │
│                                 ▼                                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │           Relational Database (21 Tables + Audit Logs)     │  │
│  └──────────────────────────────┬─────────────────────────────┘  │
│                                 ▲                                │
│             ┌───────────────────┴───────────────────┐            │
│             │                                       │            │
│  ┌──────────┴───────────┐               ┌───────────┴─────────┐  │
│  │ Automation & Reminders│              │ Authenticated REST   │  │
│  │ Cron Worker (24h/2h) │              │ API Endpoints (JWT)  │  │
│  └──────────────────────┘               └───────────▲─────────┘  │
└─────────────────────────────────────────────────────┼────────────┘
                                                      │ Bearer Token
                                                      ▼
                  ┌───────────────────────────────────────────┐
                  │   Flutter Mobile App (Android & iOS)      │
                  │   - Dashboard, Bookings, Calendar, CRM    │
                  │   - WhatsApp Config & AI Chat Simulator   │
                  └───────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### 1. Start the Backend API Server
```bash
cd backend
npm install
npm run build
npm start
```
- **Backend API URL**: `http://localhost:4000/api`
- **Health Check**: `http://localhost:4000/health`
- **WhatsApp Webhook URL**: `http://localhost:4000/api/whatsapp/webhook`
- **Run Backend Tests**: `npm test`

### 2. Run the Flutter Mobile Application
```bash
cd apps/mobile
flutter pub get
flutter run
```
To run on a specific platform:
- **Android**: `flutter run -d android`
- **iOS Simulator / macOS**: `flutter run -d macos` or `flutter run -d ios`
- **Web**: `flutter run -d chrome`

---

## 🔑 Default Demo Login Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@salon.com` | `admin123` |
| **Staff (Rahul)** | `rahul@salon.com` | `staff123` |
| **Staff (Priya)** | `priya@salon.com` | `staff123` |

*(Quick demo login buttons are also available on the mobile login screen for 1-tap access).*

---

## 📱 WhatsApp Business Cloud API & Webhook Configuration

1. In Meta for Developers, create a WhatsApp App and obtain:
   - **Phone Number ID**
   - **WhatsApp Business Account ID**
   - **Permanent System User Access Token**
2. In the Mobile App (or via `backend/.env`), navigate to **More > WhatsApp Cloud API** and input your credentials.
3. Configure the Webhook in Meta App Dashboard:
   - **Callback URL**: `https://your-domain.com/api/whatsapp/webhook`
   - **Verify Token**: `whatsapp_booking_webhook_verify_token_2026`
   - Subscribe to the `messages` webhook field.

---

## 🧪 Automated Test Results

### Backend Test Suite (`backend/src/__tests__/backend.test.ts`)
- `GET /health`: **PASSED**
- `SlotEngine available slot calculation`: **PASSED**
- `SlotEngine atomic double-booking prevention`: **PASSED**
- `GET /api/dashboard/stats`: **PASSED**
- `Meta WhatsApp Webhook signature & challenge`: **PASSED**
- `POST /api/ai/chat-simulate interactive agent workflow`: **PASSED**

### Flutter Mobile Test Suite (`apps/mobile/test/widget_test.dart`)
- `WhatsAppBookingApp initialization and splash-to-login transition`: **PASSED**
- `Flutter Analyze`: **0 issues found**
