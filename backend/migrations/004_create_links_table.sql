-- Create links table
CREATE TABLE IF NOT EXISTS links (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    crawl_result_id BIGINT UNSIGNED NOT NULL,
    url TEXT NOT NULL,
    anchor_text TEXT NULL,
    type ENUM('internal', 'external') NOT NULL,
    status_code INT NULL,
    is_broken BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_links_crawl_result_id (crawl_result_id),
    INDEX idx_links_type (type),
    INDEX idx_links_is_broken (is_broken),
    INDEX idx_links_status_code (status_code),
    INDEX idx_links_deleted_at (deleted_at),
    FOREIGN KEY (crawl_result_id) REFERENCES crawl_results (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;