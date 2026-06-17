# Book Marketplace PWA PRD

## Document Information

  Field          Value
  -------------- ---------------------------
  Product        Book Marketplace PWA
  Market         Lao PDR
  Version        1.0
  Date           2026-06-17
  Product Type   Marketplace / Broker
  Platform       Progressive Web App (PWA)

------------------------------------------------------------------------

## 1. Executive Summary

Build a multilingual (Lao and English) book marketplace that aggregates
prices from physical bookstores across Lao PDR.

The platform does not own inventory. Administrators collect book prices
manually from bookstores, apply configurable margins, and sell books
through the platform.

Core differentiators:

-   Compare prices across bookstores
-   Single customer experience
-   QR payment with AI receipt verification
-   Multi-store cart support
-   Partial fulfillment support
-   AI-powered recommendations and search

------------------------------------------------------------------------

## 2. Business Model

### Inventory Model

Marketplace / broker model.

Inventory belongs to bookstores.

### Revenue Formula

Final Price = Bookstore Price × (1 + Margin %)

Example:

-   Bookstore Price: 100,000 LAK
-   Margin: 5%
-   Final Price: 105,000 LAK

### Margin Priority

1.  Book override
2.  Bookstore rule
3.  Category rule
4.  Price range rule
5.  Global default

------------------------------------------------------------------------

## 3. Goals and KPIs

### Business Goals

-   Aggregate book pricing across Lao PDR
-   Increase customer convenience
-   Generate revenue from dynamic margins

### Success Metrics

-   GMV
-   Revenue
-   Gross margin
-   Margin per bookstore
-   Top-selling books
-   Customer lifetime value
-   Conversion rate
-   Average order value
-   Delivery time
-   Repeat purchase rate

------------------------------------------------------------------------

## 4. Target Scale (Year 1)

-   Bookstores: 20
-   Books: 200
-   Orders per day: 10
-   Admin users: 3
-   Monthly active users: 200

------------------------------------------------------------------------

## 5. User Roles

### Customer

-   Browse books
-   Place orders
-   Upload payment receipts
-   Track deliveries

### Admin

-   Full platform access

### Operations Staff

-   Manage orders
-   Coordinate deliveries

### Finance Manager

-   Verify payments
-   Generate reports

------------------------------------------------------------------------

## 6. Supported Languages and Currencies

### Languages

-   Lao
-   English

### Currencies

-   LAK
-   USD

------------------------------------------------------------------------

## 7. Customer Journey

1.  Visit website
2.  Search books
3.  View book details
4.  Add items to cart
5.  Checkout
6.  Pay via QR or bank transfer
7.  Upload receipt
8.  Payment verification
9.  Order confirmation
10. Delivery updates
11. Receive books

------------------------------------------------------------------------

## 8. Functional Requirements

### 8.1 Homepage

Features:

-   Search bar
-   Categories
-   Featured books
-   Trending books
-   Personalized recommendations
-   Recently viewed books
-   Promotions

### 8.2 Book Catalog

Filters:

-   Title
-   Author
-   Publisher
-   Category
-   Language
-   Price range
-   Availability
-   ISBN

Search types:

-   Keyword search
-   ISBN search
-   Semantic AI search

### 8.3 Book Detail Page

Fields:

-   Cover image
-   Title
-   Author
-   ISBN
-   Publisher
-   Language
-   Category
-   Description
-   Number of pages
-   Publication date
-   Availability
-   Estimated delivery time

Display:

-   Final price
-   Estimated delivery
-   Related books

### 8.4 Shopping Cart

Requirements:

-   Multi-bookstore support
-   Save for later
-   Quantity updates
-   Partial fulfillment

Delivery fee:

Paid on delivery.

### 8.5 Checkout

Customer data:

-   Full name
-   Phone number
-   Address
-   Notes
-   Language preference

Payment methods:

-   Bank transfer
-   National QR code
-   Cash on delivery

------------------------------------------------------------------------

## 9. Payment System

### QR Payment Flow

