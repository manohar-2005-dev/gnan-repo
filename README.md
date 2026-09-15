<div align="center">

# 🥗 NutriFlow AI

### AI-Powered Personalized Wellness & Nutrition Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge\&logo=typescript\&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge\&logo=react\&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge\&logo=vite\&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E?style=for-the-badge\&logo=supabase\&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge\&logo=tailwindcss\&logoColor=white)](https://tailwindcss.com/)

**A production-grade, multi-user AI wellness application built for portfolio showcases, product demos, and real-world deployment.**

</div>

---

## 📌 Table of Contents

* [✨ Features](#-features)
* [🏗️ Architecture](#️-architecture)
* [🛠️ Tech Stack](#️-tech-stack)
* [🚀 Getting Started](#-getting-started)

  * [Prerequisites](#prerequisites)
  * [Clone the Repository](#1-clone-the-repository)
  * [Install Dependencies](#2-install-dependencies)
  * [Configure Environment Variables](#3-configure-environment-variables)
  * [Set Up the Database](#4-set-up-the-supabase-database)
  * [Start the Development Servers](#5-start-the-development-servers)
* [🗄️ Database Schema](#️-database-schema)
* [🔒 Security](#-security)
* [📱 UI & Experience](#-ui--experience)
* [🤝 Contributing](#-contributing)
* [📄 License](#-license)

---

# ✨ Features

## 🤖 AI Co-Pilot

Powered by **Google Gemini 2.0 Flash**.

* **Streaming AI chat** — Real-time conversational meal planning.
* **Structured JSON responses** — Generates meal cards containing calories, protein, and health scores.
* **Grocery list generation** — Creates personalized shopping lists based on wellness goals.
* **Contextual recommendations** — Suggestions adapt to the user's dietary profile and allergies.

---

## 🍽️ Intelligent Dashboard

* **Personalized meal feed** — Swiggy-style meal cards with save and cart interactions.
* **Wellness score & streak tracker** — Progress tracking with Apple Health-inspired rings.
* **Calorie & macro dashboard** — Tracks calories, protein, carbohydrates, and fat.
* **AI wellness insights** — Provides contextual tips based on the user's onboarding profile.

---

## 🛒 Cart & Checkout

* **Persistent cart** — Uses localStorage as the primary store with Supabase background synchronization.
* **Nutrition summary** — Displays calories, protein, carbohydrates, and fat across cart items.
* **Mock Swiggy delivery flow** — Includes order confirmation and delivery tracker animations.
* **Address selection** — Supports multiple addresses in the checkout UI.

---

## 👤 Authentication & Onboarding

* **Supabase Auth** — Email/password signup, login, and logout with persistent sessions.
* **7-step onboarding wizard** — Collects goals, dietary preferences, allergies, lifestyle metrics, and budget.
* **Automatic profile creation** — Creates a database profile for new users after their first login.
* **localStorage-first persistence** — Provides instant UI updates with non-blocking background database synchronization.

---

## 🥦 Grocery Planner

* **AI-generated grocery plans** — Creates personalized weekly shopping lists.
* **Category grouping** — Organizes items into categories such as Vegetables, Proteins, and Grains.
* **Instamart ordering flow** — Includes a mock Swiggy Instamart checkout integration.

---

## 🔍 Discover

* **Browse healthy meals** — Filter meals by cuisine, dietary tags, and calorie range.
* **Save meals** — Saves meals to a user-specific wishlist in Supabase.
* **Quick add to cart** — Adds meals to the cart with a nutrition preview.

---

# 🏗️ Architecture

NutriFlow AI is organized as a **pnpm monorepo** containing the frontend, API server, shared libraries, database schema, and API definitions.

```text
SWIGGY_G/Asset-Manager/
│
├── artifacts/
│   │
│   ├── nutriflow/                  # React 19 + Vite frontend
│   │   │
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── layout/         # Navbar, Layout, AuthLayout, ProtectedRoute
│   │   │   │   ├── cart/           # CartDrawer, CartItem
│   │   │   │   └── ui/             # Radix UI primitives
│   │   │   │
│   │   │   ├── hooks/              # use-auth.tsx, use-cart.tsx
│   │   │   ├── lib/                # supabaseClient.ts, utils.ts
│   │   │   └── pages/              # Dashboard, Chat, Discover, Grocery,
│   │   │                            # Onboarding, Login, Profile, Checkout
│   │   │
│   │   └── vite.config.ts
│   │
│   └── api-server/                 # Hono.js API server
│       └── src/routes/
│           ├── /api/chat
│           ├── /api/meals
│           └── /api/grocery
│
├── lib/
│   ├── api-client-react/           # React Query hooks for API calls
│   ├── api-spec/                   # OpenAPI 3.0 specification
│   ├── api-zod/                    # Zod validation schemas
│   └── db/                         # Drizzle ORM schema definitions
│
├── pnpm-workspace.yaml             # Monorepo workspace configuration
└── .env.example                    # Environment variable template
```

---

# 🛠️ Tech Stack

| Layer                         | Technology                               |
| ----------------------------- | ---------------------------------------- |
| **Frontend**                  | React 19, TypeScript, Vite 7             |
| **Routing**                   | Wouter                                   |
| **Styling**                   | Tailwind CSS v4, Framer Motion           |
| **UI Components**             | Shadcn/ui, Radix UI                      |
| **State & Data**              | TanStack React Query v5                  |
| **Authentication & Database** | Supabase, PostgreSQL, Row Level Security |
| **AI Engine**                 | Google Gemini 2.0 Flash                  |
| **API Server**                | Hono.js, Node.js                         |
| **Monorepo**                  | pnpm Workspaces                          |
| **Forms & Validation**        | React Hook Form, Zod                     |

---

# 🚀 Getting Started

Follow the steps below to run NutriFlow AI locally.

## Prerequisites

Make sure the following are installed:

* **Node.js ≥ 18**
* **pnpm ≥ 9**

Install pnpm if required:

```bash
npm install -g pnpm
```

You will also need:

* A **Supabase account**
* A **Google AI Studio API key**

---

## 1. Clone the Repository

```bash
git clone https://github.com/gnanendramunagapaka/NUTRIFLOW_AI.git
cd NUTRIFLOW_AI
```

---

## 2. Install Dependencies

```bash
pnpm install
```

---

## 3. Configure Environment Variables

Create your local environment file:

```bash
cp .env.example .env.local
```

Then update `.env.local` with your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key

PORT=5173
BASE_PATH=/
```

> **Important:** Never commit your API keys or database credentials to GitHub.

---

## 4. Set Up the Supabase Database

Open the **Supabase SQL Editor** and run the following schema.

<details>
<summary>📋 Click to expand the database schema</summary>

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- User Profiles
-- ============================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  goal TEXT DEFAULT 'Stay Healthy',
  dietary_preferences TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  workout_frequency TEXT,
  water_intake TEXT,
  meal_habits TEXT,
  budget TEXT,
  age INTEGER,
  weight NUMERIC,
  height NUMERIC,
  onboarding_completed BOOLEAN DEFAULT false,
  wellness_score INTEGER DEFAULT 72,
  streak INTEGER DEFAULT 1,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Cart Items
-- ============================================

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  type TEXT DEFAULT 'meal',
  calories INTEGER,
  protein NUMERIC,
  image_url TEXT,
  cuisine TEXT,
  health_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI Conversations
-- ============================================

CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI Messages
-- ============================================

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Saved Meals
-- ============================================

CREATE TABLE saved_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_id TEXT NOT NULL,
  name TEXT NOT NULL,
  calories INTEGER,
  protein NUMERIC,
  image_url TEXT,
  cuisine TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, meal_id)
);

-- ============================================
-- Grocery Plans
-- ============================================

CREATE TABLE grocery_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Weekly Plan',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Grocery Plan Items
-- ============================================

CREATE TABLE grocery_plan_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES grocery_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  quantity TEXT DEFAULT '1',
  unit TEXT DEFAULT 'unit',
  nutrition_note TEXT,
  checked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_plan_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

CREATE POLICY "Users own their profile"
ON user_profiles FOR ALL
USING (auth.uid() = id);

CREATE POLICY "Users own their cart"
ON cart_items FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users own their conversations"
ON ai_conversations FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users own their messages"
ON ai_messages FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users own their saved meals"
ON saved_meals FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users own their grocery plans"
ON grocery_plans FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users own their grocery items"
ON grocery_plan_items FOR ALL
USING (auth.uid() = user_id);
```

</details>

---

## 5. Start the Development Servers

NutriFlow AI uses two development processes:

### Terminal 1 — Frontend

```bash
PORT=5173 BASE_PATH=/ npx pnpm --filter @workspace/nutriflow run dev
```

### Terminal 2 — API Server

The API server handles AI chat requests through Gemini.

```bash
PORT=8080 \
GEMINI_API_KEY=your-key \
NEXT_PUBLIC_SUPABASE_URL=your-url \
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
npx pnpm --filter @workspace/api-server run start
```

Once both servers are running, open:

```text
http://localhost:5173
```

---

# 🗄️ Database Schema

NutriFlow AI uses **Supabase PostgreSQL** with **Row Level Security (RLS)**.

Each table stores a specific part of the application's data:

| Table                | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `user_profiles`      | Stores wellness goals, dietary preferences, and body metrics |
| `cart_items`         | Stores each user's cart items                                |
| `ai_conversations`   | Stores AI conversations                                      |
| `ai_messages`        | Stores individual user and AI messages                       |
| `saved_meals`        | Stores meals saved from the Discover page                    |
| `grocery_plans`      | Stores AI-generated weekly grocery plans                     |
| `grocery_plan_items` | Stores individual grocery items                              |

---

# 🔒 Security

The application includes the following security practices:

* `.env` files are excluded from Git using `.gitignore`.
* Supabase credentials are loaded through environment variables.
* Row Level Security is enabled on all database tables.
* Users can only access their own data through the configured RLS policies.
* The Supabase anon key can be exposed to the browser when properly restricted by RLS.
* **Never commit `GEMINI_API_KEY` or database connection strings to Git.**

---

# 📱 UI & Experience

The application is designed as a responsive wellness platform with:

* 🌙 Dark and light mode
* 📱 Mobile-first responsive design
* ✨ Framer Motion animations
* 🎨 Premium glassmorphism UI
* 🥗 Personalized nutrition dashboard
* 💬 Streaming AI chat
* 🛒 Cart and checkout experience

### User Flow

```text
Signup
   ↓
7-Step Onboarding
   ↓
Personalized Dashboard
   ↓
AI Chat / Discover / Grocery Planner
   ↓
Add Items to Cart
   ↓
Checkout
   ↓
Mock Delivery Tracking
```

---

# 🤝 Contributing

Contributions are welcome.

### 1. Fork the repository

Create your own fork of the project.

### 2. Create a feature branch

```bash
git checkout -b feature/my-feature
```

### 3. Commit your changes

```bash
git commit -m "feat: add my feature"
```

### 4. Push the branch

```bash
git push origin feature/my-feature
```

### 5. Open a Pull Request

Create a Pull Request with a description of your changes.

---

# 📄 License

This project is licensed under the **MIT License**.

See the [`LICENSE`](LICENSE) file for details.

---

<div align="center">

### Built with ❤️ by [Gnanendra Munagapaka](https://github.com/gnanendramunagapaka)

**Stack:** React 19 · TypeScript · Vite · Supabase · Gemini AI · Tailwind CSS · Framer Motion

</div>
