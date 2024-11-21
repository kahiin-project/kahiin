import asyncio
import json
import websockets
from dataclasses import dataclass, field
from typing import Dict, Set, Callable, Any, Optional, Coroutine
from collections import defaultdict
from flask import Flask
import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from websockets.server import WebSocketServerProtocol

flask_app = Flask(__name__)

@dataclass
class Room:
    name: str
    clients: Set[websockets.WebSocketServerProtocol] = field(default_factory=set)

class WebSocketManager:
    def __init__(self, flask_app: Optional[Flask] = None):
        self.event_handlers: Dict[str, Callable] = {}
        self.clients: Set[WebSocketServerProtocol] = set()
        self.background_coroutines: Set[Coroutine] = set()
        self.rooms: Dict[str, Room] = defaultdict(lambda: Room(name="default"))
        
        self.flask_app = flask_app
        
        self.executor = ThreadPoolExecutor(max_workers=10)
    
    
    def on(self, event_name: str):
        """Décorateur pour enregistrer les gestionnaires d'événements"""
        def decorator(func):
            async def wrapper(*args, **kwargs):
                return await func(*args, **kwargs)
            self.event_handlers[event_name] = wrapper
            return wrapper
        return decorator

    async def emit(self, event: str, data: Any = {}, room: Optional[str] = None, to: Optional[str] = None):
        """Émet un événement aux clients spécifiés"""
        message = json.dumps({
            'event': event,
            'data': data
        })

        target_clients = []
        
        if room:
            # Émettre aux clients de la room spécifiée
            target_clients = list(self.rooms[room].clients)
        else:
            # Émettre uniquement au client WebSocket actuel
            target_clients = [to] if to else []

        print(f"Emitting event '{event}' to {len(target_clients)} clients")

        for client in target_clients:
            if not client.closed:
                try:
                    await client.send(message)
                    logging.info(f"Message sent to client: {client.remote_address}")
                except websockets.exceptions.ConnectionClosed:
                    logging.warning(f"Connection closed for client: {client.remote_address}")
                    await self.handle_disconnect(client)
                except Exception as e:
                    logging.error(f"Error sending message to client: {e}")
                    await self.handle_disconnect(client)
                    
    async def handle_disconnect(self, websocket: WebSocketServerProtocol):
        """Gère la déconnexion d'un client"""
        logging.info(f"Client disconnected: {websocket.remote_address}")
        self.clients.discard(websocket)
        for room in self.rooms.values():
            room.clients.discard(websocket)
        if 'disconnect' in self.event_handlers:
            await self.event_handlers['disconnect'](websocket)

    async def handle_client(self, websocket: WebSocketServerProtocol, path: str = None):
        try:
            self.clients.add(websocket)
            last_ping = time.time()
            
            if 'connect' in self.event_handlers:
                await self.event_handlers['connect'](websocket)

            async for message in websocket:
                try:
                    data = json.loads(message)
                    event = data.get('event')
                    
                    # Gestion du heartbeat
                    if event == 'ping':
                        last_ping = time.time()
                        await websocket.send(json.dumps({'event': 'pong'}))
                        continue

                    payload = data.get('data')
                    if event in self.event_handlers:
                        await self.event_handlers[event](websocket, payload)

                except json.JSONDecodeError:
                    logging.error(f"Invalid JSON received: {message}")
                    
                if time.time() - last_ping > 5:
                    # Send disconnect event to server
                    await self.handle_disconnect(websocket)
                    raise websockets.exceptions.ConnectionClosed(1000, "Heartbeat timeout")
                    
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
            for coro in list(self.background_coroutines):
                try:
                    await coro
                except Exception as e:
                    logging.error(f"Error in background task: {e}")
            await asyncio.sleep(0.1)
    
    def run_flask(self):
        """Démarre Flask dans un thread séparé"""
        self.flask_app.run(host='0.0.0.0', port=8080, debug=False, threaded=True)
    
    async def start(self, host: str = '0.0.0.0', ws_port: int = 8000):
        """Démarre le serveur WebSocket et Flask"""
        ws_server = await websockets.server.serve(
            self.handle_client,
            host=host,
            port=ws_port,
            ping_interval=20,
            ping_timeout=60
        )
        
        # Création des tâches de fond
        background_task = asyncio.create_task(self.run_background_tasks())
        
        print(f"WebSocket server started on {host}:{ws_port}")
        print(f"Flask server starting on {host}:8080")
        
        # Démarrage des serveurs
        try:
            flask_thread = threading.Thread(target=self.run_flask)
            flask_thread.start()
            await asyncio.gather(
                background_task,
                asyncio.Future()  # Maintient le serveur en vie
            )
        finally:
            ws_server.close()
            await ws_server.wait_closed()

    

app = flask_app
ws_manager = WebSocketManager(flask_app)
