package crawler

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"skyell-backend/internal/models"
	"strings"
	"time"

	"golang.org/x/net/html"
	"gorm.io/gorm"
)

type CrawlerService struct {
	db     *gorm.DB
	client *http.Client
}

func NewCrawlerService(db *gorm.DB) *CrawlerService {
	client := &http.Client{
		Timeout: 30 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Allow up to 10 redirects
			if len(via) >= 10 {
				return fmt.Errorf("stopped after 10 redirects")
			}
			return nil
		},
	}

	return &CrawlerService{
		db:     db,
		client: client,
	}
}

type CrawlData struct {
	Title         string
	HTMLVersion   string
	HasLoginForm  bool
	HeadingCounts map[string]int
	InternalLinks []string
	ExternalLinks []string
	BrokenLinks   []string
}

// CrawlURL performs the actual crawling and analysis of a URL
func (cs *CrawlerService) CrawlURL(urlID uint) error {
	// Get the URL from database
	var urlEntry models.URL
	if err := cs.db.First(&urlEntry, urlID).Error; err != nil {
		return fmt.Errorf("failed to find URL: %w", err)
	}

	// Update status to running
	urlEntry.Status = models.StatusRunning
	cs.db.Save(&urlEntry)

	// Perform the crawl
	crawlData, err := cs.fetchAndAnalyze(urlEntry.URL)
	if err != nil {
		// Update status to error
		urlEntry.Status = models.StatusError
		urlEntry.ErrorMessage = err.Error()
		cs.db.Save(&urlEntry)
		return err
	}

	// Check for broken links
	brokenLinks := cs.checkLinkAccessibility(crawlData.InternalLinks, crawlData.ExternalLinks)

	// Create crawl result
	crawlResult := models.CrawlResult{
		URLID:         urlEntry.ID,
		Title:         crawlData.Title,
		HTMLVersion:   crawlData.HTMLVersion,
		HasLoginForm:  crawlData.HasLoginForm,
		H1Count:       crawlData.HeadingCounts["h1"],
		H2Count:       crawlData.HeadingCounts["h2"],
		H3Count:       crawlData.HeadingCounts["h3"],
		H4Count:       crawlData.HeadingCounts["h4"],
		H5Count:       crawlData.HeadingCounts["h5"],
		H6Count:       crawlData.HeadingCounts["h6"],
		InternalLinks: len(crawlData.InternalLinks),
		ExternalLinks: len(crawlData.ExternalLinks),
		BrokenLinks:   len(brokenLinks),
	}

	// Save crawl result
	if err := cs.db.Create(&crawlResult).Error; err != nil {
		urlEntry.Status = models.StatusError
		urlEntry.ErrorMessage = fmt.Sprintf("Failed to save results: %v", err)
		cs.db.Save(&urlEntry)
		return fmt.Errorf("failed to save crawl results: %w", err)
	}

	// Save individual links
	cs.saveLinks(crawlResult.ID, crawlData.InternalLinks, crawlData.ExternalLinks, brokenLinks)

	// Update URL status to completed
	urlEntry.Status = models.StatusCompleted
	urlEntry.ErrorMessage = ""
	cs.db.Save(&urlEntry)

	return nil
}

// fetchAndAnalyze fetches the URL and analyzes its content
func (cs *CrawlerService) fetchAndAnalyze(targetURL string) (*CrawlData, error) {
	// Fetch the webpage
	resp, err := cs.client.Get(targetURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP error: %d %s", resp.StatusCode, resp.Status)
	}

	// Read the body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Parse HTML
	doc, err := html.Parse(strings.NewReader(string(body)))
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	// Analyze the document
	crawlData := &CrawlData{
		HeadingCounts: make(map[string]int),
		InternalLinks: []string{},
		ExternalLinks: []string{},
	}

	// Extract base URL for relative link resolution
	baseURL, _ := url.Parse(targetURL)

	// Walk through the HTML tree
	cs.walkNode(doc, crawlData, baseURL, string(body))

	return crawlData, nil
}

// walkNode recursively walks through HTML nodes to extract data
func (cs *CrawlerService) walkNode(n *html.Node, data *CrawlData, baseURL *url.URL, htmlContent string) {
	if n.Type == html.ElementNode {
		switch strings.ToLower(n.Data) {
		case "title":
			if n.FirstChild != nil {
				data.Title = strings.TrimSpace(n.FirstChild.Data)
			}
		case "h1", "h2", "h3", "h4", "h5", "h6":
			data.HeadingCounts[n.Data]++
		case "a":
			// Extract links
			for _, attr := range n.Attr {
				if attr.Key == "href" {
					cs.categorizeLink(attr.Val, data, baseURL)
					break
				}
			}
		case "form":
			// Check for login form
			if cs.isLoginForm(n) {
				data.HasLoginForm = true
			}
		}
	}

	// Check for HTML version in the content
	if data.HTMLVersion == "" {
		data.HTMLVersion = cs.detectHTMLVersion(htmlContent)
	}

	// Continue walking the tree
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		cs.walkNode(c, data, baseURL, htmlContent)
	}
}

