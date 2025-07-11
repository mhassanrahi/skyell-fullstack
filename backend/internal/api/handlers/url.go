package handlers

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"skyell-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type URLHandler struct {
	db *gorm.DB
}

func NewURLHandler(db *gorm.DB) *URLHandler {
	return &URLHandler{db: db}
}

type CreateURLRequest struct {
	URL string `json:"url" binding:"required"`
}

type UpdateURLRequest struct {
	URL string `json:"url" binding:"required"`
}

type URLResponse struct {
	*models.URL
	CrawlResults []models.CrawlResult `json:"crawl_results,omitempty"`
}

type PaginationResponse struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

type URLListResponse struct {
	Data       []URLResponse      `json:"data"`
	Pagination PaginationResponse `json:"pagination"`
}

// GetURLs returns a paginated list of URLs for the authenticated user
func (h *URLHandler) GetURLs(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")
	status := c.Query("status")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit

	// Build query
	query := h.db.Where("user_id = ?", userID)

	// Apply filters
	if search != "" {
		query = query.Where("url LIKE ?", "%"+search+"%")
	}
	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	// Apply sorting
	orderClause := fmt.Sprintf("%s %s", sortBy, sortOrder)
	query = query.Order(orderClause)

	// Get total count
	var total int64
	if err := query.Model(&models.URL{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to count URLs",
			"error":   err.Error(),
		})
		return
	}

	// Get URLs with pagination
	var urls []models.URL
	if err := query.Offset(offset).Limit(limit).Find(&urls).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to retrieve URLs",
			"error":   err.Error(),
		})
		return
	}

	// Convert to response format
	var urlResponses []URLResponse
	for _, url := range urls {
		urlResponses = append(urlResponses, URLResponse{URL: &url})
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": URLListResponse{
			Data: urlResponses,
			Pagination: PaginationResponse{
				Page:       page,
				Limit:      limit,
				Total:      total,
				TotalPages: totalPages,
			},
		},
	})
}

// CreateURL adds a new URL for the authenticated user
func (h *URLHandler) CreateURL(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	var req CreateURLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	// Validate URL format
	if !isValidURL(req.URL) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid URL format",
		})
		return
	}

	// Check if URL already exists for this user
	var existingURL models.URL
	if err := h.db.Where("user_id = ? AND url = ?", userID, req.URL).First(&existingURL).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "URL already exists",
		})
		return
	}

	// Create new URL entry
	newURL := models.URL{
		URL:    req.URL,
		UserID: userID.(uint),
		Status: models.StatusQueued,
	}

	if err := h.db.Create(&newURL).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create URL",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "URL added successfully",
		"data":    URLResponse{URL: &newURL},
	})
}

// GetURL returns a specific URL by ID
func (h *URLHandler) GetURL(c *gin.Context) {
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

	var url models.URL
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).Preload("CrawlResults").First(&url).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "URL not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to retrieve URL",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    URLResponse{URL: &url, CrawlResults: url.CrawlResults},
	})
}

// UpdateURL updates an existing URL
func (h *URLHandler) UpdateURL(c *gin.Context) {
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

	var req UpdateURLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	// Validate URL format
	if !isValidURL(req.URL) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid URL format",
		})
		return
	}

	// Find and update URL
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

	// Update URL
	url.URL = req.URL
	url.Status = models.StatusQueued // Reset status when URL is updated

	if err := h.db.Save(&url).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to update URL",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "URL updated successfully",
		"data":    URLResponse{URL: &url},
	})
}

// DeleteURL deletes a specific URL
func (h *URLHandler) DeleteURL(c *gin.Context) {
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

	// Delete URL (soft delete due to GORM)
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.URL{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to delete URL",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "URL deleted successfully",
	})
}

// BulkDeleteURLs deletes multiple URLs
func (h *URLHandler) BulkDeleteURLs(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	var req struct {
		IDs []uint `json:"ids" binding:"required"`
	}

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
			"message": "No URLs specified for deletion",
		})
		return
	}

	// Delete URLs
	result := h.db.Where("id IN ? AND user_id = ?", req.IDs, userID).Delete(&models.URL{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to delete URLs",
			"error":   result.Error.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Successfully deleted %d URL(s)", result.RowsAffected),
	})
}

