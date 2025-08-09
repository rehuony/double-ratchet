package handlers

import (
	"net/http"

	"double-ratchet-server/database"
	"double-ratchet-server/utils"

	"github.com/gin-gonic/gin"
)

type AuthLoginRequest struct {
	Remember bool   `json:"remember"`
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthLoginData struct {
	UUID          string `json:"uuid"`
	Username      string `json:"username"`
	AvatarUrl     string `json:"avatar_url"`
	PublicKey     string `json:"public_key"`
	PrivateIV     string `json:"private_iv"`
	PrivateKey    string `json:"private_key"`
	Authorization string `json:"authorization"`
}

type AuthLoginResponse struct {
	Code    uint          `json:"code"`
	Message string        `json:"message"`
	Data    AuthLoginData `json:"data"`
}

func HandleAuthLogin(ctx *gin.Context) {
	var req AuthLoginRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, AuthLoginResponse{
			Code:    http.StatusBadRequest,
			Message: "illegal form data",
		})
		return
	}

	var user database.User
	if err := database.MDB.Where("username = ? AND password = ?", req.Username, req.Password).First(&user).Error; err != nil {
		ctx.JSON(http.StatusUnauthorized, AuthLoginResponse{
			Code:    http.StatusUnauthorized,
			Message: "incorrect username or password",
		})
		return
	}

	authorization, err := utils.GenerateJWT(user.UUID, user.Username, req.Remember)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, AuthLoginResponse{
			Code:    http.StatusInternalServerError,
			Message: "failed to generate authorization",
		})
		return
	}

	ctx.JSON(http.StatusOK, AuthLoginResponse{
		Code:    http.StatusOK,
		Message: "login successfully",
		Data: AuthLoginData{
			UUID:          user.UUID,
			Username:      user.Username,
			AvatarUrl:     user.AvatarUrl,
			PublicKey:     user.PublicKey,
			PrivateIV:     user.PrivateIV,
			PrivateKey:    user.PrivateKey,
			Authorization: authorization,
		},
	})
}
