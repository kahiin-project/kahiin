import asyncio
import json
import websockets
from dataclasses import dataclass, field
from typing import Dict, Set, Callable, Any, Optional, Coroutine
from collections import defaultdict
from flask import Flask
import time
from concurrent.futures import ThreadPoolExecutor
import logging

@dataclass
class Room:
    name: str
    clients: Set[websockets.WebSocketServerProtocol] = field(default_factory=set)

class WebSocketManager:
    def __init__(self, flask_app: Optional[Flask] = None):
        self.rooms: Dict[str, Room] = defaultdict(lambda: Room(name="default"))
        self.event_handlers: Dict[str, Callable] = {}
        self.background_tasks: Dict[str, asyncio.Task] = {}
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.background_coroutines: Set[Coroutine] = set()
        
        if flask_app is None:
            flask_app = Flask(__name__)
        
        @flask_app.route('/')
        def hello_world():
            return 'Hello, World!'
            
        self.flask_app = flask_app
        self.executor = ThreadPoolExecutor(max_workers=1)
        
    def on(self, event_name: str):
        """Décorateur pour enregistrer les gestionnaires d'événements"""
        def decorator(func):
            async def wrapper(*args, **kwargs):
                return await func(*args, **kwargs)
            self.event_handlers[event_name] = wrapper
            return wrapper
        return decorator

    async def emit(self, event: str, data: Any, room: Optional[str] = None, exclude: Optional[websockets.WebSocketServerProtocol] = None):
        """Émet un événement aux clients connectés"""
        message = json.dumps({
            'event': event,
            'data': data
        })
        
        if room:
            clients = self.rooms[room].clients
        else:
            clients = self.clients

        for client in clients:
            if client != exclude and client.open:
                try:
                    await client.send(message)
                except websockets.exceptions.ConnectionClosed:
                    await self.handle_disconnect(client)

    async def handle_disconnect(self, websocket: websockets.WebSocketServerProtocol):
        """Gère la déconnexion d'un client"""
        self.clients.remove(websocket)
        for room in self.rooms.values():
            room.clients.discard(websocket)

    async def handle_client(self, websocket: websockets.WebSocketServerProtocol, path: str):
        """Gère une nouvelle connexion client"""
        try:
            self.clients.add(websocket)
            
            if 'connect' in self.event_handlers:
                await self.event_handlers['connect'](websocket)
            
            async for message in websocket:
                try:
                    data = json.loads(message)
                    event = data.get('event')
                    payload = data.get('data')
                    
                    if event in self.event_handlers:
                        await self.event_handlers[event](websocket, payload)
                except json.JSONDecodeError:
                    logging.error(f"Invalid JSON received: {message}")
                    
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.handle_disconnect(websocket)

    def add_background_task(self, coro: Coroutine):
        """Ajoute une tâche de fond à exécuter"""
        self.background_coroutines.add(coro)

    async def run_background_tasks(self):
        """Exécute toutes les tâches de fond"""
        while True:
            for coro in self.background_coroutines:
                try:
                    await coro
                except Exception as e:
                    logging.error(f"Error in background task: {e}")
            await asyncio.sleep(0.1)
    
    def run_flask(self):
        """Démarre Flask dans un thread séparé"""
        self.flask_app.run(port=5000, debug=False)
    
    async def start(self, host: str = 'localhost', ws_port: int = 8000):
        """Démarre le serveur WebSocket et Flask"""
        self.executor.submit(self.run_flask)
        
        # Création des tâches de fond
        background_task = asyncio.create_task(self.run_background_tasks())
        
        # Démarrage du serveur WebSocket
        async with websockets.serve(self.handle_client, host, ws_port):
            await asyncio.gather(
                background_task,
                asyncio.Future()  # run forever
            )

# Exemple d'utilisation
def create_app():
    flask_app = Flask(__name__)
    ws_manager = WebSocketManager(flask_app)
    return flask_app, ws_manager

app, ws_manager = create_app()

@ws_manager.on('connect')
async def handle_connect(websocket):
    """Gestion de la connexion client"""
    data = {"setting1": "value1", "setting2": "value2"}
    await ws_manager.emit("settings", data)

@ws_manager.on('custom_event')
async def handle_custom_event(websocket, data):
    """Gestion d'un événement personnalisé"""
    print(f"Received custom event: {data}")
    await ws_manager.emit('response_event', {'status': 'success'})

async def background_task():
    """Tâche de fond exemple"""
    while True:
        try:
            await ws_manager.emit('background_update', {'timestamp': time.time()})
        except Exception as e:
            logging.error(f"Error in background task: {e}")
        await asyncio.sleep(5)

JAVASCRIPT_CLIENT = """
const ws = new WebSocket('ws://localhost:8000');

ws.onopen = () => {
    console.log('Connected to WebSocket server');
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Received:', message);
    
    // Gestion des événements
    switch(message.event) {
        case 'settings':
            console.log('Received settings:', message.data);
            break;
        case 'background_update':
            console.log('Background update:', message.data);
            break;
        default:
            console.log('Unknown event:', message.event);
    }
};

// Fonction pour émettre des événements
function emit(event, data) {
    ws.send(JSON.stringify({ event, data }));
}

// Exemple d'émission d'événement
// emit('custom_event', { message: 'Hello server!' });
"""

if __name__ == '__main__':
    # Ajout de la tâche de fond
    ws_manager.add_background_task(background_task())
    
    # Démarrage du serveur
    asyncio.run(ws_manager.start())