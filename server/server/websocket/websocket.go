package websocket

import (
	"encoding/json"
	"log"
	"net/http"

	"double-ratchet-server/utils"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

const (
	WSTypeTextMessage      = "text"
	WSTypeEventConfirm     = "event_confirm"
	WSTypeEventAddFriend   = "event_addfriend"
	WSTypeEventDenyFriend  = "event_denyfriend"
	WSTypeEventAllowFriend = "event_allowfriend"
	WSTypeChangeKeychain   = "change_keychain"
	WSTypeChangePublickey  = "change_publickey"
	WSTypeUpdateUserlist   = "update_userlist"
	WSTypeUpdateFriendlist = "update_friendlist"
)

type WSFrame struct {
	ID       uint   `json:"id"`
	Type     string `json:"type"`
	Sender   string `json:"sender"`
	Receiver string `json:"receiver"`
	Data     string `json:"data"`
}

// NOTE: 配置允许进行 WebSocket 连接的域
// var allowedOrigins = map[string]bool{
// 	"http://localhost:8000": true,
// }

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// origin := r.Header.Get("Origin")

		// if allowedOrigins[origin] {
		// 	return true
		// }

		// log.Printf("[Blocked WebSocket connection]: %s\n", origin)
		// return false

		return true

	},
}

func HandleWebSocket(ctx *gin.Context) {
	token := ctx.Query("token")

	if !utils.ValidateJWT(token) {
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"message": "invalid or expired token",
		})
		return
	}

	claims, _ := utils.ParseJWT(token)

	conn, err := upgrader.Upgrade(ctx.Writer, ctx.Request, nil)
	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"message": "webSocket upgrade failed",
		})
		return
	}

	AddClient(claims.UUID, conn)
	defer RemoveClient(claims.UUID)

	// 建立连接后主动推送用户的信息
	go pushUserList(claims.UUID)
	go pushFriendList(claims.UUID)
	go pushUndeliveredMessages(claims.UUID)

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println("socket read error: ", err)
			break
		}

		var frame WSFrame
		if err := json.Unmarshal(message, &frame); err != nil {
			log.Println("invalid message struct: ", err)
			continue
		} else if frame.Sender != claims.UUID && frame.Receiver != claims.UUID {
			log.Printf("invalid message for [%s]\n", claims.UUID)
			continue
		}

		switch frame.Type {
		case WSTypeTextMessage:
			handleTextMessage(frame)
		case WSTypeEventConfirm:
			handleEventConfirm(frame)
		case WSTypeEventAddFriend:
			handleEventAddFriend(frame)
		case WSTypeEventDenyFriend:
			handleEventDenyFriend(frame)
		case WSTypeEventAllowFriend:
			handleEventAllowFriend(frame)
		case WSTypeChangeKeychain:
			handleChangeKeychain(frame)
		case WSTypeChangePublickey:
			handleChangePublickey(frame)
		case WSTypeUpdateUserlist:
			pushUserList(claims.UUID)
		case WSTypeUpdateFriendlist:
			pushFriendList(claims.UUID)
		default:
			log.Printf("[%s] - unknown message type: %s\n", frame.Sender, frame.Type)
		}
	}
}
