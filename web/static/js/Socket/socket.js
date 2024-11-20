// Gestionnaire d'événements WebSocket
class WebSocketHandler {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.eventHandlers = new Map();
        this.connect();
    }

    connect() {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('Connected to WebSocket server');
            this.emit('connection', true);
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            const { event: eventName, data } = message;
            
            if (this.eventHandlers.has(eventName)) {
                this.eventHandlers.get(eventName).forEach(handler => handler(data));
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
            setTimeout(() => this.connect(), 8080);
        };
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
            console.error('WebSocket is not connected');
        }
    }
}

// Création de l'instance
const wsUrl = 'ws://' + window.location.hostname + ':8000';
const socket = new WebSocketHandler(wsUrl);

// Exemple d'utilisation
socket.on('ping', (res) => {
    console.log('pong');
});

socket.on('settings', (data) => {
    console.log('Received settings:', data);
});

socket.on('background_update', (data) => {
    console.log('Background update:', data);
});