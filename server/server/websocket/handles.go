package websocket

import (
	"encoding/json"
	"log"

	"double-ratchet-server/database"

	"github.com/gorilla/websocket"
)

type WSUserListItem struct {
	UUID      string `json:"uuid"`
	Username  string `json:"username"`
	AvatarUrl string `json:"avatar_url"`
	PublicKey string `json:"public_key"`
}

func pushUserList(uuid string) {
	var users []database.User
	if err := database.MDB.Find(&users).Error; err != nil {
		log.Println("failed to fetch user list:", err)
		return
	}

	userlist := []WSUserListItem{}
	for _, user := range users {
		userlist = append(userlist, WSUserListItem{
			UUID:      user.UUID,
			Username:  user.Username,
			AvatarUrl: user.AvatarUrl,
			PublicKey: user.PublicKey,
		})
	}

	content, err := json.Marshal(userlist)
	if err != nil {
		log.Println("json marshal error:", err)
		return
	}

	result := WSFrame{
		ID:       0,
		Type:     WSTypeUpdateUserlist,
		Sender:   uuid,
		Receiver: uuid,
		Data:     string(content),
	}

	data, err := json.Marshal(result)
	if err != nil {
		log.Println("json marshal error:", err)
		return
	}

	if receiver, exist := GetClient(uuid); exist {
		if err := SafeWrite(receiver, websocket.TextMessage, data); err != nil {
			log.Printf("failed to send undelivered message to %s: %v", uuid, err)
		}
	} else {
		log.Printf("user %s disconnected before delivery", uuid)
		return
	}
}

type WSMessage struct {
	Type     string `json:"type"`
	Data     string `json:"data"`
	Sender   string `json:"sender"`
	Receiver string `json:"receiver"`
}

type WSFriendListItem struct {
	UUID      string      `json:"uuid"`
	Username  string      `json:"username"`
	AvatarUrl string      `json:"avatar_url"`
	PublicKey string      `json:"public_key"`
	ChainIV   string      `json:"chain_iv"`
	ChainKey  string      `json:"chain_key"`
	Messages  []WSMessage `json:"messages"`
}

func pushFriendList(uuid string) {
	var friends []database.Friend
	if err := database.MDB.Where("user_uuid = ?", uuid).Find(&friends).Error; err != nil {
		log.Println("failed to fetch friend list:", err)
		return
	}

	friendList := []WSFriendListItem{}
	for _, friend := range friends {
		var friendUser database.User
		if err := database.MDB.Where("uuid = ?", friend.FriendUUID).First(&friendUser).Error; err != nil {
			log.Printf("failed to fetch user info for friend %s: %v", friend.FriendUUID, err)
			continue
		}

		var messages []database.Message
		if err := database.MDB.
			Where("is_delivered = ? AND ((sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)) AND type IN ?",
				true, uuid, friend.FriendUUID, friend.FriendUUID, uuid,
				[]string{WSTypeTextMessage},
			).
			Order("timestamp desc").
			Limit(10).
			Find(&messages).Error; err != nil {
			log.Printf("failed to fetch messages for friend %s: %v", friend.FriendUUID, err)
		}

		messageList := []WSMessage{}
		for _, msg := range messages {
			messageList = append(messageList, WSMessage{
				Type:     msg.Type,
				Data:     msg.Data,
				Sender:   msg.Sender,
				Receiver: msg.Receiver,
			})
		}

		friendList = append(friendList, WSFriendListItem{
			UUID:      friendUser.UUID,
			Username:  friendUser.Username,
			AvatarUrl: friendUser.AvatarUrl,
			PublicKey: friendUser.PublicKey,
			ChainIV:   friend.ChainIV,
			ChainKey:  friend.ChainKey,
			Messages:  messageList,
		})
	}

	content, err := json.Marshal(friendList)
	if err != nil {
		log.Println("json marshal error:", err)
		return
	}

	result := WSFrame{
		ID:       0,
		Type:     WSTypeUpdateFriendlist,
		Sender:   uuid,
		Receiver: uuid,
		Data:     string(content),
	}

	data, err := json.Marshal(result)
	if err != nil {
		log.Println("json marshal error:", err)
		return
	}

	if receiver, exist := GetClient(uuid); exist {
		if err := SafeWrite(receiver, websocket.TextMessage, data); err != nil {
			log.Println("failed to forward friend_add:", err)
		}
	} else {
		log.Printf("user %s disconnected before delivery", uuid)
		return
	}
}

