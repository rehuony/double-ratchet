package handlers

import (
	"crypto/ecdsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"math/big"
	"net/http"
	"strconv"
	"time"

	"double-ratchet-server/database"

	"github.com/gin-gonic/gin"
)

type AuthForgotRequest struct {
	Username   string `json:"username" binding:"required"`
	Password   string `json:"password" binding:"required"`
	SignInfo   string `json:"signinfo" binding:"required"`
	Timestamp  string `json:"timestamp" binding:"required"`
	PrivateIV  string `json:"private_iv" binding:"required"`
	PrivateKey string `json:"private_key" binding:"required"`
}

type AuthForgotResponse struct {
	Code    uint   `json:"code"`
	Message string `json:"message"`
}

func HandleAuthForgot(ctx *gin.Context) {
	var req AuthForgotRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, AuthForgotResponse{
			Code:    http.StatusBadRequest,
			Message: "illegal form data",
		})
		return
	}

	clientTime, err := strconv.ParseInt(req.Timestamp, 10, 64)
	if err != nil || time.Now().UnixMilli()-clientTime > 60*1000 {
		ctx.JSON(http.StatusUnauthorized, AuthForgotResponse{
			Code:    http.StatusUnauthorized,
			Message: "timestamp expires",
		})
		return
	}

	var user database.User
	if err := database.MDB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		ctx.JSON(http.StatusNotFound, AuthForgotResponse{
			Code:    http.StatusNotFound,
			Message: "user not exist",
		})
		return
	}

	pubBytes, err := base64.StdEncoding.DecodeString(user.PublicKey)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, AuthForgotResponse{
			Code:    http.StatusInternalServerError,
			Message: "incorrect encoding method for pubkey",
		})
		return
	}

	block, _ := pem.Decode(pubBytes)
	if block == nil || block.Type != "PUBLIC KEY" {
		ctx.JSON(http.StatusInternalServerError, AuthForgotResponse{
			Code:    http.StatusInternalServerError,
			Message: "invalid stored pubkey format",
		})
		return
	}

	pubKeyInterface, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, AuthForgotResponse{
			Code:    http.StatusInternalServerError,
			Message: "failed to parse stored pubkey",
		})
		return
	}

	pubKey, ok := pubKeyInterface.(*ecdsa.PublicKey)
	if !ok || pubKey.Curve.Params().Name != "P-521" {
		ctx.JSON(http.StatusInternalServerError, AuthForgotResponse{
			Code:    http.StatusInternalServerError,
			Message: "stored pubkey is not a valid ECDSA P-521 key",
		})
		return
	}

	hash := sha256.Sum256([]byte(req.Username + ":" + req.Timestamp))

	sigBytes, err := base64.StdEncoding.DecodeString(req.SignInfo)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, AuthForgotResponse{
			Code:    http.StatusBadRequest,
			Message: "incorrect encoding method for signature",
		})
		return
	}

	half := len(sigBytes) / 2
	rInt := new(big.Int).SetBytes(sigBytes[:half])
	sInt := new(big.Int).SetBytes(sigBytes[half:])

	if !ecdsa.Verify(pubKey, hash[:], rInt, sInt) {
		ctx.JSON(http.StatusUnauthorized, AuthForgotResponse{
			Code:    http.StatusUnauthorized,
			Message: "invalid private key file",
		})
		return
	}

	err = database.MDB.Model(&user).Updates(map[string]any{
		"password":    req.Password,
		"private_iv":  req.PrivateIV,
		"private_key": req.PrivateKey,
	}).Error

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, AuthForgotResponse{
			Code:    http.StatusInternalServerError,
			Message: "update user record failed",
		})
		return
	}

	ctx.JSON(http.StatusOK, AuthForgotResponse{
		Code:    http.StatusOK,
		Message: "update password success",
	})
}