// categorizeLink categorizes a link as internal or external
func (cs *CrawlerService) categorizeLink(href string, data *CrawlData, baseURL *url.URL) {
	if href == "" || strings.HasPrefix(href, "#") || strings.HasPrefix(href, "javascript:") {
		return
	}

	linkURL, err := url.Parse(href)
	if err != nil {
		return
	}

	// Resolve relative URLs
	resolvedURL := baseURL.ResolveReference(linkURL)

	// Categorize as internal or external
	if resolvedURL.Host == baseURL.Host || resolvedURL.Host == "" {
		data.InternalLinks = append(data.InternalLinks, resolvedURL.String())
	} else {
		data.ExternalLinks = append(data.ExternalLinks, resolvedURL.String())
	}
}

// isLoginForm checks if a form is likely a login form
func (cs *CrawlerService) isLoginForm(formNode *html.Node) bool {
	hasPasswordField := false
	hasUsernameField := false

	// Walk through form children to find input fields
	var walkFormNode func(*html.Node)
	walkFormNode = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "input" {
			inputType := ""
			inputName := ""

			for _, attr := range n.Attr {
				if attr.Key == "type" {
					inputType = strings.ToLower(attr.Val)
				}
				if attr.Key == "name" {
					inputName = strings.ToLower(attr.Val)
				}
			}

			if inputType == "password" {
				hasPasswordField = true
			}

			if strings.Contains(inputName, "user") || strings.Contains(inputName, "email") ||
				strings.Contains(inputName, "login") || inputType == "email" {
				hasUsernameField = true
			}
		}

		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walkFormNode(c)
		}
	}

	walkFormNode(formNode)
	return hasPasswordField && hasUsernameField
}

// detectHTMLVersion detects the HTML version from doctype
func (cs *CrawlerService) detectHTMLVersion(htmlContent string) string {
	htmlContent = strings.ToLower(htmlContent)

	if strings.Contains(htmlContent, "<!doctype html>") {
		return "HTML5"
	} else if strings.Contains(htmlContent, "html 4.01") {
		return "HTML 4.01"
	} else if strings.Contains(htmlContent, "xhtml 1.0") {
		return "XHTML 1.0"
	} else if strings.Contains(htmlContent, "xhtml 1.1") {
		return "XHTML 1.1"
	} else if regexp.MustCompile(`<!doctype\s+html`).MatchString(htmlContent) {
		return "HTML"
	}

	return "Unknown"
}

// checkLinkAccessibility checks which links are broken (return 4xx/5xx)
func (cs *CrawlerService) checkLinkAccessibility(internalLinks, externalLinks []string) []string {
	var brokenLinks []string

	// Combine all links for checking
	allLinks := append(internalLinks, externalLinks...)

	// Limit to first 50 links to avoid overwhelming the target server
	if len(allLinks) > 50 {
		allLinks = allLinks[:50]
	}

	for _, link := range allLinks {
		if cs.isLinkBroken(link) {
			brokenLinks = append(brokenLinks, link)
		}
		// Small delay to be respectful to the server
		time.Sleep(100 * time.Millisecond)
	}

	return brokenLinks
}

// isLinkBroken checks if a link returns 4xx or 5xx status
func (cs *CrawlerService) isLinkBroken(link string) bool {
	client := &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return nil // Follow redirects
		},
	}

	resp, err := client.Head(link)
	if err != nil {
		// If HEAD fails, try GET
		resp, err = client.Get(link)
		if err != nil {
			return true
		}
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 400
}

// saveLinks saves individual links to the database
func (cs *CrawlerService) saveLinks(crawlResultID uint, internalLinks, externalLinks, brokenLinks []string) {
	brokenSet := make(map[string]bool)
	for _, broken := range brokenLinks {
		brokenSet[broken] = true
	}

	// Save internal links
	for _, link := range internalLinks {
		// Truncate URL if too long (safeguard)
		url := link
		if len(url) > 500 {
			url = url[:497] + "..."
		}

		linkEntry := models.Link{
			CrawlResultID: crawlResultID,
			URL:           url,
			Type:          models.LinkTypeInternal,
			IsBroken:      brokenSet[link],
		}
		if err := cs.db.Create(&linkEntry).Error; err != nil {
			// Log error but continue processing other links
			fmt.Printf("Failed to save internal link: %v\n", err)
		}
	}

	// Save external links
	for _, link := range externalLinks {
		// Truncate URL if too long (safeguard)
		url := link
		if len(url) > 500 {
			url = url[:497] + "..."
		}

		linkEntry := models.Link{
			CrawlResultID: crawlResultID,
			URL:           url,
			Type:          models.LinkTypeExternal,
			IsBroken:      brokenSet[link],
		}
		if err := cs.db.Create(&linkEntry).Error; err != nil {
			// Log error but continue processing other links
			fmt.Printf("Failed to save external link: %v\n", err)
		}
	}
}