func pushUndeliveredMessages(uuid string) {
	var messages []database.Message

	if err := database.MDB.
		Where("receiver = ? AND is_delivered = ?", uuid, false).
		Order("timestamp ASC").
		Find(&messages).Error; err != nil {
		log.Println("failed to fetch undelivered messages:", err)
		return
	}

	for _, msg := range messages {
		data, err := json.Marshal(WSFrame{
			ID:       msg.ID,
			Type:     msg.Type,
			Sender:   msg.Sender,
			Receiver: msg.Receiver,
			Data:     msg.Data,
		})
		if err != nil {
			log.Println("failed to marshal undelivered message:", err)
			continue
		}

		if receiver, exist := GetClient(uuid); exist {
			if err := SafeWrite(receiver, websocket.TextMessage, data); err != nil {
				log.Printf("failed to send undelivered message to %s: %v", uuid, err)
			}
		} else {
			log.Printf("user %s disconnected before delivery", uuid)
			return
		}
	}
}

type WSTextData struct {
	Content   string `json:"content"`
	ContentIV string `json:"content_iv"`
	XRatchet  int64  `json:"x_ratchet"`
	YRatchet  int64  `json:"y_ratchet"`
	Timestamp int64  `json:"timestamp"`
}

func handleTextMessage(frame WSFrame) {
	var content WSTextData
	if err := json.Unmarshal([]byte(frame.Data), &content); err != nil {
		log.Println("invalid message struct: ", err)
		return
	}

	newMsg := database.Message{
		Type:        frame.Type,
		Sender:      frame.Sender,
		Receiver:    frame.Receiver,
		Data:        frame.Data,
		IsDelivered: false,
		Timestamp:   content.Timestamp,
	}

	if err := database.MDB.Create(&newMsg).Error; err != nil {
		log.Println("failed to store message:", err)
		return
	}

	frame.ID = newMsg.ID

	updatedRaw, err := json.Marshal(frame)
	if err != nil {
		log.Println("failed to marshal updated message:", err)
		return
	}

	if receiver, exist := GetClient(frame.Receiver); exist {
		if err := SafeWrite(receiver, websocket.TextMessage, updatedRaw); err != nil {
			log.Println("failed to deliver text message:", err)
		}
	}
}

func handleEventConfirm(frame WSFrame) {
	if frame.ID == 0 {
		return
	}
	if err := database.MDB.Model(&database.Message{}).
		Where("id = ?", frame.ID).
		Update("is_delivered", true).Error; err != nil {
		log.Println("failed to update message read status:", err)
	}
}

func handleEventAddFriend(frame WSFrame) {
	var existing database.Message
	if err := database.MDB.
		Where("sender = ? AND receiver = ? AND type = ? AND is_delivered = ?", frame.Sender, frame.Receiver, frame.Type, false).
		First(&existing).Error; err == nil {
		log.Printf("duplicate request for add friend from %s to %s", frame.Sender, frame.Receiver)
		return
	}

	newMsg := database.Message{
		Type:        frame.Type,
		Sender:      frame.Sender,
		Receiver:    frame.Receiver,
		Data:        frame.Data,
		IsDelivered: false,
	}

	if err := database.MDB.Create(&newMsg).Error; err != nil {
		log.Println("failed to store add friend request: ", err)
		return
	}

	frame.ID = newMsg.ID

	updatedRaw, err := json.Marshal(frame)
	if err != nil {
		log.Println("failed to marshal updated add friend request: ", err)
		return
	}

	if receiver, exist := GetClient(frame.Receiver); exist {
		if err := SafeWrite(receiver, websocket.TextMessage, updatedRaw); err != nil {
			log.Println("failed to forward add friend request: ", err)
		}
	}
}

