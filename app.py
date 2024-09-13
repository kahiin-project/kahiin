from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import json
import time
import asyncio
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


class GameTab:
    """Class representing a connected client."""

    def __init__(self, sid: str, username: str, connections: list) -> None:
        """
        Initialize a new Gametab instance.

        :param sid: Session ID of the client
        :param username: Username of the client
        """
        self.sid = sid
        self.username = username
        self.connections = connections
        self.connections.append(self)

    def __del__(self):
        """Remove the client from the list upon deletion."""
        self.connections.remove(self)


# List to keep track of client connections
clients = []


class Client(GameTab):
    def __init__(self, sid: str, username: str, connections: list) -> None:
        super().__init__(sid, username, connections)
        self.score = 0
        self.timeBegin = 0
        self.timeEnd = 0
        self.responseTime = 0

        self.userAnswer = ""
        self.expectedReponse = ""

    def EvalScore(self) -> None:
        self.responseTime = self.timeBegin - self.timeEnd
        if self.userAnswer == self.expectedReponse:
            # Magic calculation for a score up to 500
            # TODO
            ...

# List to keep track of board connections


board_list = []


class Board(GameTab):
    def __init__(self, sid: str, username: str, connections: list) -> None:
        super().__init__(sid, username, connections)


host_list = []
# List to keep track of host connections


class Host(GameTab):
    def __init__(self, sid: str, username: str, connections: list) -> None:
        super().__init__(sid, username, connections)


@app.route('/host')
def route_host() -> str:
    """Render the host page."""
    return render_template('host-page.html')


@socketio.on('message')
def handle_message(message: str) -> None:
    """Handle incoming messages and emit them back to the client."""
    emit('message', message)


@app.route('/homepage')
def route_homepage() -> str:
    """Render the homepage."""
    return render_template('homepage.html')


@app.route('/board')
def route_board_page() -> str:
    """Render the board page."""
    return render_template('board-page.html')


@socketio.on('boardConnect')
def handle_board_connect(code: str) -> None:
    """
    Handle board connection requests.

    :param code: Passcode provided by the board
    """
    if code == passcode:
        session = Board(request.sid, code, board_list)
        # Notify all clients about the new board connection
        for c in clients:
            emit('newUser', {'username': c.username, 'sid': c.sid})
    else:
        emit('error', "Vous n'avez pas entré le bon passcode")


@socketio.on('hostConnect')
def handle_host_connect(code: str) -> None:
    if code == passcode:
        session = Host(request.sid, code, host_list)


@socketio.on('startSession')
def handle_start_game(code: str) -> None:
    if code == passcode:
        emit('startGame', broadcast=True)
        for question in config["questions"]:
            emit("questionStart", {"question": question, "question_number": config["questions"].index(
                question)}, broadcast=True)
            for client in clients:
                client.timeBegin = time.time()
                client.expectedResponse = question.answer
            asyncio.sleep(question.duration)
            emit("questionEnd")
            for client in clients:
                client.EvalScore()
            asyncio.sleep(3)

    else:
        emit('error', "Code incorrect")


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
    session = Client(sessid, username, clients)
    emit('newUser', {'username': session.username,
         'id': session.sid}, broadcast=True)


@socketio.on('disconnect')
def handle_disconnect() -> None:
    """Handle client disconnection events."""
    sessid = request.sid
    for client in clients:
        if client.sid == sessid:
            for d in board_list:
                emit('rmUser', {'username': client.username,
                     'passcode': passcode}, to=d.sid)
            del (c)  # Remove the client

    # Remove board if it is disconnected
    for d in board_list:
        if d.sid == sessid:
            del (d)


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


@socketio.on('sendAnswer')
def handle_answer(answer: str) -> None:
    sessid = request.sid
    for client in clients:
        if client.sid == sessid:
            client.timeEnd = time.time()
            client.userAnswer = answer


@app.route('/')
def route_landing_page() -> str:
    """Render the landing page."""
    return render_template('landing-page.html')


if __name__ == '__main__':
    # Run the Flask application with SocketIO
    socketio.run(app, debug=True, port=8080, host="0.0.0.0")