// GetURLsStatus returns the current status of all URLs for real-time updates
func (h *URLHandler) GetURLsStatus(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	var urls []models.URL
	if err := h.db.Where("user_id = ?", userID).Select("id, url, status, error_message, updated_at").Find(&urls).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to retrieve URL status",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    urls,
	})
}

// GetURLStatus returns the status of a specific URL
func (h *URLHandler) GetURLStatus(c *gin.Context) {
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

	var url models.URL
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).Select("id, url, status, error_message, updated_at").First(&url).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "URL not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to retrieve URL status",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    url,
	})
}

// Helper functions

// isValidURL validates if a string is a valid URL
func isValidURL(str string) bool {
	u, err := url.Parse(str)
	return err == nil && u.Scheme != "" && u.Host != ""
}

// Results Dashboard API endpoints

type CrawlResultResponse struct {
	ID              uint           `json:"id"`
	URL             string         `json:"url"`
	Title           string         `json:"title"`
	HTMLVersion     string         `json:"html_version"`
	HasLoginForm    bool           `json:"has_login_form"`
	H1Count         int            `json:"h1_count"`
	H2Count         int            `json:"h2_count"`
	H3Count         int            `json:"h3_count"`
	H4Count         int            `json:"h4_count"`
	H5Count         int            `json:"h5_count"`
	H6Count         int            `json:"h6_count"`
	InternalLinks   int            `json:"internal_links"`
	ExternalLinks   int            `json:"external_links"`
	BrokenLinks     int            `json:"broken_links"`
	Status          string         `json:"status"`
	CrawledAt       string         `json:"crawled_at"`
	ChartData       *LinkChartData `json:"chart_data,omitempty"`
	BrokenLinksList []models.Link  `json:"broken_links_list,omitempty"`
}

type LinkChartData struct {
	InternalLinks int `json:"internal_links"`
	ExternalLinks int `json:"external_links"`
	BrokenLinks   int `json:"broken_links"`
	TotalLinks    int `json:"total_links"`
}

type CrawlResultsListResponse struct {
	Data       []CrawlResultResponse `json:"data"`
	Pagination PaginationResponse    `json:"pagination"`
}

// GetResults returns paginated, sortable, filterable crawl results
func (h *URLHandler) GetResults(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")
	status := c.Query("status")
	sortBy := c.DefaultQuery("sort_by", "crawled_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit

	// Build query for crawl results (only show results where crawl was completed)
	query := h.db.Table("crawl_results").
		Joins("JOIN urls ON crawl_results.url_id = urls.id").
		Where("urls.user_id = ?", userID)

	// Apply filters
	if search != "" {
		query = query.Where("urls.url LIKE ? OR crawl_results.title LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if status != "" && status != "all" {
		if status == "has_login_form" {
			query = query.Where("crawl_results.has_login_form = ?", true)
		}
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to count results",
			"error":   err.Error(),
		})
		return
	}

	// Apply sorting
	var orderClause string
	switch sortBy {
	case "url":
		orderClause = fmt.Sprintf("urls.url %s", sortOrder)
	case "title":
		orderClause = fmt.Sprintf("crawl_results.title %s", sortOrder)
	case "links":
		orderClause = fmt.Sprintf("(crawl_results.internal_links + crawl_results.external_links) %s", sortOrder)
	case "crawled_at":
		orderClause = fmt.Sprintf("crawl_results.created_at %s", sortOrder)
	default:
		orderClause = fmt.Sprintf("crawl_results.created_at %s", sortOrder)
	}

	// Get results with pagination
	var results []struct {
		models.CrawlResult
		CrawlURL string `json:"crawl_url"`
	}

	if err := query.
		Select("crawl_results.*, urls.url as crawl_url").
		Order(orderClause).
		Offset(offset).
		Limit(limit).
		Find(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to retrieve results",
			"error":   err.Error(),
		})
		return
	}

	// Convert to response format
	var crawlResponses []CrawlResultResponse
	for _, result := range results {
		crawlResponses = append(crawlResponses, CrawlResultResponse{
			ID:            result.ID,
			URL:           result.CrawlURL,
			Title:         result.Title,
			HTMLVersion:   result.HTMLVersion,
			HasLoginForm:  result.HasLoginForm,
			H1Count:       result.H1Count,
			H2Count:       result.H2Count,
			H3Count:       result.H3Count,
			H4Count:       result.H4Count,
			H5Count:       result.H5Count,
			H6Count:       result.H6Count,
			InternalLinks: result.InternalLinks,
			ExternalLinks: result.ExternalLinks,
			BrokenLinks:   result.BrokenLinks,
			Status:        "completed",
			CrawledAt:     result.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": CrawlResultsListResponse{
			Data: crawlResponses,
			Pagination: PaginationResponse{
				Page:       page,
				Limit:      limit,
				Total:      total,
				TotalPages: totalPages,
			},
		},
	})
}