func handleEventDenyFriend(frame WSFrame) {
	if err := database.MDB.Model(&database.Message{}).
		Where("sender = ? AND receiver = ? AND type = ? AND is_delivered = ?", frame.Receiver, frame.Sender, WSTypeEventAddFriend, false).
		Update("is_delivered", true).Error; err != nil {
		log.Println("failed to update friend_add as delivered:", err)
	}

	denyMsg := database.Message{
		Type:        frame.Type,
		Sender:      frame.Sender,
		Receiver:    frame.Receiver,
		Data:        frame.Data,
		IsDelivered: false,
	}
	if err := database.MDB.Create(&denyMsg).Error; err != nil {
		log.Println("failed to store deny friend request: ", err)
		return
	}

	frame.ID = denyMsg.ID

	updatedRaw, err := json.Marshal(frame)
	if err != nil {
		log.Println("failed to marshal updated deny friend request: ", err)
		return
	}

	if receiver, exist := GetClient(frame.Receiver); exist {
		if err := SafeWrite(receiver, websocket.TextMessage, updatedRaw); err != nil {
			log.Println("failed to notify denial: ", err)
		}
	}
}

func handleEventAllowFriend(frame WSFrame) {
	if err := database.MDB.Model(&database.Message{}).
		Where("sender = ? AND receiver = ? AND type = ? AND is_delivered = ?", frame.Receiver, frame.Sender, WSTypeEventAddFriend, false).
		Update("is_delivered", true).Error; err != nil {
		log.Println("failed to update add friend request delivery status:", err)
	}

	friendItem1 := database.Friend{UserUUID: frame.Receiver, FriendUUID: frame.Sender}
	friendItem2 := database.Friend{UserUUID: frame.Sender, FriendUUID: frame.Receiver}

	if err := database.MDB.Create(&friendItem2).Error; err != nil {
		log.Printf("failed to add friend for %v: %v\n", frame.Sender, err.Error())
	}
	if err := database.MDB.Create(&friendItem1).Error; err != nil {
		log.Printf("failed to add friend for %v: %v\n", frame.Receiver, err.Error())
	}

	allowMsg := database.Message{
		Type:        frame.Type,
		Sender:      frame.Sender,
		Receiver:    frame.Receiver,
		Data:        frame.Data,
		IsDelivered: false,
	}
	if err := database.MDB.Create(&allowMsg).Error; err != nil {
		log.Println("failed to store allow friend request: ", err)
		return
	}

	frame.ID = allowMsg.ID

	updatedRaw, err := json.Marshal(frame)
	if err != nil {
		log.Println("failed to marshal updated allow friend request: ", err)
		return
	}

	if receiver, exist := GetClient(frame.Receiver); exist {
		if err := SafeWrite(receiver, websocket.TextMessage, updatedRaw); err != nil {
			log.Println("failed to notify acceptance: ", err)
		}
	}
}

type WSChangeKeyChainData struct {
	ChainIV  string `json:"chain_iv"`
	ChainKey string `json:"chain_key"`
}

func handleChangeKeychain(frame WSFrame) {
	var content WSChangeKeyChainData
	if err := json.Unmarshal([]byte(frame.Data), &content); err != nil {
		log.Println("invalid message struct: ", err)
		return
	}

	if err := database.MDB.Model(&database.Friend{}).
		Where("user_uuid = ? AND friend_uuid = ?", frame.Sender, frame.Receiver).
		Updates(map[string]any{
			"chain_iv":  content.ChainIV,
			"chain_key": content.ChainKey,
		}).Error; err != nil {
		log.Println("failed to update key chain: ", err)
	}
}

func handleChangePublickey(frame WSFrame) {
	newMsg := database.Message{
		Type:        frame.Type,
		Sender:      frame.Sender,
		Receiver:    frame.Receiver,
		Data:        frame.Data,
		IsDelivered: false,
	}

	if err := database.MDB.Create(&newMsg).Error; err != nil {
		log.Println("failed to store message:", err)
		return
	}

	frame.ID = newMsg.ID

	updatedRaw, err := json.Marshal(frame)
	if err != nil {
		log.Println("failed to marshal updated message:", err)
		return
	}

	if receiver, exist := GetClient(frame.Receiver); exist {
		if err := SafeWrite(receiver, websocket.TextMessage, updatedRaw); err != nil {
			log.Println("failed to deliver text message:", err)
		}
	}
}
