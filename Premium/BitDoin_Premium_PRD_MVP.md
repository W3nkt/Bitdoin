# BitDoin Premium – Product Requirements Document (PRD)

## Project Overview

BitDoin Premium is a subscription-based online platform designed to help young students (approximately **15–25 years old**) improve their lives through **daily guidance, AI-powered learning, motivation, and personal development**.

The goal is **not** to become another online course platform. Instead, BitDoin acts as a **daily digital mentor**, helping students become smarter, more disciplined, more confident, and better prepared for school, university, and life.

The platform should feel like having a personal mentor available every day.

---

# Vision

Become the most trusted personal growth platform for young people in Laos.

BitDoin helps students improve in four major areas:

- Personal Growth
- Education
- AI Skills
- Career Preparation

The platform focuses on building habits rather than simply providing information.

---

# Target Users

**Primary Audience**

- High school students
- University students
- Fresh graduates

**Age**

15–25 years old

**Location**

Initially Laos, with future expansion into Southeast Asia.

---

# Business Model

Subscription-based SaaS

## Plans

- Free
- Premium (Monthly)
- Pro (Future)

---

# Core Philosophy

The platform should encourage users to return every day.

Instead of asking:

> "What course do you want to watch?"

It asks:

> "What should you improve today?"

Every day should provide one small improvement.

---

# MVP Features

## 1. Authentication

- Register
- Login
- Logout
- Forgot Password

---

## 2. Subscription Management

- Monthly Subscription
- Cancel Subscription
- Renew Subscription
- Payment History
- Manual Activation (for Lao payment methods)

Future:

- Annual Subscription

---

## 3. User Dashboard

After login users land on a personalized dashboard showing:

- Good Morning Message
- Today's Motivation
- Today's Challenge
- Today's Lesson
- Today's Quote
- Current Streak
- Subscription Status
- Upcoming Live Session
- Recent Articles
- AI Coach Shortcut

---

## 4. Daily Motivation

Every day the administrator publishes:

- Quote
- Reflection
- Challenge
- Mission

Example:

**Quote**

> "The future is created by what you do today."

**Mission**

Study for 30 minutes without using your phone.

**Reflection**

What is one thing you learned today?

Users can mark a challenge as completed.

The system tracks:

- Daily Streak
- Weekly Streak
- Monthly Streak

---

## 5. AI Coach

The platform's flagship feature.

Students can ask about:

- Life
- Education
- Studying
- Career
- Motivation
- Relationships
- Time Management
- English
- AI Tools

The AI should gradually become a **BitDoin Mentor**, answering according to BitDoin's philosophy using Retrieval-Augmented Generation (RAG) from BitDoin's own knowledge base.

---

## 6. Learning Center

Categories:

- Life Skills
- Education
- AI Skills
- English
- Career
- Productivity
- Mental Health
- Finance

Each lesson includes:

- Title
- Thumbnail
- Reading Time
- Article
- Video (Optional)
- Downloadable PDF
- Comments
- Save to Favorites
- Progress Tracking

---

## 7. AI Prompt Library

Categories:

- Homework
- Presentation
- Research
- English
- Business
- Coding
- Writing

Each prompt includes:

- Description
- Prompt
- Copy Button
- Example Output

---

## 8. English Corner

Features:

- Daily Vocabulary
- Daily Conversation
- Listening Practice
- Speaking Challenge
- Grammar Tip
- Vocabulary Progress
- Favorite Words

---

## 9. Productivity Center

Features:

- Habit Tracker
- Pomodoro Timer
- Goal Setting
- Weekly Planner
- Daily Checklist
- Reflection Journal
- Progress Dashboard

---

## 10. Resource Library

Downloadable resources:

- Study Planners
- Resume Templates
- CV Templates
- Canva Templates
- AI Prompt Packs
- Cheat Sheets
- PDF Guides

---

## 11. Community (MVP)

Simple community features:

- Discussion Board
- Announcements
- Questions & Answers

Future:

- Study Groups
- Leaderboards
- Community Challenges

---

## 12. Notifications

Delivery channels:

- Email
- WhatsApp
- Telegram

Content:

- Daily Motivation
- Weekly Newsletter
- Monthly Progress Summary

Future:

- Push Notifications

---

# Admin Panel

Administrators can manage:

- Users
- Subscriptions
- Payments
- Articles
- Lessons
- Categories
- Daily Motivation
- Quotes
- Challenges
- Resources
- AI Prompt Library
- Announcements
- Analytics
- Settings

---

# User Roles

- Guest
- Registered User
- Premium Member
- Admin
- Super Admin

---

# Gamification

Reward users with:

- XP
- Daily Streak
- Weekly Streak
- Badges
- Achievements

Future:

- Leaderboards

---

# Payment Methods

Initial:

- Stripe
- Manual Transfer

Future:

- BCEL One
- Lao QR
- ABA

---

# Suggested Tech Stack

## Backend

- Laravel 12

## Frontend

- React (recommended)

## Database

- MySQL

## Authentication

- Laravel Breeze

## AI

- OpenAI API

## Storage

- Cloudflare R2 or Amazon S3

## Queue

- Laravel Queue

---

# Suggested Database Tables

- users
- subscriptions
- payments
- articles
- categories
- lessons
- daily_motivations
- daily_quotes
- daily_challenges
- resources
- prompt_library
- habits
- user_habits
- journal_entries
- notifications
- ai_conversations
- favorites
- progress

---

# User Journey

Visitor

↓

Reads Articles

↓

Registers

↓

Receives Free Motivation

↓

Uses Limited AI Coach

↓

Subscribes

↓

Accesses Premium Features

↓

Receives Daily Guidance

↓

Builds Daily Streak

↓

Renews Subscription

---

# UI / UX Design

- Minimal
- Modern
- Calm
- Apple-inspired
- Mobile-first
- Responsive
- Dark Mode Support
- Card-based Layout

---

# Future Features

- AI Life Coach
- AI Career Coach
- AI Resume Builder
- Scholarship Finder
- AI Flashcards
- AI Quiz Generator
- AI Mock Interview
- Student Marketplace
- Mobile Apps
- Live Classes
- Certificates

---

# Success Metrics

Track:

- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Monthly Active Users (MAU)
- 7-Day Retention
- 30-Day Retention
- Average Session Duration
- Lesson Completion Rate
- AI Usage
- Subscription Conversion
- Monthly Churn
- Customer Lifetime Value (LTV)

---

# MVP Scope

## Public Website

- Home
- About
- Pricing
- Blog
- Login
- Register

## User Dashboard

- Dashboard
- Daily Motivation
- Daily Challenge
- AI Coach
- Learning Center
- AI Prompt Library
- Resources
- Profile
- Subscription Management

## Admin Dashboard

- User Management
- Content Management
- Motivation Management
- Prompt Library
- Payment & Subscription Management

---

# Guiding Principle

> BitDoin is **not** an online learning platform.

It is a **daily personal growth platform** that combines mentorship, AI, motivation, education, and habit-building into one subscription.

Every feature should encourage users to return every day and become a better version of themselves.

---

# Architecture Recommendation

Build the system using a **modular architecture**.

Each major feature should be independent:

- AI Coach
- Learning Center
- Motivation
- Resources
- Community
- Gamification
- Payments

Use:

- Clean Architecture
- RESTful APIs
- Mobile-first responsive design
- Modular services for future expansion