1.  Customer places order
2.  System displays merchant QR
3.  Customer pays
4.  Customer uploads receipt
5.  AI verifies receipt
6.  Manual review if necessary
7.  Order confirmed

### Payment Statuses

-   Pending
-   Verified
-   Requires Review
-   Rejected
-   Refunded

### Receipt Verification Rules

Validate:

-   Transfer amount
-   Date and time
-   Transaction ID uniqueness
-   Sender information

If confidence score \< 90%, send to manual review.

------------------------------------------------------------------------

## 10. Delivery Management

### Couriers

-   Unitel Logistics
-   Anousith Express
-   HAL Logistics
-   Self-delivery

### Order Status Flow

-   Pending Payment
-   Payment Verification
-   Processing
-   Purchasing from Bookstore
-   Ready for Shipment
-   Shipped
-   Delivered
-   Completed

Exception statuses:

-   Partial Shipment
-   Out of Stock
-   Cancelled
-   Returned

### Tracking Fields

-   Courier
-   Tracking number
-   Shipment date
-   Estimated delivery date
-   Delivery status

------------------------------------------------------------------------

## 11. Communication

### Channels

-   In-app notifications
-   WhatsApp
-   Messenger

### Customer Notifications

-   Order placed
-   Payment confirmed
-   Order processing
-   Shipment created
-   Delivered

### Admin to Bookstore

One-click message templates.

Example:

"Book: Atomic Habits \| Qty: 2 \| Please confirm availability."

------------------------------------------------------------------------

## 12. Admin Dashboard

### Dashboard

Widgets:

-   Revenue
-   GMV
-   Gross margin
-   Pending payments
-   Pending deliveries
-   Top books

### Book Management

-   Create
-   Edit
-   Delete
-   CSV import
-   ISBN scanning
-   Cover upload

### Bookstore Management

Fields:

-   Store name
-   Contact name
-   Phone
-   WhatsApp
-   Messenger
-   Address
-   Notes

### Pricing Module

Inputs:

-   Bookstore price
-   Margin %

Output:

Final price = bookstore price × (1 + margin %)

Audit logging required.

### Order Management

-   View orders
-   Split orders
-   Partial fulfillment
-   Assign courier
-   Update tracking

### Finance

-   Payment verification queue
-   Refunds
-   Margin reports

### Analytics

-   GMV
-   Revenue
-   Margin by bookstore
-   Average order value
-   Delivery time
-   Customer lifetime value

------------------------------------------------------------------------

## 13. Automation

### Workflow 1: Order Creation

Customer order → Create order → Generate order ID → Notify customer

### Workflow 2: Receipt Verification

Receipt upload → OCR → AI validation → Auto-approve or review

### Workflow 3: Bookstore Notification

Payment confirmed → Generate WhatsApp message → Send

### Workflow 4: Delivery Updates

Tracking update → Notify customer

### Workflow 5: Availability Alert

Repeated stock issues → Alert admin

------------------------------------------------------------------------

## 14. AI Features

### Customer AI

-   Semantic search
-   Similar books
-   Personalized recommendations
-   AI assistant

### Internal AI

-   Price anomaly detection
-   Margin optimization
-   Demand forecasting
-   Inventory prediction
-   Description generation
-   OCR from receipts
-   OCR from invoices
-   Customer support automation

------------------------------------------------------------------------

## 15. Database Schema

### users

-   id
-   name
-   phone
-   email
-   role
-   language

### bookstores

-   id
-   name
-   contact_name
-   phone
-   whatsapp
-   messenger
-   address
-   notes

### books

-   id
-   isbn
-   title
-   author
-   publisher
-   language
-   category
-   description
-   pages
-   publication_date
-   cover_image

### book_prices

-   id
-   book_id
-   bookstore_id
-   bookstore_price
-   margin_percent
-   final_price
-   last_checked_at
-   availability

### orders

-   id
-   customer_id
-   status
-   payment_status
-   total_amount
-   shipping_status

### order_items

