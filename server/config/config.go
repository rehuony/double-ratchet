package config

import "os"

var (
	JWT_SERRET = getEnv("JWT_SECRET", "password")

	MYSQL_USER     = getEnv("MYSQL_USER", "root")
	MYSQL_PORT     = getEnv("MYSQL_PORT", "3306")
	MYSQL_HOST     = getEnv("MYSQL_HOST", "localhost")
	MYSQL_SECRET   = getEnv("MYSQL_SECRET", "password")
	MYSQL_DATABASE = getEnv("MYSQL_DATABASE", "double_ratchet")
)

func getEnv(key string, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
