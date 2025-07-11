# 🕷️ Skyell URL Crawler

A full-stack web application for crawling and analyzing websites, built with **React** (frontend) and **Go** (backend).

## 📋 **Project Overview**

This application allows users to:
- **Add URLs** for crawling and analysis
- **Start/Stop crawling** operations on demand
- **View detailed results** including HTML version, headings, links, and broken links
- **Analyze website structure** with interactive charts and visualizations
- **Bulk operations** for managing multiple URLs
- **Real-time status updates** during crawling operations

## 🚀 **Tech Stack**

### **Frontend**
- **React 19** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS v4** for styling
- **React Query v5** for data fetching
- **React Hook Form** with Yup validation
- **Recharts** for data visualization
- **Lucide React** for icons
- **Vitest** + **React Testing Library** for testing

### **Backend**
- **Go 1.24.5** with Gin framework
- **MySQL** database with GORM ORM
- **JWT** authentication
- **CORS** support
- **RESTful API** design

## 📦 **Installation & Setup**

### **Prerequisites**
- **Node.js** (v18 or higher)
- **Go** (v1.24 or higher)
- **MySQL** (v8.0 or higher)
- **Git**

### **1. Clone the Repository**
```bash
git clone <repository-url>
cd skyell
```

### **2. Backend Setup**
```bash
# Navigate to backend directory
cd backend

# Install Go dependencies
go mod download

# Create MySQL database
mysql -u root -p -e "CREATE DATABASE skyell_dev;"

# Copy environment file and configure
cp .env.example .env
# Edit .env with your database credentials and settings

# Run database migrations
go run main.go migrate

# Start the backend server
go run main.go
```

The backend will start on `http://localhost:8080`

### **3. Frontend Setup**
```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
```

The frontend will start on `http://localhost:3005`

## 🎯 **Features**

### **Core Functionality**
- ✅ **URL Management** - Add, delete, and manage URLs
- ✅ **Crawling Engine** - Analyze HTML structure and extract data
- ✅ **Results Dashboard** - Paginated, sortable, filterable results
- ✅ **Details View** - Interactive charts and broken link analysis
- ✅ **Bulk Operations** - Multi-select actions for URLs and results
- ✅ **Real-time Updates** - Smart polling with live status indicators

### **Data Collection**
- **HTML Version** detection
- **Page Title** extraction
- **Heading Structure** (H1-H6 counts)
- **Link Analysis** (internal vs external)
- **Broken Link Detection** (4xx/5xx status codes)
- **Login Form Detection**

### **User Experience**
- 📱 **Responsive Design** - Works on desktop and mobile
- 🎨 **Modern UI** - Clean, intuitive interface
- ⚡ **Fast Performance** - Optimized with React Query caching
- 🔄 **Real-time Updates** - Live status and progress indicators
- 🎯 **Accessibility** - ARIA labels and keyboard navigation

## 🔧 **Development**

### **Available Scripts**

#### **Backend**
```bash
# Run development server
go run main.go

# Run tests
go test ./...

# Build for production
go build -o skyell main.go

# Database migrations
go run main.go migrate
```

#### **Frontend**
```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run tests once
npm run test:run

# Lint code
npm run lint
```

### **API Documentation**

#### **Authentication**
All API requests require JWT authentication via `Authorization: Bearer <token>` header.

#### **Main Endpoints**

**URL Management:**
- `POST /api/v1/urls` - Add new URL
- `GET /api/v1/urls` - Get paginated URLs with filters
- `DELETE /api/v1/urls/:id` - Delete URL
- `POST /api/v1/urls/:id/start` - Start crawling
- `POST /api/v1/urls/:id/stop` - Stop crawling
- `POST /api/v1/urls/bulk/start` - Bulk start crawling
- `POST /api/v1/urls/bulk/stop` - Bulk stop crawling  
- `POST /api/v1/urls/bulk/delete` - Bulk delete URLs

**Results & Analysis:**
- `GET /api/v1/results` - Get paginated results with filters
- `GET /api/v1/results/:id` - Get detailed result
- `GET /api/v1/results/:id/links` - Get result links

**Authentication:**
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Register

### **Project Structure**

```
skyell/
├── backend/
│   ├── cmd/               # Application entrypoints
│   ├── internal/          # Private application code
│   │   ├── auth/          # Authentication logic
│   │   ├── crawler/       # Web crawling engine
│   │   ├── database/      # Database models and migrations
│   │   ├── handlers/      # HTTP handlers
│   │   └── middleware/    # HTTP middleware
│   ├── pkg/               # Public packages
│   ├── go.mod
│   └── main.go
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── types/         # TypeScript types
│   │   └── test/          # Test utilities
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## 🧪 **Testing**

### **Frontend Testing**
```bash
cd frontend

# Run all tests
npm run test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui
```

**Test Coverage:**
- Component rendering and user interactions
- Form validation and submission
- API integration and error handling
- Accessibility and keyboard navigation

### **Backend Testing**
```bash
cd backend

# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run specific test
go test ./internal/crawler
```

## 🔒 **Security**

- **JWT Authentication** for API access
- **Input Validation** on all endpoints
- **SQL Injection Prevention** with GORM
- **XSS Protection** with proper data sanitization
- **CORS Configuration** for cross-origin requests

## 📊 **Performance**

- **Concurrent Crawling** with Go goroutines
- **Database Indexing** for fast queries
- **Frontend Caching** with React Query
- **Smart Polling** - adaptive refresh rates
- **Code Splitting** for faster loading

## 🚀 **Deployment**

### **Backend Deployment**
```bash
# Build binary
go build -o skyell main.go

# Run with environment variables
DB_HOST=localhost DB_PORT=3306 DB_NAME=skyell_prod ./skyell
```

### **Frontend Deployment**
```bash
# Build for production
npm run build

# Deploy the dist/ directory to your hosting platform
```

## 📈 **Future Enhancements**

- **WebSocket Support** for real-time updates
- **Advanced Analytics** - SEO analysis, performance metrics
- **Export Functionality** - PDF/CSV reports
- **Scheduling** - Automated crawling schedules
- **User Management** - Role-based access control
- **API Rate Limiting** - Prevent abuse
