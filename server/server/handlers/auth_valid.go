package handlers

import (
	"net/http"
	"time"

	"double-ratchet-server/database"
	"double-ratchet-server/utils"

	"github.com/gin-gonic/gin"
)

type AuthValidRequest struct {
	UUID          string `json:"uuid" binding:"required"`
	Username      string `json:"username" binding:"required"`
	Authorization string `json:"authorization" binding:"required"`
}

type AuthValidResponse struct {
	Code    uint   `json:"code"`
	Message string `json:"message"`
}

func HandleAuthValid(ctx *gin.Context) {
	var req AuthValidRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, AuthValidResponse{
			Code:    http.StatusBadRequest,
			Message: "illegal form data",
		})
		return
	}

	claims, err := utils.ParseJWT(req.Authorization)
	if err != nil || claims.Username != req.Username || claims.UUID != req.UUID {
		ctx.JSON(http.StatusUnauthorized, AuthValidResponse{
			Code:    http.StatusUnauthorized,
			Message: "invalid authorization",
		})
		return
	}

	var user database.User
	if err := database.MDB.Where("username = ? AND uuid = ?", req.Username, req.UUID).First(&user).Error; err != nil {
		ctx.JSON(http.StatusUnauthorized, AuthValidResponse{
			Code:    http.StatusUnauthorized,
			Message: "user not found",
		})
		return
	}

	if claims.ExpiresAt.Unix() < time.Now().Unix() {
		ctx.JSON(http.StatusUnauthorized, AuthValidResponse{
			Code:    http.StatusUnauthorized,
			Message: "expired authorization",
		})
		return
	}

	ctx.JSON(http.StatusOK, AuthValidResponse{
		Code:    http.StatusOK,
		Message: "authorization check successfully",
	})
}
