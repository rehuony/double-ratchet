package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"double-ratchet-server/server"
)

func startServiceServer() {
	log.Println("Service server is running...")

	if err := server.ServiceServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Printf("Start Service Server Error: %s\n", err)
	}
}

func stopServiceServer() {
	log.Println("Service server is stopping...")

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	if err := server.ServiceServer.Shutdown(ctx); err != nil {
		log.Printf("Stop Service Server Error: %s\n", err)
	}
}

func main() {
	defer stopServiceServer()
	startServiceServer()
}