// GetResultDetail returns detailed crawl result with chart data
func (h *URLHandler) GetResultDetail(c *gin.Context) {
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
			"message": "Invalid result ID",
		})
		return
	}

	// Get crawl result with URL info
	var result struct {
		models.CrawlResult
		CrawlURL string `json:"crawl_url"`
	}

	if err := h.db.Table("crawl_results").
		Joins("JOIN urls ON crawl_results.url_id = urls.id").
		Where("crawl_results.id = ? AND urls.user_id = ?", id, userID).
		Select("crawl_results.*, urls.url as crawl_url").
		First(&result).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Result not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to retrieve result",
			"error":   err.Error(),
		})
		return
	}

	// Get broken links
	var brokenLinks []models.Link
	h.db.Where("crawl_result_id = ? AND is_broken = ?", result.ID, true).Find(&brokenLinks)

	// Prepare chart data
	chartData := &LinkChartData{
		InternalLinks: result.InternalLinks,
		ExternalLinks: result.ExternalLinks,
		BrokenLinks:   result.BrokenLinks,
		TotalLinks:    result.InternalLinks + result.ExternalLinks,
	}

	// Create response
	response := CrawlResultResponse{
		ID:              result.ID,
		URL:             result.CrawlURL,
		Title:           result.Title,
		HTMLVersion:     result.HTMLVersion,
		HasLoginForm:    result.HasLoginForm,
		H1Count:         result.H1Count,
		H2Count:         result.H2Count,
		H3Count:         result.H3Count,
		H4Count:         result.H4Count,
		H5Count:         result.H5Count,
		H6Count:         result.H6Count,
		InternalLinks:   result.InternalLinks,
		ExternalLinks:   result.ExternalLinks,
		BrokenLinks:     result.BrokenLinks,
		Status:          "completed",
		CrawledAt:       result.CreatedAt.Format("2006-01-02 15:04:05"),
		ChartData:       chartData,
		BrokenLinksList: brokenLinks,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// GetLinks returns all links for a specific crawl result
func (h *URLHandler) GetLinks(c *gin.Context) {
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
			"message": "Invalid result ID",
		})
		return
	}

	// Verify user owns this crawl result
	var crawlResult models.CrawlResult
	if err := h.db.Table("crawl_results").
		Joins("JOIN urls ON crawl_results.url_id = urls.id").
		Where("crawl_results.id = ? AND urls.user_id = ?", id, userID).
		First(&crawlResult).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Result not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to verify result ownership",
			"error":   err.Error(),
		})
		return
	}

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	linkType := c.Query("type") // "internal", "external", or "broken"
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	offset := (page - 1) * limit

	// Build query
	query := h.db.Where("crawl_result_id = ?", id)

	// Apply filters
	if linkType == "internal" {
		query = query.Where("type = ?", models.LinkTypeInternal)
	} else if linkType == "external" {
		query = query.Where("type = ?", models.LinkTypeExternal)
	} else if linkType == "broken" {
		query = query.Where("is_broken = ?", true)
	}

	if search != "" {
		query = query.Where("url LIKE ?", "%"+search+"%")
	}

	// Get total count
	var total int64
	if err := query.Model(&models.Link{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to count links",
			"error":   err.Error(),
		})
		return
	}

	// Get links with pagination
	var links []models.Link
	if err := query.Offset(offset).Limit(limit).Find(&links).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to retrieve links",
			"error":   err.Error(),
		})
		return
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"links": links,
			"pagination": PaginationResponse{
				Page:       page,
				Limit:      limit,
				Total:      total,
				TotalPages: totalPages,
			},
		},
	})
}
