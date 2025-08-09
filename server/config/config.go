package config

import "os"

var (
	DB_USER     = getEnv("DB_USER", "root")
	DB_PORT     = getEnv("DB_PORT", "3306")
	DB_HOST     = getEnv("DB_HOST", "localhost")
	DB_SECRET   = getEnv("DB_SECRET", "password")
	DB_DATABASE = getEnv("DB_DATABASE", "double_ratchet")

	JWT_SERRET = getEnv("JWT_SECRET", "password")
)

func getEnv(key string, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
