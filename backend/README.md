# Skyell Backend

Go backend API for the URL crawler application.

## Structure

```
backend/
├── cmd/                    # Application entrypoints
│   └── main.go            # Main server file
├── internal/              # Private application code
│   ├── api/               # API layer
│   │   ├── handlers/      # HTTP handlers
│   │   ├── middleware/    # HTTP middleware
│   │   └── routes.go      # Route definitions
│   ├── database/          # Database connection and migrations
│   ├── models/            # Data models
│   └── services/          # Business logic
├── pkg/                   # Public packages
│   └── crawler/           # Web crawler engine
├── configs/               # Configuration files
├── migrations/            # Database migrations
├── go.mod                 # Go module file
└── config.example.env     # Environment configuration template
```

## Setup

### Prerequisites
- Go 1.21+
- MySQL 8.0+

### Installation

1. **Install dependencies**
   ```bash
   go mod download
   ```

2. **Configure environment**
   ```bash
   cp config.example.env .env
   # Edit .env with your database credentials
   ```

3. **Create database**
   ```sql
   CREATE DATABASE skyell_crawler;
   ```

4. **Run the application**
   ```bash
   go run cmd/main.go
   ```

### Development

- The server runs on `http://localhost:8080`
- Database migrations run automatically on startup

### API Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh JWT token

#### URL Management
- `GET /api/v1/urls` - List user's URLs
- `POST /api/v1/urls` - Add new URL
- `GET /api/v1/urls/:id` - Get specific URL
- `PUT /api/v1/urls/:id` - Update URL
- `DELETE /api/v1/urls/:id` - Delete URL
- `DELETE /api/v1/urls` - Bulk delete URLs

#### Crawl Control
- `POST /api/v1/crawl/start/:id` - Start crawling URL
- `POST /api/v1/crawl/stop/:id` - Stop crawling URL
- `POST /api/v1/crawl/bulk-start` - Start multiple crawls
- `POST /api/v1/crawl/bulk-stop` - Stop multiple crawls

#### Results
- `GET /api/v1/results` - Get paginated results
- `GET /api/v1/results/:id` - Get detailed result
- `GET /api/v1/results/:id/links` - Get links for result

#### Status
- `GET /api/v1/status/urls` - Get all URLs status
- `GET /api/v1/status/url/:id` - Get specific URL status