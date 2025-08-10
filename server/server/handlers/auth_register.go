package handlers

import (
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"net/http"

	"double-ratchet-server/config"
	"double-ratchet-server/database"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuthRegisterRequest struct {
	Username   string `json:"username" binding:"required"`
	Password   string `json:"password" binding:"required"`
	PublicKey  string `json:"public_key" binding:"required"`
	PrivateIV  string `json:"private_iv" binding:"required"`
	PrivateKey string `json:"private_key" binding:"required"`
}

type AuthRegisterResponse struct {
	Code    uint   `json:"code"`
	Message string `json:"message"`
}

func HandleAuthRegister(ctx *gin.Context) {
	var req AuthRegisterRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, AuthRegisterResponse{
			Code:    http.StatusBadRequest,
			Message: "illegal form data",
		})
		return
	}

	var existingUser database.User
	if err := database.MDB.Where("username = ?", req.Username).First(&existingUser).Error; err == nil {
		ctx.JSON(http.StatusConflict, AuthRegisterResponse{
			Code:    http.StatusConflict,
			Message: "username already exists",
		})
		return
	} else if err != gorm.ErrRecordNotFound {
		ctx.JSON(http.StatusInternalServerError, AuthRegisterResponse{
			Code:    http.StatusInternalServerError,
			Message: "server database error",
		})
		return
	}

	pubBytes, err := base64.StdEncoding.DecodeString(req.PublicKey)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, AuthRegisterResponse{
			Code:    http.StatusBadRequest,
			Message: "incorrect encoding method",
		})
		return
	}

	block, _ := pem.Decode(pubBytes)
	if block == nil || block.Type != "PUBLIC KEY" {
		ctx.JSON(http.StatusBadRequest, AuthRegisterResponse{
			Code:    http.StatusBadRequest,
			Message: "invalid public key format",
		})
		return
	}

	_, err = x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, AuthRegisterResponse{
			Code:    http.StatusBadRequest,
			Message: "invalid public key format",
		})
		return
	}

	user := database.User{
		UUID:       uuid.NewString(),
		Username:   req.Username,
		Password:   req.Password,
		AvatarUrl:  fmt.Sprintf("%suploads/avatars/default.png", config.ROOT_PATH),
		PublicKey:  req.PublicKey,
		PrivateIV:  req.PrivateIV,
		PrivateKey: req.PrivateKey,
	}

	if err := database.MDB.Create(&user).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, AuthRegisterResponse{
			Code:    http.StatusInternalServerError,
			Message: "create user failed",
		})
		return
	}

	ctx.JSON(http.StatusOK, AuthRegisterResponse{
		Code:    http.StatusOK,
		Message: "user registration successfully",
	})
}
