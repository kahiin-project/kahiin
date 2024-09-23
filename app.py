from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import json
import time
import sqlite3
import xml.etree.ElementTree as ET
# Passcode for authentication (hardcoded for now)
passcode = 'a'

# Load KHN (XML) file
tree = ET.parse('questionnaire.khn')
root = tree.getroot()

config = {"questions": []}
# Add each question to config
for question in root.findall('question'):
    title = question.find('title').text
    duration = question.find('duration').text
    question_type = question.find('type').text
    shown_answers = [answer.text for answer in question.find('shown_answers').findall('answer')]
    correct_answers = [answer.text for answer in question.find('correct_answers').findall('answer')]

    config["questions"] = {
        "title": title,
        "shown_answers": shown_answers,
        "correct_answers": correct_answers,
        "duration": duration,
        "type": question_type
    }


# Initialize Flask application and SocketIO
app = Flask(__name__)
socketio = SocketIO(app)

# Set static and template folders
app.static_folder = 'web/static'
app.template_folder = 'web/templates'

# List to keep track of connected client_list
gamerun = False


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
client_list = []


class Client(GameTab):
    def __init__(self, sid: str, username: str, connections: list) -> None:
        super().__init__(sid, connections)
        self.username = username
        self.score = 0
        self.time_begin = 0
        self.time_end = 0
        self.response_time = 0
        self.timer_time = 0

        self.user_answer = ""
        self.expected_response = []
        self.question_type = ""

    def evalScore(self) -> None:
        self.response_time = self.time_begin - self.time_end

        match self.question_type:
            case "uniqueanswer":
                if type(self.user_answer) != list:
                    self.score = 0
                else:
                    if self.user_answer == self.expected_response:
                        self.score = round(
                            (1 - self.response_time / self.timer_time) / 500)
            case "truefalse":
                if type(self.user_answer) != list or len(self.user_answer) != 1:
                    self.score = 0
                else:
                    if self.user_answer == self.expected_response:
                        self.score = round(
                            (1 - self.response_time / self.timer_time) / 500)
            case "mcq":
                if type(self.user_answer) != list:
                    self.score = 0
                else:
                    self.user_answer.sort()
                    self.expected_response.sort()
                    if self.user_answer == self.expected_response:
                        self.score = round(
                            (1 - self.response_time / self.timer_time) / 500)
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


class Game:
    def __init__(self) -> None:
        self.previous_leaderboard = {}
        self.current_leaderboard = {}
        self.promoted_users = {}

    def handleFirstLeaderboard(self):
        self.current_leaderboard = sorted(
            client_list, key=lambda x: x.score, reverse=True)

    def handlePromotedUsers(self):
        for user in self.current_leaderboard:
            if user in self.previous_leaderboard:
                place = self.previous_leaderboard.index(
                    user) - self.current_leaderboard.index(user)
                if place >= 2:
                    self.promoted_users[user] = place

    def handleNextLeaderboard(self):
        self.previous_leaderboard = self.current_leaderboard
        self.current_leaderboard = sorted(
            client_list, key=lambda x: x.score, reverse=True)
        self.handlePromotedUsers()

    def display(self):
        if not self.current_leaderboard:
            self.handleFirstLeaderboard()
        self.handleNextLeaderboard()
        leaderboard = {
            user.username: user.score for user in self.current_leaderboard}
        promoted_users = {user.username: place for user,
                          place in self.promoted_users.items()}
        return leaderboard[:5], promoted_users

    def reset(self):
        self.previous_leaderboard = {}
        self.current_leaderboard = {}
        self.promoted_users = {}


game = Game()


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
    if gamerun:
        emit('error', "La partie est déjà en cours")
        return
    if code == passcode:
        session = Board(sid=request.sid, connections=board_list)
        # Notify all client_list about the new board connection
        for c in client_list:
            emit('newUser', {'username': c.username, 'sid': c.sid})
    else:
        emit('error', "Vous n'avez pas entré le bon passcode")


@socketio.on('hostConnect')
def handle_host_connect(code: str) -> None:
    if gamerun:
        emit('error', "La partie est déjà en cours")
        return
    if code == passcode:
        session = Host(sid=request.sid, connections=host_list)
    else:
        emit('error', "Vous n'avez pas entré le bon passcode")


@socketio.on('startSession')
def handle_start_game(code: str) -> None:
    if gamerun:
        emit('error', "La partie est déjà en cours")
        return
    if code == passcode:
        for client in client_list + board_list + host_list:
            emit('startGame', to=client.sid)
    else:
        emit('error', "Code incorrect")


@socketio.on("nextQuestion")
def handle_next_question(res) -> None:
    code, question_number = res["passcode"], res["question_count"]
    if code == passcode:
        if question_number == len(config["questions"]):
            for client in client_list + board_list + host_list:
                for client in client_list:
                    client.evalScore()
                promoted_users, game_lead = game.display()

                for user in promoted_users, game_lead:
                    print(user.username, user.score)
                data = {
                    "promoted_users": promoted_users,
                    "game_lead": game_lead
                }
                print(data)
                for board in board_list:
                    emit("leaderboard", data, to=board)
                print
            return
        question = config["questions"][question_number]
        data = {
            "question_title": question["title"],
            "question_type": question["type"],
            "question_onetry": question["onetry"],
            "question_duration": question["duration"],
            "question_number": config["questions"].index(question) + 1,
            "question_count": len(config["questions"]),
        }
        for client in client_list + board_list + host_list:
            emit("questionStart", data, to=client.sid)
        for client in client_list:
            client.time_begin = time.time()
            client.expected_response = question["answer"]
            client.question_type = question["type"]
            client.one_try = question["onetry"]
            client.timer_time = question["duration"]
        # 2sec for progress bar to appear and first delay,
        # question["duration"] seconds for the game,
        time.sleep(2 + question["duration"])
        for client in client_list+board_list+host_list:
            emit("questionEnd", to=client.sid)
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
    if gamerun:
        emit('error', "La partie est déjà en cours")
        return
    if any(c.username == username for c in client_list):
        emit('error', 'Nom d\'utilisateur déjà pris')
        return
    elif any(c.sid == sessid for c in client_list):
        emit('error', 'Vous êtes déjà connecté')
        return

    # Create a new client session
    session = Client(sid=sessid, username=username, connections=client_list)
    for board in board_list:
        emit('newUser', {'username': username, 'sid': sessid}, to=board.sid)


@socketio.on('disconnect')
def handle_disconnect() -> None:
    """Handle client disconnection events."""
    sessid = request.sid
    for client in client_list:
        if client.sid == sessid:
            for board in board_list:
                emit('rmUser', {'username': client.username,
                     'passcode': passcode}, to=board.sid)

            client_list.remove(client)  # Remove the client

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


@socketio.on('sendAnswer')
def handle_answer(res) -> None:
    user_answer = res["answers"]
    print(user_answer)
    question_number = res["question_number"]
    sessid = request.sid
    for client in client_list:
        if client.sid == sessid:
            client.time_end = time.time()
            client.user_answer = user_answer


@app.route('/')
def route_landing_page() -> str:
    """Render the landing page."""
    return render_template('landing-page.html')


if __name__ == '__main__':
    # Run the Flask application with SocketIO
    socketio.run(app, debug=True, port=8080, host="0.0.0.0")