-   id
-   order_id
-   book_id
-   bookstore_id
-   quantity
-   bookstore_price
-   margin_percent
-   final_price

### payments

-   id
-   order_id
-   method
-   amount
-   receipt_image
-   verification_status
-   transaction_reference

### deliveries

-   id
-   order_id
-   courier
-   tracking_number
-   delivery_status

### notifications

-   id
-   user_id
-   channel
-   message
-   status

### audit_logs

-   id
-   user_id
-   entity
-   action
-   old_value
-   new_value
-   created_at

------------------------------------------------------------------------

## 16. Technical Architecture

### Frontend

-   React
-   Next.js
-   TypeScript
-   Tailwind CSS
-   PWA

### Backend

-   Node.js
-   NestJS

### Database

-   PostgreSQL

### ORM

-   Prisma

### Search

-   PostgreSQL Full Text Search
-   Vector database (Phase 2)

### Storage

-   Cloudflare R2 or AWS S3

### Authentication

-   OTP login
-   Google login

### AI

-   OpenAI API
-   OCR engine

### Notifications

-   WhatsApp Business API
-   Messenger API
-   Firebase Cloud Messaging

### Hosting

-   Vercel
-   Railway
-   DigitalOcean

------------------------------------------------------------------------

## 17. Information Architecture

Customer:

-   Home
-   Categories
-   Search
-   Book Details
-   Cart
-   Checkout
-   Orders
-   Profile
-   Support

Admin:

-   Dashboard
-   Books
-   Bookstores
-   Pricing
-   Orders
-   Payments
-   Deliveries
-   Analytics
-   Notifications
-   Settings

------------------------------------------------------------------------

## 18. MVP Scope

Include:

-   Customer PWA
-   Admin dashboard
-   Manual bookstore management
-   Manual pricing
-   QR payment
-   Receipt upload
-   AI verification
-   Delivery tracking
-   WhatsApp notifications
-   Multi-store cart
-   Partial fulfillment
-   Analytics

Exclude:

-   Native apps
-   Bookstore dashboard
-   Courier API integration
-   Loyalty program
-   Advanced forecasting

------------------------------------------------------------------------

## 19. Phase 2

-   Mobile applications
-   Courier integrations
-   AI demand forecasting
-   Loyalty points
-   Referral program
-   Dynamic pricing
-   Publisher integrations

------------------------------------------------------------------------

## 20. Security Requirements

-   Role-based access control
-   Encrypted storage
-   HTTPS only
-   Audit logs
-   Rate limiting
-   Secure file uploads
-   Receipt fraud detection

------------------------------------------------------------------------

## 21. AI Build Prompts

### Architect Prompt

Build a production-ready book marketplace PWA for Lao PDR using:

-   Next.js
-   React
-   TypeScript
-   Tailwind CSS
-   NestJS
-   PostgreSQL
-   Prisma

Generate:

-   Architecture
-   Database schema
-   APIs
-   Folder structure
-   Authentication
-   Deployment
-   Security
-   Localization

### Frontend Prompt

Build a mobile-first PWA with:

-   Lao and English languages
-   LAK and USD currencies
-   QR payments
-   Order tracking
-   AI search

### Admin Prompt

Build modules for:

-   Books
-   Bookstores
-   Pricing
-   Orders
-   Payments
-   Deliveries
-   Analytics

### AI Receipt Prompt

Input:

-   Receipt image
-   Order amount

Extract:

-   Transfer amount
-   Date
-   Sender
-   Transaction ID

Validate:

-   Amount matches
-   Date within 24 hours
-   Transaction ID unique

### Recommendation Prompt

Build:

-   Semantic search
-   Similar books
-   Personalized recommendations

Use:

-   Embeddings
-   Purchase history
-   Browsing history

------------------------------------------------------------------------

## 22. Operational Risks

Primary risks:

1.  Price accuracy
2.  Stock availability
3.  Delivery coordination
4.  Customer expectations

Mitigation:

-   Frequent price updates
-   Availability checks
-   Automated notifications
-   Clear delivery timelines
