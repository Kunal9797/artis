# Artis Project Documentation

## System Architecture

### Technical Stack
- Frontend: React 18 + Material-UI
- Backend: Express.js + Sequelize ORM
- Database: PostgreSQL
- Authentication: JWT
- State Management: React Context

### Core Systems
1. **Sales Management**
   - Lead tracking
   - Dealer visits
   - Performance metrics
   - Team hierarchy

2. **Inventory Management**
   - Stock tracking
   - Product catalog
   - Transaction history
   - Distributor management

## Directory Structure Overview

### Frontend (/frontend)
- **/src/components**: React components
  - `/Sales`: Sales management components
  - `/Inventory`: Inventory management components
  - `/Users`: User management components
  - `/Common`: Shared components
- **/src/services**: API services
- **/src/context**: Global state management
- **/src/types**: TypeScript definitions
- **/public/templates**: Excel templates

### Backend (/backend)
- **/src/controllers**: Business logic
- **/src/models**: Database models
- **/src/middleware**: Request processing
- **/src/routes**: API endpoints
- **/migrations**: Database migrations
- **/config**: Configuration files

## Key File Relationships

### Authentication Flow
1. Entry Point: frontend/src/components/Login.tsx
2. API Service: frontend/src/services/api.ts
3. Routes: backend/src/routes/auth.routes.ts
4. Controller: backend/src/controllers/auth.controller.ts
5. Model: backend/src/models/User.ts

### Sales Management Flow
1. Dashboard: frontend/src/components/Sales/Dashboard/SalesDashboard.tsx
2. API Service: frontend/src/services/salesApi.ts
3. Routes: backend/src/routes/sales.routes.ts
4. Controller: backend/src/controllers/sales.controller.ts

### Inventory Management Flow
1. List View: frontend/src/components/Inventory/InventoryList.tsx
2. API Service: frontend/src/services/api.ts
3. Routes: backend/src/routes/inventory.routes.ts
4. Controller: backend/src/controllers/inventory.controller.ts

### Sales Team Management Flow
1. Main View: frontend/src/components/Sales/SalesTeamManagement.tsx
   - Handles team member listing
   - Implements filtering and sorting
   - Manages data formatting and type safety
2. Details View: frontend/src/components/SalesTeamMemberDetails.tsx
   - Displays detailed member information
   - Shows performance metrics
   - Presents attendance data
3. API Service: frontend/src/services/salesApi.ts
   - getAllSalesTeam endpoint
   - Team member data fetching
4. Types: frontend/src/types/sales.ts
   - ISalesTeamMember interface
   - Performance metrics types
   - Activity tracking types

### User Management Flow
1. Main View: frontend/src/components/Users/UserManagement.tsx
   - Handles user CRUD operations
   - Manages role transitions
   - Handles associated data cleanup
2. Form Component: frontend/src/components/Users/UserForm.tsx
   - Manages user creation/updates
   - Handles role-specific data
   - Validates input data
3. API Service: frontend/src/services/api.ts
   - User CRUD endpoints
   - Special endpoints for sales role transitions
4. Controller: backend/src/controllers/auth.controller.ts
   - Transaction-based user operations
   - Cascade deletions
   - Role transition logic

## Data Models

### User & Authentication
- **User Model**: 
  - Authentication
  - Role management
  - Version tracking
  - Cascade relationships
- **SalesTeam Model**: 
  - Role-specific data
  - Territory management
  - Reporting structure
  - Performance metrics

### Sales Operations
- **Lead Model**: Customer inquiries and follow-ups
- **DealerVisit Model**: Visit tracking and reporting
- **Performance Model**: Sales metrics and targets

### Inventory Operations
- **Product Model**: Product details and stock levels
- **Transaction Model**: Stock movements
- **Distributor Model**: Partner information

## Access Control

### Role Hierarchy (from highest to lowest access)
- Admin (Full system access)
- Country Head (Country-wide sales access)
- Zonal Head (Zone-wide access)
- Sales Executive (Personal + assigned territory)
- Regular User (Basic inventory platform access)

### Permissions
- Role-based access
- Hierarchical data access
- Territory-based restrictions

## Features

### Core Functionality
- User authentication
- Role-based dashboards
- Inventory management
- Sales tracking
- Performance reporting

### Technical Features
- Offline data sync
- Bulk data operations
- Location tracking
- Real-time updates

### Sales Team Management
- Role-based team view
- Performance metrics tracking
- Territory management
- Target setting and monitoring
- Activity tracking
- Attendance monitoring

