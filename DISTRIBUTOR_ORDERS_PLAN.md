# Distributor Orders Feature Plan

## Overview
This document outlines the implementation plan for the Distributor Orders management feature in the Artis Inventory Management System. This feature will track and analyze laminate orders from distributors across India.

## Business Objectives
1. Track all distributor orders with date, location, and thickness details
2. Analyze order patterns and trends
3. Identify top-performing distributors and regions
4. Forecast demand based on historical data
5. Integrate with existing distributor map for geographic insights

## Data Structure

### Core Fields
- **Location**: City where distributor is located
- **Distributor**: Name of the distributor
- **Date**: Order date (DD.MM.YYYY format)
- **Thickness Types**:
  - `.72/.82/.92`: Special thickness range
  - `0.8mm`: Woodrica/Artvio product line
  - `1mm`: Artis product line
- **Total Pieces**: Sum of all thickness quantities

### Database Schema

```sql
-- Main orders table
distributor_orders {
  id: serial primary key
  distributor_id: integer (FK to distributors)
  location: varchar(100)
  order_date: date
  thickness_72_92: integer default 0
  thickness_08: integer default 0
  thickness_1mm: integer default 0
  total_pieces: integer
  month_year: varchar(20)
  quarter: varchar(10)
  created_at: timestamp
  updated_at: timestamp
}

-- Summary/analytics table (materialized view)
distributor_order_summary {
  distributor_id: integer
  distributor_name: varchar(200)
  location: varchar(100)
  total_orders: integer
  total_pieces: bigint
  avg_order_size: decimal
  last_order_date: date
  preferred_thickness: varchar(20)
}
```

## UI/UX Specifications

### Main Dashboard Layout
```
┌────────────────────────────────────────────────┐
│            Distributor Orders Dashboard         │
├────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │Orders │ │Volume│ │Active│ │ Avg  │         │
│  │ This │ │ This │ │Distri│ │Order │         │
│  │Month │ │Month │ │butors│ │ Size │         │
│  └──────┘ └──────┘ └──────┘ └──────┘         │
├────────────────────────────────────────────────┤
│         📊 Order Trends (Line Chart)           │
│         [Thickness] [Location] [Distributor]   │
├────────────────────────────────────────────────┤
│  📊 By Thickness │ 📊 By Location │ 📊 Top 10 │
│   (Pie Chart)    │  (Bar Chart)   │ Distribs │
├────────────────────────────────────────────────┤
│              📋 Recent Orders Table             │
│  [Search] [Date Range] [Export]                │
│  ┌────┬──────────┬────────┬──────┬─────┐     │
│  │Date│Distributor│Location│Thick │Total│     │
│  ├────┼──────────┼────────┼──────┼─────┤     │
│  │... │   ...    │  ...   │ ...  │ ... │     │
│  └────┴──────────┴────────┴──────┴─────┘     │
└────────────────────────────────────────────────┘
```

### Interactive Features
1. **Filters**:
   - Date range picker
   - Distributor multi-select dropdown
   - Location multi-select dropdown
   - Thickness type checkboxes

2. **Charts**:
   - Click to drill down
   - Hover for details
   - Toggle data series

3. **Table**:
   - Sortable columns
   - Pagination
   - Search functionality
   - Export to Excel/CSV

## Implementation Phases

### Phase 1: Foundation (Completed ✅)
- [x] Create planning document
- [x] Set up database schema with migrations
- [x] Create static page with mock data
- [x] Add navigation links to dashboard
- [x] Basic table with pagination and sorting
- [x] Interactive charts (trends, thickness, location)
- [x] Filter controls for all data dimensions

### Phase 2: Data Integration (In Progress)
- [ ] Import cleaned distributor data from Google Sheets
- [x] Create API endpoints (ready at `/api/distributor-orders`)
- [x] Backend controllers with analytics queries
- [ ] Connect frontend to live backend data
- [ ] Add real-time data updates

### Phase 3: Analytics (Partially Complete)
- [x] Basic filtering (distributor, location, thickness, date range)
- [x] Trend analysis charts
- [ ] Predictive analytics
- [ ] Automated insights and alerts

### Phase 4: Map Integration (Pending)
- [ ] Link with existing distributor map
- [ ] Show orders on geographic visualization
- [ ] Regional analytics overlay
- [ ] Heatmap of order density

## API Endpoints

### Orders Management
- `GET /api/distributor-orders` - List all orders with filters
- `GET /api/distributor-orders/:id` - Get single order
- `POST /api/distributor-orders` - Create new order
- `PUT /api/distributor-orders/:id` - Update order
- `DELETE /api/distributor-orders/:id` - Delete order
- `POST /api/distributor-orders/import` - Bulk import

### Analytics
- `GET /api/distributor-orders/analytics/summary` - Dashboard metrics
- `GET /api/distributor-orders/analytics/trends` - Trend data
- `GET /api/distributor-orders/analytics/by-thickness` - Thickness breakdown
- `GET /api/distributor-orders/analytics/by-location` - Location breakdown
- `GET /api/distributor-orders/analytics/top-distributors` - Top performers

## Analytics Metrics

### Key Performance Indicators (KPIs)
1. **Order Volume Metrics**:
   - Total orders (monthly/quarterly/yearly)
   - Order growth rate
   - Average order frequency

