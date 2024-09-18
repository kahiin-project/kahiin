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

    def __init__(self, sid: str, connections: list) -> None:
        """
        Initialize a new Gametab instance.

        :param sid: Session ID of the client
        :param username: Username of the client
        """
        self.sid = sid
        self.connections = connections
        self.connections.append(self)


# List to keep track of client connections
clients = []


class Client(GameTab):
    def __init__(self, sid: str, username: str, connections: list) -> None:
        super().__init__(sid, connections)
        self.username = username
        self.score = 0
        self.timeBegin = 0
        self.timeEnd = 0
        self.responseTime = 0

        self.userAnswer = ""
        self.expectedResponse = []
        self.questionType = ""

    def evalScore(self) -> None:
        self.responseTime = self.timeBegin - self.timeEnd
        match self.questionType:
            case "uniqueanswer":
                if type(self.userAnswer) != list:
                    # Bad answer syntax
                    # TODO
                    ...
                elif len(self.userAnswer) != 1:
                    # Bad answer syntax
                    # TODO
                    ...
                else:
                    if self.userAnswer in self.expectedResponse:
                        # Magic calculation for a score up to 500
                        # TODO
                        ...
            case "truefalse":
                if type(self.userAnswer) != list:
                    # Bad answer syntax
                    # TODO
                    ...
                elif len(self.userAnswer) != 1:
                    # Bad answer syntax
                    # TODO
                    ...
                else:
                    if self.userAnswer in self.expectedResponse:
                        # Magic calculation for a score up to 500
                        # TODO
                        ...
            case "mcq":
                # Magic calculation for a score up to 500
                # TODO
                ...
            case _:
                print("Unsupported question type")


# List to keep track of board connections
board_list = []


class Board(GameTab):
    def __init__(self, sid: str, connections: list) -> None:
        super().__init__(sid, connections)


host_list = []
# List to keep track of host connections


class Host(GameTab):
    def __init__(self, sid: str, connections: list) -> None:
        super().__init__(sid, connections)


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
    return render_template('home-page.html')


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
        session = Board(sid=request.sid, connections=board_list)
        # Notify all clients about the new board connection
        for c in clients:
            emit('newUser', {'username': c.username, 'sid': c.sid})
    else:
        emit('error', "Vous n'avez pas entré le bon passcode")


@socketio.on('hostConnect')
def handle_host_connect(code: str) -> None:
    if code == passcode:
        session = Host(sid=request.sid, connections=host_list)


@socketio.on('startSession')
def handle_start_game(code: str) -> None:
    if code == passcode:
        emit('startGame', broadcast=True)
    else:
        emit('error', "Code incorrect")


@socketio.on("nextQuestion")
def handle_next_question(res) -> None:
    code, questionNumber = res["passcode"], res["questionCount"]
    if code == passcode:
        question = config["questions"][questionNumber]
        data = {
            "question_title": question["title"],
            "question_type": question["type"],
            "question_onetry": question["onetry"],
            "question_duration": question["duration"],
            "question_number": config["questions"].index(question) + 1,
            "question_count": len(config["questions"]),
        }

        emit("questionStart", data, broadcast=True)
        for client in clients:
            client.timeBegin = time.time()
            client.expectedResponse = question["answer"]
            client.questionType = question["type"]
            client.oneTry = question["onetry"]

        # 2sec for progress bar to appear and first delay,
        # question["duration"] seconds for the game,
        time.sleep(2 + question["duration"])

        emit("questionEnd")
        for client in clients:
            client.evalScore()
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
    session = Client(sid=sessid, username=username, connections=clients)
    for board in board_list:
        emit('newUser', {'username': username, 'sid': sessid}, to=board.sid)


@socketio.on('disconnect')
def handle_disconnect() -> None:
    """Handle client disconnection events."""
    sessid = request.sid
    for client in clients:
        if client.sid == sessid:
            for board in board_list:
                emit('rmUser', {'username': client.username,
                     'passcode': passcode}, to=board.sid)

            clients.remove(client)  # Remove the client

    # Remove board if it is disconnected
    for board in board_list:
        if board.sid == sessid:
            board_list.remove(board)


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

    def setUserAnswer(self, answer) -> None:
        if self.userAnswer == "":
            self.userAnswer = answer


@app.route('/')
def route_landing_page() -> str:
    """Render the landing page."""
    return render_template('landing-page.html')


if __name__ == '__main__':
    # Run the Flask application with SocketIO
    socketio.run(app, debug=True, port=8080, host="0.0.0.0")
