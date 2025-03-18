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
    """
    Class to manage WebSocket connections and events

    Attributes:
        event_handlers (Dict[str, Callable]): Registered event handlers
        clients (Set[WebSocketServerProtocol]): Connected WebSocket clients
        background_coroutines (Set[Coroutine]): Background coroutines to run
        rooms (Dict[str, Room]): Rooms to manage clients
        flask_app (Optional[Flask]): Flask app to run
        executor (ThreadPoolExecutor): Executor for running background tasks
    """
    def __init__(self, flask_app: Optional[Flask] = None):
        """
        Initialize the WebSocketManager
        
        Parameters:
            flask_app (Optional[Flask]): Flask app to run
        """
        self.event_handlers: Dict[str, Callable] = {}
        self.clients: Set[WebSocketServerProtocol] = set()
        self.background_coroutines: Set[Coroutine] = set()
        self.rooms: Dict[str, Room] = defaultdict(lambda: Room(name="default"))
        
        self.flask_app = flask_app
        
        self.executor = ThreadPoolExecutor(max_workers=10)
    
    
    def on(self, event_name: str):
        """Wrapper to register an event handler
        
        Parameters:
            event_name (str): Name of the event to handle"""
        def decorator(func):
            async def wrapper(*args, **kwargs):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    logging.error(f"Error in event handler '{event_name}': {e}")
            self.event_handlers[event_name] = wrapper
            return wrapper
        return decorator

    async def emit(self, event: str, data: Any = {}, room: Optional[str] = None, to = None):
        """Emit an event to the specified clients
        
        Parameters:
            event (str): Name of the event to emit
            data (Any): Data to send with the event
            room (Optional[str]): Name of the room to emit to
            to (Optional[WebSocketServerProtocol]): Specific client to emit to"""
        message = json.dumps({
            'event': event,
            'data': data
        })

        target_clients = []
        
        if room:
            target_clients = list(self.rooms[room].clients)
        else:
            target_clients = [to] if to else []

        if not event == 'ping':
            logging.info(f"Emitting event '{event}' to {len(target_clients)} clients")

        for client in target_clients:
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
        """
        Handle client disconnection
        
        Parameters:
            websocket (WebSocketServerProtocol): Client to disconnect"""
        logging.info(f"Client disconnected: {websocket.remote_address}")
        self.clients.discard(websocket)
        for room in self.rooms.values():
            room.clients.discard(websocket)
        if 'disconnect' in self.event_handlers:
            await self.event_handlers['disconnect'](websocket)

    async def handle_client(self, websocket: WebSocketServerProtocol, path: str = None):
        """Handle a new WebSocket client

        Parameters:
            websocket (WebSocketServerProtocol): Client WebSocket connection
            path (str): Path of the WebSocket connection
        """
        try:
            self.clients.add(websocket)
            last_ping = time.time()
            
            if 'connect' in self.event_handlers:
                await self.event_handlers['connect'](websocket)

            async for message in websocket:
                try:
                    data = json.loads(message)
                    event = data.get('event')
                    
                    # Heartbeat
                    if event == 'ping':
                        last_ping = time.time()
                        await websocket.send(json.dumps({'event': 'pong'}))
                        continue
                    else:
                        logging.info(f"Received event {event}")
                    payload = data.get('data')
                    if event in self.event_handlers:
                        await self.event_handlers[event](websocket, payload)

                except json.JSONDecodeError:
                    logging.error(f"Invalid JSON received: {message}")
                    
                if time.time() - last_ping > 15:
                    await self.handle_disconnect(websocket)
                    raise websockets.exceptions.ConnectionClosed(1000, "Heartbeat timeout")
                    
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.handle_disconnect(websocket)
        
    def add_background_task(self, coro: Coroutine):
        """
        Add a background coroutine to run
        
        Parameters:
            coro (Coroutine): Coroutine to run in the background
        """
        self.background_coroutines.add(coro)

    async def run_background_tasks(self):
        """Run background tasks in the event loop"""
        while True:
            for coro in list(self.background_coroutines):
                try:
                    await coro
                except Exception as e:
                    logging.error(f"Error in background task: {e}")
            await asyncio.sleep(0.1)
    
    def run_flask(self):
        """Start flask app in a separate thread"""
        self.flask_app.run(host='0.0.0.0', port=8080, debug=False, threaded=True)
    
    async def start(self, host: str = '0.0.0.0', ws_port: int = 8000):
        """Start the WebSocket server

        Parameters:
            host (str): Host to run the server on
            ws_port (int): Port to run the WebSocket server on
        """
        ws_server = await websockets.server.serve(
            self.handle_client,
            host=host,
            port=ws_port,
            ping_interval=20,
            ping_timeout=60
        )
        
        # Create a background task to run background coroutines
        background_task = asyncio.create_task(self.run_background_tasks())
        
        print(f"WebSocket server started on {host}:{ws_port}")
        print(f"Flask server starting on {host}:8080")
        
        # Start all the servers
        try:
            flask_thread = threading.Thread(target=self.run_flask)
            flask_thread.start()
            await asyncio.gather(
                background_task,
                asyncio.Future()  # Run forever
            )
        finally:
            ws_server.close()
            await ws_server.wait_closed()
    
    async def stop(self):
        """Stop the WebSocket server"""
        for client in self.clients:
            await client.close()
        self.clients.clear()
        self.background_coroutines.clear()

    

app = flask_app
ws_manager = WebSocketManager(flask_app)