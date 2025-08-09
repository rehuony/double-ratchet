package database

import (
	"fmt"
	"log"

	"double-ratchet-server/config"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type User struct {
	ID         uint   `gorm:"primaryKey"`
	UUID       string `gorm:"type:varchar(36);not null;uniqueIndex"`
	Username   string `gorm:"type:varchar(64);not null;unique"`
	Password   string `gorm:"type:varchar(64);not null"`
	AvatarUrl  string `gorm:"type:varchar(64);not null"`
	PublicKey  string `gorm:"type:text;not null"`
	PrivateIV  string `gorm:"type:text;not null"`
	PrivateKey string `gorm:"type:text;not null"`
}

type Friend struct {
	UserUUID   string `gorm:"type:varchar(36);primaryKey"`
	FriendUUID string `gorm:"type:varchar(36);primaryKey"`
	ChainIV    string `gorm:"type:text"`
	ChainKey   string `gorm:"type:longtext"`
}

type Message struct {
	ID          uint   `gorm:"primaryKey"`
	Type        string `gorm:"type:varchar(36)"`
	Sender      string `gorm:"type:varchar(36);index"`
	Receiver    string `gorm:"type:varchar(36);index"`
	Data        string `gorm:"type:longtext"`
	IsDelivered bool   `gorm:"type:bool"`
	Timestamp   int64  `gorm:"autoCreateTime:milli"`
}

var MDB *gorm.DB

func init() {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local", config.DB_USER, config.DB_SECRET, config.DB_HOST, config.DB_PORT, config.DB_DATABASE)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("connect mysql error: %s\n", err.Error())
	}

	if err = db.AutoMigrate(&User{}, &Friend{}, &Message{}); err != nil {
		log.Fatalf("create mysql tables error: %s\n", err.Error())
	}

	MDB = db
}