## Project Structure
artis/
├── frontend/
│ ├── src/
│ │ ├── components/
│ │ │ ├── Sales/
│ │ │ │ ├── Dashboard/
│ │ │ │ ├── DealerVisits/
│ │ │ │ └── Leads/
│ │ │ └── Inventory/
│ │ ├── services/
│ │ │ ├── api.ts
│ │ │ └── salesApi.ts
│ │ └── types/
│ │ └── sales.ts
└── backend/
├── src/
│ ├── controllers/
│ │ └── sales.controller.ts
│ ├── models/
│ │ ├── SalesTeam.ts
│ │ └── DealerVisit.ts
│ └── routes/
│ └── sales.routes.ts
│ └── auth.routes.ts
│ └── user.routes.ts
│ └── inventory.routes.ts
│ └── reports.routes.ts
│ └── dashboard.routes.ts

## Models

### Lead
- Tracks sales leads with status (NEW, IN_PROGRESS, COMPLETED, LOST)
- Stores customer info, assignment details, and notes
- Supports lead reassignment with audit trail
- Associates with SalesTeam and User models

### User
- Manages user authentication with bcrypt password hashing
- Supports multiple roles (admin, user, SALES_EXECUTIVE, ZONAL_HEAD, COUNTRY_HEAD)
- Implements role hierarchy for sales team management
- Tracks version number for optimistic locking

### Product
- Stores product details including Artis codes, supplier info
- Tracks current stock levels and average consumption
- Supports multiple catalogs per product
- Associates with Transaction model for inventory tracking

### Transaction
- Records inventory movements (IN/OUT)
- Tracks quantity, date, and notes
- Used for calculating average consumption
- Links to Product model

### Distributor
- Stores distributor information (name, location, contact)
- Manages catalog associations
- Supports geolocation data

### Attendance
- Tracks sales team attendance with location
- Records date and status (PRESENT/ABSENT)
- Associates with SalesTeam model

### Message
- Handles internal communication
- Tracks read status
- Associates with User and SalesTeam models

### SalesTeam
- Manages sales team member information
- Links to User model
- Supports hierarchical organization structure

## Controllers

### Auth Controller
- Handles user registration and login
- Manages JWT token generation
- Supports user CRUD operations
- Implements role-based access control

### Inventory Controller
- Manages stock levels and transactions
- Supports bulk upload of inventory data
- Tracks product consumption
- Provides inventory reporting

### Product Controller
- Handles product CRUD operations
- Supports bulk product creation/update
- Manages product search and filtering
- Calculates average consumption

### Distributor Controller
- Manages distributor information
- Supports bulk import of distributor data
- Handles distributor search and filtering

## Key Features
- Role-based access control with hierarchical permissions
- Inventory tracking with transaction history
- Sales lead management with status tracking
- Location-based attendance tracking
- Internal messaging system
- Bulk data import/export capabilities

## Testing Structure
- **/backend/__tests__/**
  - `/integration`: Integration tests
  - `/unit`: Unit tests
  - `/fixtures`: Test data (e.g., test-inventory.xlsx)

## Frontend Components Organization
- **/components/Sales/Dashboard/**
  - `CountryHeadDashboard.tsx`
  - `SalesExecDashboard.tsx`
  - `ZonalHeadDashboard.tsx`
  - `/components/`: Shared dashboard components

- **/components/Inventory/**
  - `InventoryList.tsx`: Main inventory view
  - `ProductDetailsDialog.tsx`: Product details modal
  - `TransactionDialog.tsx`: Stock movement handling
  - `BulkUploadDialog.tsx`: Bulk data import

## Configuration Files
- `render.yaml`: Render deployment config
- `vercel.json`: Vercel deployment config
- `/backend/config/`: Backend configurations
  - `database.ts`: Database connection
  - `swagger.ts`: API documentation
  - `sequelize.ts`: ORM configuration

## Public Assets
- **/frontend/public/templates/**
  - `consumption-template.xlsx`
  - `inventory-template.xlsx`
  - `product-template.xlsx`
  - `purchase-template.xlsx`
  - `letterhead.pdf/png`

## Database Migrations
Key migrations:
- User system: 20240315000006-create-users.js
- Sales system: 20240320000003-add-sales-roles-and-team.js
- Inventory: 20240315000000-create-products.js
- Transactions: 20240315000003-create-transactions.js

## Utility Functions
- **/frontend/src/utils/**
  - `consumption.ts`: Consumption calculations
  - `pdfGenerator.ts`: PDF generation
  - `geoJsonUtils.ts`: Map utilities

- **/backend/src/utils/**
  - `hashPassword.ts`: Password hashing

## Data Handling Patterns

### Sales Team Data
- Default values for missing metrics
- Type-safe data transformation
- Graceful error handling
- Status management (online/offline)
- Performance calculation
- Territory mapping

### User Role Management
- Transaction-based role transitions
- Associated data cleanup
- Cascade deletions
- Role-specific data validation
- Type-safe data transformations
