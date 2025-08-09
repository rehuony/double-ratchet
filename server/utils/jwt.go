package utils

import (
	"time"

	"double-ratchet-server/config"

	"github.com/golang-jwt/jwt/v5"
)

type claims struct {
	jwt.RegisteredClaims
	UUID     string `json:"uuid"`
	Username string `json:"username"`
}

func GenerateJWT(uuid, username string, remember bool) (string, error) {
	var expirationTime time.Duration
	if remember {
		expirationTime = 7 * 24 * time.Hour
	} else {
		expirationTime = 24 * time.Hour
	}

	claims := &claims{
		UUID:     uuid,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expirationTime)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.JWT_SERRET))
}

func ParseJWT(tokenStr string) (*claims, error) {
	claims := &claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (any, error) {
		return []byte(config.JWT_SERRET), nil
	})

	if err != nil || !token.Valid {
		return nil, err
	}

	return claims, nil
}

func ValidateJWT(tokenStr string) bool {
	claims, err := ParseJWT(tokenStr)
	if err != nil || claims.ExpiresAt.Unix() < time.Now().Unix() {
		return false
	}
	return true

}
