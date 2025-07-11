package handlers

import (
	"net/http"
	"os"
	"time"

	"skyell-backend/internal/api/middleware"
	"skyell-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db *gorm.DB
}

func NewAuthHandler(db *gorm.DB) *AuthHandler {
	return &AuthHandler{db: db}
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type AuthResponse struct {
	User         *models.User `json:"user"`
	Token        string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
}

// Register creates a new user account
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	// Check if user already exists
	var existingUser models.User
	if err := h.db.Where("email = ? OR username = ?", req.Email, req.Username).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "User with this email or username already exists",
		})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to hash password",
		})
		return
	}

	// Create user
	user := models.User{
		Username: req.Username,
		Email:    req.Email,
		Password: string(hashedPassword),
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create user",
			"error":   err.Error(),
		})
		return
	}

	// Generate tokens
	token, refreshToken, err := h.generateTokens(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to generate tokens",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "User registered successfully",
		"data": AuthResponse{
			User:         &user,
			Token:        token,
			RefreshToken: refreshToken,
		},
	})
}

// Login authenticates a user and returns JWT tokens
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	// Find user by email
	var user models.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Invalid email or password",
		})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Invalid email or password",
		})
		return
	}

	// Generate tokens
	token, refreshToken, err := h.generateTokens(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to generate tokens",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"data": AuthResponse{
			User:         &user,
			Token:        token,
			RefreshToken: refreshToken,
		},
	})
}

// RefreshToken generates a new access token using a refresh token
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	// Validate refresh token
	claims, err := h.validateRefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Invalid or expired refresh token",
		})
		return
	}

	// Find user
	var user models.User
	if err := h.db.First(&user, claims.UserID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not found",
		})
		return
	}

	// Generate new tokens
	token, refreshToken, err := h.generateTokens(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to generate tokens",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Token refreshed successfully",
		"data": AuthResponse{
			User:         &user,
			Token:        token,
			RefreshToken: refreshToken,
		},
	})
}

// generateTokens creates both access and refresh tokens
func (h *AuthHandler) generateTokens(user *models.User) (string, string, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-super-secret-jwt-key-here" // fallback for development
	}

	// Access token (expires in 24 hours)
	accessClaims := middleware.JWTClaims{
		UserID:   user.ID,
		Username: user.Username,
		Email:    user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.Email,
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", "", err
	}

	// Refresh token (expires in 7 days)
	refreshClaims := middleware.JWTClaims{
		UserID:   user.ID,
		Username: user.Username,
		Email:    user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.Email,
		},
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", "", err
	}

	return accessTokenString, refreshTokenString, nil
}

// validateRefreshToken validates a refresh token
func (h *AuthHandler) validateRefreshToken(tokenString string) (*middleware.JWTClaims, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-super-secret-jwt-key-here" // fallback for development
	}

	token, err := jwt.ParseWithClaims(tokenString, &middleware.JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*middleware.JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}
