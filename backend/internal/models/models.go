package models

import (
	"time"

	"gorm.io/gorm"
)

// CrawlStatus represents the status of a crawl operation
type CrawlStatus string

const (
	StatusQueued    CrawlStatus = "queued"
	StatusRunning   CrawlStatus = "running"
	StatusCompleted CrawlStatus = "completed"
	StatusError     CrawlStatus = "error"
)

// User represents a user in the system
type User struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Username  string         `json:"username" gorm:"uniqueIndex;not null;size:255"`
	Email     string         `json:"email" gorm:"uniqueIndex;not null;size:255"`
	Password  string         `json:"-" gorm:"not null;size:255"` // Hide password in JSON
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// URL represents a URL to be crawled
type URL struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	URL          string         `json:"url" gorm:"not null;index;size:500"`
	UserID       uint           `json:"user_id" gorm:"not null;index"`
	User         User           `json:"user" gorm:"foreignKey:UserID"`
	Status       CrawlStatus    `json:"status" gorm:"default:'queued';size:50"`
	ErrorMessage string         `json:"error_message,omitempty" gorm:"size:1024"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationship to crawl results
	CrawlResults []CrawlResult `json:"crawl_results,omitempty" gorm:"foreignKey:URLID"`
}

// CrawlResult represents the analysis results for a crawled URL
type CrawlResult struct {
	ID    uint `json:"id" gorm:"primaryKey"`
	URLID uint `json:"url_id" gorm:"not null;index"`
	URL   URL  `json:"url" gorm:"foreignKey:URLID"`

	// Page Information
	Title        string `json:"title" gorm:"size:512"`
	HTMLVersion  string `json:"html_version" gorm:"size:50"`
	HasLoginForm bool   `json:"has_login_form"`

	// Heading Counts
	H1Count int `json:"h1_count"`
	H2Count int `json:"h2_count"`
	H3Count int `json:"h3_count"`
	H4Count int `json:"h4_count"`
	H5Count int `json:"h5_count"`
	H6Count int `json:"h6_count"`

	// Link Statistics
	InternalLinks int `json:"internal_links"`
	ExternalLinks int `json:"external_links"`
	BrokenLinks   int `json:"broken_links"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationship to individual links
	Links []Link `json:"links,omitempty" gorm:"foreignKey:CrawlResultID"`
}

// LinkType represents the type of link (internal/external)
type LinkType string

const (
	LinkTypeInternal LinkType = "internal"
	LinkTypeExternal LinkType = "external"
)

// Link represents an individual link found during crawling
type Link struct {
	ID            uint        `json:"id" gorm:"primaryKey"`
	CrawlResultID uint        `json:"crawl_result_id" gorm:"not null;index"`
	CrawlResult   CrawlResult `json:"crawl_result" gorm:"foreignKey:CrawlResultID"`

	URL        string   `json:"url" gorm:"not null;size:500"`
	AnchorText string   `json:"anchor_text" gorm:"size:512"`
	Type       LinkType `json:"type" gorm:"not null;size:50"`
	StatusCode int      `json:"status_code,omitempty"` // HTTP status code if checked
	IsBroken   bool     `json:"is_broken"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// GetHeadingCounts returns a map of heading levels to their counts
func (cr *CrawlResult) GetHeadingCounts() map[string]int {
	return map[string]int{
		"h1": cr.H1Count,
		"h2": cr.H2Count,
		"h3": cr.H3Count,
		"h4": cr.H4Count,
		"h5": cr.H5Count,
		"h6": cr.H6Count,
	}
}

// GetTotalHeadings returns the total number of heading tags
func (cr *CrawlResult) GetTotalHeadings() int {
	return cr.H1Count + cr.H2Count + cr.H3Count + cr.H4Count + cr.H5Count + cr.H6Count
}

// GetTotalLinks returns the total number of links
func (cr *CrawlResult) GetTotalLinks() int {
	return cr.InternalLinks + cr.ExternalLinks
}
