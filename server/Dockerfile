# 构建阶段
FROM golang:1.24-alpine AS builder

WORKDIR /usr/src/app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -v -o double-ratchet-server ./

# 运行阶段
FROM alpine:latest

WORKDIR /app

COPY --from=builder /usr/src/app/double-ratchet-server .

EXPOSE 8080

ENTRYPOINT ["./double-ratchet-server"]