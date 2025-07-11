-- Skyell URL Crawler Database Schema
-- Run this script to create all necessary tables and indexes

-- Set charset and collation
SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS skyell_crawler CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE skyell_crawler;

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_users_username (username),
    INDEX idx_users_email (email),
    INDEX idx_users_deleted_at (deleted_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 2. Create urls table
CREATE TABLE IF NOT EXISTS urls (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    url TEXT NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    status ENUM(
        'queued',
        'running',
        'completed',
        'error'
    ) DEFAULT 'queued',
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_urls_user_id (user_id),
    INDEX idx_urls_status (status),
    INDEX idx_urls_created_at (created_at),
    INDEX idx_urls_deleted_at (deleted_at),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 3. Create crawl_results table
CREATE TABLE IF NOT EXISTS crawl_results (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    url_id BIGINT UNSIGNED NOT NULL,
    title TEXT NULL,
    html_version VARCHAR(50) NULL,
    has_login_form BOOLEAN DEFAULT FALSE,
    h1_count INT DEFAULT 0,
    h2_count INT DEFAULT 0,
    h3_count INT DEFAULT 0,
    h4_count INT DEFAULT 0,
    h5_count INT DEFAULT 0,
    h6_count INT DEFAULT 0,
    internal_links INT DEFAULT 0,
    external_links INT DEFAULT 0,
    broken_links INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_crawl_results_url_id (url_id),
    INDEX idx_crawl_results_created_at (created_at),
    INDEX idx_crawl_results_deleted_at (deleted_at),
    FOREIGN KEY (url_id) REFERENCES urls (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 4. Create links table
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

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Database schema created successfully!' as message;