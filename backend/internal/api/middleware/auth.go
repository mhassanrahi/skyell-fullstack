package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims defines the structure of JWT claims
type JWTClaims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	jwt.RegisteredClaims
}

// AuthRequired is a middleware that validates JWT tokens
func AuthRequired() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		tokenString := extractTokenFromHeader(c)
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Authorization token required",
			})
			c.Abort()
			return
		}

		claims, err := validateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Invalid or expired token",
				"error":   err.Error(),
			})
			c.Abort()
			return
		}

		// Set user information in context for use in handlers
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("email", claims.Email)

		c.Next()
	})
}

// extractTokenFromHeader extracts the JWT token from the Authorization header
func extractTokenFromHeader(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}

	// Check if the header starts with "Bearer "
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return ""
	}

	// Extract the token part (remove "Bearer " prefix)
	return strings.TrimPrefix(authHeader, "Bearer ")
}

// validateToken validates a JWT token and returns the claims
func validateToken(tokenString string) (*JWTClaims, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-super-secret-jwt-key-here" // fallback for development
	}

	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}

// OptionalAuth is middleware for endpoints that can work with or without authentication
func OptionalAuth() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		tokenString := extractTokenFromHeader(c)
		if tokenString != "" {
			claims, err := validateToken(tokenString)
			if err == nil {
				// Set user information in context if token is valid
				c.Set("user_id", claims.UserID)
				c.Set("username", claims.Username)
				c.Set("email", claims.Email)
				c.Set("authenticated", true)
			}
		}

		c.Next()
	})
}
