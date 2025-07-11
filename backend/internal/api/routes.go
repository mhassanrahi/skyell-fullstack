package api

import (
	"skyell-backend/internal/api/handlers"
	"skyell-backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB) {
	// Initialize handlers with database
	authHandler := handlers.NewAuthHandler(db)
	urlHandler := handlers.NewURLHandler(db)
	crawlHandler := handlers.NewCrawlHandler(db)

	// API v1 group
	api := r.Group("/api/v1")
	
	// Authentication routes (public)
	auth := api.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
	}

	// Protected routes - require authentication
	protected := api.Group("")
	protected.Use(middleware.AuthRequired())
	{
		// URL management endpoints
		urls := protected.Group("/urls")
		{
			urls.GET("", urlHandler.GetURLs)           // GET /api/v1/urls - list user's URLs
			urls.POST("", urlHandler.CreateURL)        // POST /api/v1/urls - add new URL
			urls.GET("/:id", urlHandler.GetURL)        // GET /api/v1/urls/:id - get specific URL
			urls.PUT("/:id", urlHandler.UpdateURL)     // PUT /api/v1/urls/:id - update URL
			urls.DELETE("/:id", urlHandler.DeleteURL)  // DELETE /api/v1/urls/:id - delete URL
			urls.DELETE("", urlHandler.BulkDeleteURLs) // DELETE /api/v1/urls - bulk delete URLs
		}

		// Crawl control endpoints
		crawl := protected.Group("/crawl")
		{
			crawl.POST("/start/:id", crawlHandler.StartCrawl)     // POST /api/v1/crawl/start/:id - start crawling URL
			crawl.POST("/stop/:id", crawlHandler.StopCrawl)       // POST /api/v1/crawl/stop/:id - stop crawling URL
			crawl.POST("/bulk-start", crawlHandler.BulkStartCrawl) // POST /api/v1/crawl/bulk-start - start multiple crawls
			crawl.POST("/bulk-stop", crawlHandler.BulkStopCrawl)   // POST /api/v1/crawl/bulk-stop - stop multiple crawls
		}

		// Results endpoints
		results := protected.Group("/results")
		{
			results.GET("", urlHandler.GetResults)           // GET /api/v1/results - paginated results
			results.GET("/:id", urlHandler.GetResultDetail)  // GET /api/v1/results/:id - detailed result
			results.GET("/:id/links", urlHandler.GetLinks)   // GET /api/v1/results/:id/links - links for result
		}

		// Status endpoints for real-time updates
		status := protected.Group("/status")
		{
			status.GET("/urls", urlHandler.GetURLsStatus)     // GET /api/v1/status/urls - get all URLs status
			status.GET("/url/:id", urlHandler.GetURLStatus)   // GET /api/v1/status/url/:id - get specific URL status
		}
	}
} 