2. **Product Mix Analysis**:
   - Thickness distribution percentages
   - Product preference by region
   - Trend in thickness preferences

3. **Distributor Performance**:
   - Top 10 distributors by volume
   - Distributor retention rate
   - Order consistency score

4. **Geographic Insights**:
   - Orders by state/region
   - Regional growth rates
   - Demand density maps

## Mock Data Structure

```javascript
const mockOrders = [
  {
    id: 1,
    distributor: "Rajgiri Ply",
    location: "Mumbai",
    order_date: "17.07.2025",
    thickness_72_92: 0,
    thickness_08: 40,
    thickness_1mm: 0,
    total_pieces: 40
  },
  // ... more mock data
];
```

## Technology Stack

### Frontend
- React with TypeScript
- Material-UI for components
- Recharts for visualizations
- React Query for data fetching
- Day.js for date handling

### Backend
- Node.js with Express
- PostgreSQL with Sequelize
- JWT authentication
- Express validators

## Testing Strategy
1. Unit tests for calculations
2. Integration tests for API
3. E2E tests for critical flows
4. Performance testing for large datasets

## Performance Considerations
- Pagination for large tables
- Lazy loading for charts
- Caching for analytics queries
- Indexed database columns
- Optimized aggregate queries

## Security Considerations
- Role-based access control
- Input validation
- SQL injection prevention
- Rate limiting on imports

## Future Enhancements
1. Email alerts for large orders
2. WhatsApp integration for order updates
3. AI-based demand forecasting
4. Automated reorder suggestions
5. Mobile app for field sales
6. Integration with ERP systems

## Success Metrics
- 90% reduction in manual order tracking time
- 100% order data accuracy
- <2 second page load time
- 95% user satisfaction score

## Current Status

### Completed Features ✅
1. **Database**:
   - Migration created (`20250929000001-create-distributor-orders.js`)
   - Sequelize model with auto-calculations
   - Analytics views for reporting

2. **Backend API**:
   - Full CRUD operations at `/api/distributor-orders`
   - Analytics endpoints for trends, thickness, and location analysis
   - Bulk import endpoint ready for data migration
   - Authentication integrated

3. **Frontend Page**:
   - Accessible via Dashboard navigation menu (between "Distributors" and "Contacts")
   - Metrics cards showing key KPIs
   - Interactive charts with toggle views (trends, thickness, location)
   - Filterable data table with pagination
   - Date range, distributor, location, and thickness filters
   - Currently using mock data for demonstration

### Known Issues & Solutions
1. **Date Picker Package Conflict**: Resolved by using native HTML5 date inputs instead of MUI date pickers
2. **Auth Middleware**: Fixed import name from `authenticateToken` to `auth`
3. **Sequelize QueryTypes**: Fixed import and usage

### Next Steps
1. Wait for employee to complete data entry in Google Sheets
2. Create import script to clean and migrate data
3. Connect frontend to live backend data
4. Add export functionality
5. Integrate with distributor map

## Timeline
- ~~Week 1: Static page and database setup~~ ✅ Complete
- Week 2: Data import and live integration (pending data entry)
- Week 3: Enhanced analytics and map integration
- Week 4: Testing and optimization

## Notes
- All dates in DD.MM.YYYY format (using native HTML5 inputs)
- Thickness in mm units (.72/.82/.92, 0.8, 1mm)
- Total pieces auto-calculated
- Monthly totals preserved for validation
- Mock data includes 5 sample distributors with realistic order patterns

---

Last Updated: September 29, 2025
Status: **Functional with Mock Data - Awaiting Real Data Import**

## Quick Reference for Future Sessions

### Files Created/Modified:
1. **Backend**:
   - `/backend/migrations/20250929000001-create-distributor-orders.js`
   - `/backend/src/models/DistributorOrder.ts`
   - `/backend/src/routes/distributorOrders.ts`
   - `/backend/src/controllers/distributorOrderController.ts`
   - `/backend/src/server.ts` (added route)

2. **Frontend**:
   - `/frontend/src/pages/DistributorOrders.tsx`
   - `/frontend/src/components/Dashboard.tsx` (added menu items and routing)

### Key Decisions Made:
- Used native HTML5 date inputs instead of MUI date pickers (version conflict resolved)
- Auth middleware uses `auth` not `authenticateToken`
- Mock data includes 5 sample distributors for testing
- Page accessible via dropdown menu in Dashboard header

### Data Import Instructions:
When ready to import Excel data:
1. Excel should have columns: Location, Distributor, Date, Thickness (.72/.82/.92, 0.8, 1MM), T.PCS
2. Use `/api/distributor-orders/import` endpoint
3. Script will handle date format conversion (DD.MM.YYYY)
4. Will auto-calculate month_year, quarter, and state fields

### API Endpoints Ready:
- GET `/api/distributor-orders` - List with filters
- GET `/api/distributor-orders/analytics/summary` - Dashboard metrics
- GET `/api/distributor-orders/analytics/trends` - Time series data
- GET `/api/distributor-orders/analytics/by-thickness` - Thickness breakdown
- GET `/api/distributor-orders/analytics/by-location` - Location analysis
- GET `/api/distributor-orders/analytics/top-distributors` - Top performers
- POST `/api/distributor-orders/import` - Bulk import