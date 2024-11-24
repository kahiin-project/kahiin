// socket.js
class WebSocketHandler {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.eventHandlers = new Map();
        this.heartbeatInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.connect();
    }

    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('Connected to WebSocket server');
            this.reconnectAttempts = 0;
            this.startHeartbeat();
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.event === 'pong') {
                return; 
            }
            const { event: eventName, data } = message;
            const handlers = this.eventHandlers.get(eventName);
            if (handlers) {
                handlers.forEach(handler => handler(data));
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
            this.stopHeartbeat();
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
            this.stopHeartbeat();
            this.reconnect();
        };
    }

    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        setTimeout(() => this.connect(), delay);
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.emit('ping', {});
            }
        }, 5000);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    on(eventName, handler) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, new Set());
        }
        this.eventHandlers.get(eventName).add(handler);
    }

    emit(event, data) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ event, data }));
        } else {
            console.warn('WebSocket not connected, message queued');
            setTimeout(() => this.emit(event, data), 1000);
        }
    }
}
