package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"skyell-backend/internal/crawler"
	"skyell-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CrawlHandler struct {
	db             *gorm.DB
	crawlerService *crawler.CrawlerService
}

func NewCrawlHandler(db *gorm.DB) *CrawlHandler {
	return &CrawlHandler{
		db:             db,
		crawlerService: crawler.NewCrawlerService(db),
	}
}

type BulkCrawlRequest struct {
	IDs []uint `json:"ids" binding:"required"`
}

// StartCrawl initiates crawling for a specific URL
func (h *CrawlHandler) StartCrawl(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid URL ID",
		})
		return
	}

	// Find the URL
	var url models.URL
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&url).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "URL not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to find URL",
			"error":   err.Error(),
		})
		return
	}

	// Check if URL is already running
	if url.Status == models.StatusRunning {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "URL crawling is already in progress",
		})
		return
	}

	// Start crawling asynchronously
	go func() {
		if err := h.crawlerService.CrawlURL(uint(id)); err != nil {
			// Log error - in production you'd want proper logging here
			fmt.Printf("Crawl error for URL %d: %v\n", id, err)
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Crawling started successfully",
		"data": gin.H{
			"id":     url.ID,
			"url":    url.URL,
			"status": "running",
		},
	})
}

// StopCrawl stops crawling for a specific URL
func (h *CrawlHandler) StopCrawl(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid URL ID",
		})
		return
	}

	// Find the URL
	var url models.URL
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&url).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "URL not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to find URL",
			"error":   err.Error(),
		})
		return
	}

	// Check if URL is actually running
	if url.Status != models.StatusRunning {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "URL is not currently being crawled",
		})
		return
	}

	// Update status to queued (stopped)
	url.Status = models.StatusQueued
	url.ErrorMessage = "Crawling stopped by user"

	if err := h.db.Save(&url).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to update URL status",
			"error":   err.Error(),
		})
		return
	}

	// TODO: In a real implementation, this is where we would:
	// 1. Send a signal to stop the crawling process
	// 2. Remove from job queue if not yet processed
	// 3. Gracefully terminate any ongoing crawler operations

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Crawling stopped successfully",
		"data": gin.H{
			"id":     url.ID,
			"url":    url.URL,
			"status": url.Status,
		},
	})
}

// BulkStartCrawl starts crawling for multiple URLs
func (h *CrawlHandler) BulkStartCrawl(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	var req BulkCrawlRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	if len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "No URLs specified for crawling",
		})
		return
	}

	// Find URLs that belong to the user and are not already running
	var urls []models.URL
	if err := h.db.Where("id IN ? AND user_id = ? AND status != ?", req.IDs, userID, models.StatusRunning).Find(&urls).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to find URLs",
			"error":   err.Error(),
		})
		return
	}

	if len(urls) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "No valid URLs found for crawling (they may already be running or not exist)",
		})
		return
	}

	// Update status to running for all found URLs
	var updatedURLs []gin.H
	for _, url := range urls {
		url.Status = models.StatusRunning
		url.ErrorMessage = ""

		if err := h.db.Save(&url).Error; err != nil {
			// Log error but continue with other URLs
			continue
		}

		updatedURLs = append(updatedURLs, gin.H{
			"id":     url.ID,
			"url":    url.URL,
			"status": url.Status,
		})

		// TODO: Add to job queue for actual crawling
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Started crawling for %d URL(s)", len(updatedURLs)),
		"data":    updatedURLs,
	})
}

// BulkStopCrawl stops crawling for multiple URLs
func (h *CrawlHandler) BulkStopCrawl(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	var req BulkCrawlRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	if len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "No URLs specified for stopping",
		})
		return
	}

	// Find URLs that belong to the user and are currently running
	var urls []models.URL
	if err := h.db.Where("id IN ? AND user_id = ? AND status = ?", req.IDs, userID, models.StatusRunning).Find(&urls).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to find URLs",
			"error":   err.Error(),
		})
		return
	}

	if len(urls) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "No running URLs found to stop",
		})
		return
	}

	// Update status to queued (stopped) for all found URLs
	var updatedURLs []gin.H
	for _, url := range urls {
		url.Status = models.StatusQueued
		url.ErrorMessage = "Crawling stopped by user"

		if err := h.db.Save(&url).Error; err != nil {
			// Log error but continue with other URLs
			continue
		}

		updatedURLs = append(updatedURLs, gin.H{
			"id":     url.ID,
			"url":    url.URL,
			"status": url.Status,
		})

		// TODO: Send stop signals to running crawlers
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Stopped crawling for %d URL(s)", len(updatedURLs)),
		"data":    updatedURLs,
	})
}

// GetCrawlStatus returns the current crawling status for all URLs or specific ones
func (h *CrawlHandler) GetCrawlStatus(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	var urls []models.URL
	query := h.db.Where("user_id = ?", userID).Select("id, url, status, error_message, updated_at")

	// Check if specific URL IDs are requested
	if idsParam := c.Query("ids"); idsParam != "" {
		query = query.Where("id IN (?)", idsParam)
	}

	if err := query.Find(&urls).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to retrieve crawl status",
			"error":   err.Error(),
		})
		return
	}

	// Group URLs by status for summary
	statusSummary := map[string]int{
		"queued":    0,
		"running":   0,
		"completed": 0,
		"error":     0,
	}

	for _, url := range urls {
		statusSummary[string(url.Status)]++
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"urls":    urls,
			"summary": statusSummary,
		},
	})
}
