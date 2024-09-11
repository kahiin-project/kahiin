from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import json
import sys

# Passcode for authentication (hardcoded for now)
passcode = 'a'

# Load configuration from a JSON file
with open('config.json') as config_file:
    config = json.load(config_file)

# Initialize Flask application and SocketIO
app = Flask(__name__)
socketio = SocketIO(app)

# Set static and template folders
app.static_folder = 'web/static'
app.template_folder = 'web/templates'

# List to keep track of connected clients
clients = []

class Client:
    """Class representing a connected client."""
    
    def __init__(self, sid: str, username: str) -> None:
        """
        Initialize a new Client instance.

        :param sid: Session ID of the client
        :param username: Username of the client
        """
        self.sid = sid
        self.username = username
        clients.append(self)

    def __del__(self):
        """Remove the client from the list upon deletion."""
        clients.remove(self)

# List to keep track of display connections
display_list = []

class Display:
    """Class representing a display connection."""
    
    def __init__(self, sid: str, code: str) -> None:
        """
        Initialize a new Display instance.

        :param sid: Session ID of the display
        :param code: Passcode used for the display connection
        """
        self.sid = sid
        self.code = code
        display_list.append(self)
    
    def __del__(self):
        """Remove the display from the list upon deletion."""
        display_list.remove(self)

@app.route('/admin')
def route_admin() -> str:
    """Render the admin page."""
    return render_template('admin.html')

@socketio.on('message')
def handle_message(message: str) -> None:
    """Handle incoming messages and emit them back to the client."""
    emit('message', message)

@app.route('/homepage')
def route_homepage() -> str:
    """Render the homepage."""
    return render_template('homepage.html')

@app.route('/display')
def route_display_page() -> str:
    """Render the display page."""
    return render_template('display-page.html')

@socketio.on('displayConnect')
def handle_display_connect(code: str) -> None:
    """
    Handle display connection requests.

    :param code: Passcode provided by the display
    """
    if code == passcode:
        session = Display(request.sid, code)
        # Notify all clients about the new display connection
        for c in clients:
            emit('newUser', {'username': c.username, 'sid': c.sid})
    else:
        emit('error', "Vous n'avez pas entré le bon passcode")

@socketio.on('addUser')
def handle_connect(username: str) -> None:
    """
    Handle new user connection requests.

    :param username: Username provided by the new user
    """
    sessid = request.sid
    # Check if the username is already taken
    if any(c.username == username for c in clients):
        emit('error', 'Nom d\'utilisateur déjà pris')
        return
    elif any(c.sid == sessid for c in clients):
        emit('error', 'Vous êtes déjà connecté')
        return
    
    # Create a new client session
    session = Client(sessid, username)
    emit('newUser', {'username': session.username, 'id': session.sid}, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect() -> None:
    """Handle client disconnection events."""
    sessid = request.sid
    for c in clients:
        if c.sid == sessid:
            # Notify displays about the user disconnection
            for d in display_list:
                emit('rmUser', {'username': c.username, 'passcode': passcode}, to=d.sid)
            del(c)  # Remove the client
            return

    # Remove display if it is disconnected
    for d in display_list:
        if d.sid == sessid:
            del(d)

@socketio.on('edit')
def handle_edit(message: dict) -> None:
    """
    Handle configuration edit requests.

    :param message: Dictionary containing the key, value, and passcode
    """
    if message['passcode'] == passcode:
        config[message['key']] = message['value']
        # Save updated configuration to the JSON file
        with open('config.json', 'w') as config_file:
            json.dump(config, config_file)
        emit('edit', message)
    else:
        emit('error', 'Invalid passcode')

@app.route('/')
def route_landing_page() -> str:
    """Render the landing page."""
    return render_template('landing-page.html')

if __name__ == '__main__':
    # Run the Flask application with SocketIO
    socketio.run(app, debug=True, port=8080, host="0.0.0.0")
