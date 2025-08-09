package websocket

import (
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type Client struct {
	UUID    string
	Conn    *websocket.Conn
	ConnMux sync.Mutex
}

var Clients = make(map[string]*Client)
var ClientsMutex sync.RWMutex

func AddClient(uuid string, conn *websocket.Conn) {
	ClientsMutex.Lock()
	defer ClientsMutex.Unlock()
	Clients[uuid] = &Client{UUID: uuid, Conn: conn}

	log.Printf("Client [%s] is connected", uuid)
}

func RemoveClient(uuid string) {
	ClientsMutex.Lock()
	defer ClientsMutex.Unlock()
	if client, ok := Clients[uuid]; ok {
		client.Conn.Close()
		delete(Clients, uuid)
	}

	log.Printf("client [%s] is disconnected", uuid)
}

func GetClient(uuid string) (*Client, bool) {
	ClientsMutex.RLock()
	defer ClientsMutex.RUnlock()
	client, exist := Clients[uuid]
	return client, exist
}

func SafeWrite(client *Client, messageType int, data []byte) error {
	client.ConnMux.Lock()
	defer client.ConnMux.Unlock()
	return client.Conn.WriteMessage(messageType, data)
}
