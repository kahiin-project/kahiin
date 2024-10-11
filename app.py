from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
from hashlib import sha256
import time
import json
import xml.etree.ElementTree as ET
# Passcode for authentication


def get_glossary():
    with open("glossary.json", "r") as g:
        with open("settings.json", "r") as s:
            return json.load(g)[json.load(s)["language"]]


# Load KHN (XML) file
tree = ET.parse('questionnaire.khn')
root = tree.getroot()


def get_passcode():
    with open("settings.json", "r") as f:
        return json.load(f)["adminPassword"]


# Parse XML file and store questions in config
config = {"questions": []}
# Add each question to config
for question in root.findall('question'):
    title = question.find('title').text
    duration = question.find('duration').text
    question_type = question.find('type').text
    shown_answers = [answer.text for answer in question.find(
        'shown_answers').findall('answer')]
    correct_answers = [answer.text for answer in question.find(
        'correct_answers').findall('answer')]

    config["questions"].append({
        "title": title,
        "shown_answers": shown_answers,
        "correct_answers": correct_answers,
        "duration": int(duration),
        "type": question_type
    })


# Initialize Flask application and SocketIO
app = Flask(__name__)
socketio = SocketIO(app)

# Set static and template folders
app.static_folder = 'web/static'
app.template_folder = 'web/templates'

## ----------------- Class ----------------- ##


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
        if type(self.user_answer) != list:
            return
        self.response_time = self.time_end - self.time_begin
        match self.question_type:
            case "uniqueanswer":
                if self.user_answer[0] in self.expected_response:
                    self.score += round(
                        (1 - self.response_time / self.timer_time) * 500)
            case "mcq":
                self.user_answer.sort()
                self.expected_response.sort()
                if self.user_answer == self.expected_response:
                    self.score += round(
                        (1 - self.response_time / self.timer_time) * 500)


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
        self.previous_leaderboard = []
        self.current_leaderboard = []
        self.promoted_users = []
        self.running = False

    def handleFirstLeaderboard(self):
        self.current_leaderboard = sorted(
            client_list, key=lambda x: x.score, reverse=True)

    def handleNextLeaderboard(self):
        self.previous_leaderboard = self.current_leaderboard
        self.current_leaderboard = sorted(
            client_list, key=lambda x: x.score, reverse=True)

    def genPromotedUsers(self, previous: list[list], current: list[list]) -> list[list]:
        previous_ranks = {k: i+1 for i, (k, _) in enumerate(previous)}
        current_ranks = {k: i+1 for i, (k, _) in enumerate(current)}

        self.promoted_users = []
        for username, current_rank in current_ranks.items():
            previous_rank = previous_ranks.get(username, float('inf'))
            if current_rank < previous_rank:
                self.promoted_users.append(
                    [username, previous_rank - current_rank])
        for promoted_user in self.promoted_users:
            if promoted_user[0] in [user.username for user in current]:
                self.promoted_users.remove(promoted_user)
        self.promoted_users.sort(key=lambda x: x[1], reverse=True)

    def display(self):
        if not self.current_leaderboard:
            self.handleFirstLeaderboard()
            current_leaderboard = [[user.username, user.score]
                                   for user in self.current_leaderboard]
            return current_leaderboard[:5], []
        self.handleNextLeaderboard()
        current_leaderboard = [[user.username, user.score]
                               for user in self.current_leaderboard]
        previous_leaderboard = [[user.username, user.score]
                                for user in self.previous_leaderboard]

        promoted_users = self.genPromotedUsers(
            current_leaderboard, previous_leaderboard)
        return current_leaderboard[:5], promoted_users

    def reset(self):
        self.previous_leaderboard = {}
        self.current_leaderboard = {}


game = Game()

## ----------------- Routes ----------------- ##


@app.route('/host')
def route_host() -> str:
    """Render the host page."""
    return render_template('host-page.html')


@app.route('/guest')
def route_homepage() -> str:
    """Render the homepage."""
    return render_template('guest-page.html')


@app.route('/board')
def route_board_page() -> str:
    """Render the board page."""
    return render_template('board-page.html')


@app.route('/')
def route_landing_page() -> str:
    """Render the landing page."""
    return render_template('landing-page.html')

## ----------------- SocketIO Connections ----------------- ##


@socketio.on('connect')
def handle_connect() -> None:
    """Handle client connection events."""
    glossary = get_glossary()
    emit("language", glossary)
    with open("settings.json", "r") as f:
        data = json.load(f)
        del data["adminPassword"]
        emit("settings", data)


@socketio.on('boardConnect')
def handle_board_connect(code: str) -> None:
    """
    Handle board connection requests.

    :param code: Passcode provided by the board
    """
    glossary = get_glossary()
    passcode = get_passcode()
    if game.running:
        emit('error', glossary["GameAlreadyRunning"])
        return
    if code == passcode:
        session = Board(sid=request.sid, connections=board_list)

        # Notify all client_list about the new board connection
        for c in client_list:
            emit('newUser', {'username': c.username, 'sid': c.sid})
    else:
        emit('error', glossary["InvalidPasscode"])


@socketio.on('hostConnect')
def handle_host_connect(code: str) -> None:
    passcode = get_passcode()
    glossary = get_glossary()
    if code == passcode:
        session = Host(sid=request.sid, connections=host_list)

    else:
        emit('error', glossary["InvalidPasscode"])


@socketio.on('disconnect')
def handle_disconnect() -> None:
    """Handle client disconnection events."""
    passcode = get_passcode()
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


@socketio.on('guestConnect')
def handle_connect(username: str) -> None:
    """
    Handle new user connection requests.

    :param username: Username provided by the new user
    """
    glossary = get_glossary()
    sessid = request.sid
    # Check if the username is already taken
    if game.running:
        emit('error', glossary["GameAlreadyRunning"])
        return
    if any(c.username == username for c in client_list):
        emit('error', glossary["UsernameAlreadyTaken"])
        return
    elif any(c.sid == sessid for c in client_list):
        emit('error', glossary["UserAlreadyConnected"])
        return

    # Create a new client session
    session = Client(sid=sessid, username=username, connections=client_list)
    for board in board_list:
        emit('newUser', {'username': username, 'sid': sessid}, to=board.sid)

## ----------------- SocketIO Game Events ----------------- ##


@socketio.on('startSession')
def handle_start_game(code: str) -> None:
    passcode = get_passcode()
    glossary = get_glossary()
    if len(client_list) == 0:
        return
    elif game.running:
        emit('error', glossary["GameAlreadyRunning"])
        return
    elif code == passcode:
        for client in client_list + board_list + host_list:
            emit('startGame', to=client.sid)
        game.running = True
    else:
        emit('error', glossary["InvalidPasscode"])


@socketio.on("nextQuestion")
def handle_next_question(res) -> None:
    passcode = get_passcode()
    glossary = get_glossary()
    code, question_number = res["passcode"], res["question_count"]
    if len(client_list) == 0:
        emit('error', glossary["NoUsersConnected"])
        return
    if code == passcode:
        if question_number == len(config["questions"]):
            data = {
                "game_lead": game.display()[0],
            }
            for client in client_list+board_list+host_list:
                emit("gameEnd", data, to=client.sid)
            game.reset()
            return
        else:
            question = config["questions"][question_number]
            data = {
                "question_title": question["title"],
                "question_type": question["type"],
                "question_possible_answers": question["shown_answers"],
                "question_duration": question["duration"],
                "question_number": config["questions"].index(question) + 1,
                "question_count": len(config["questions"]),
            }
            for client in client_list + board_list + host_list:
                emit("questionStart", data, to=client.sid)
            for client in client_list:
                client.time_begin = time.time()
                client.expected_response = question["correct_answers"]
                client.question_type = question["type"]
                client.timer_time = question["duration"]
            # 2sec for progress bar to appear and first delay,
            # question["duration"] seconds for the game,
            time.sleep(2 + question["duration"])
            data = {
                "question_correct_answer": question["correct_answers"]
            }
            for client in client_list:
                client.evalScore()
            for client in client_list+board_list+host_list:
                emit("questionEnd", data, to=client.sid)
    else:
        emit('error', glossary["InvalidPasscode"])


@socketio.on('showLeaderboard')
def handle_show_leaderboard(code: str) -> None:
    passcode = get_passcode()
    glossary = get_glossary()
    if code == passcode:
        game_lead, promoted_users = game.display()
        for client in client_list + board_list + host_list:
            emit('leaderboard', {
                "promoted_users": promoted_users, "game_lead": game_lead}, to=client.sid)
    else:
        emit('error', glossary["InvalidPasscode"])


@socketio.on('sendAnswer')
def handle_answer(res) -> None:
    user_answer = res["answers"]
    sessid = request.sid
    for client in client_list:
        if client.sid == sessid:
            client.time_end = time.time()
            client.user_answer = user_answer

## ----------------- SocketIO Configuration Events ----------------- ##


@socketio.on('editQuestion')
def handle_edit_question(message: dict) -> None:
    """
    Handle configuration edit requests.

    :param message: Dictionary containing the key, value, and passcode
    """
    passcode = get_passcode()
    glossary = get_glossary()
    if message['passcode'] == passcode:
        for question in root.findall('question'):
            if question.find('title').text == message['key']:
                question.find('title').text = message['value']
                break
        tree.write('questionnaire.khn')
        # emit('edit', message)
    else:
        emit('error', glossary["InvalidPasscode"])


@socketio.on("getQuestions")
def handle_get_questions(res) -> None:
    """Handle requests for the list of questions."""
    passcode = get_passcode()
    glossary = get_glossary()
    if res.get("passcode") == passcode:
        emit("questions", {"questions": config["questions"]})
    else:
        emit("error", glossary["InvalidPasscode"])


@socketio.on("getSettings")
def handle_get_settings(code: str) -> None:
    """Handle requests to get settings."""
    passcode = get_passcode()
    if passcode == code:
        with open("settings.json", "r") as f:
            emit("settings", json.load(f))
    else:
        with open("settings.json", "r") as f:
            data = json.load(f)
            del data["adminPassword"]
            emit("settings", data)


@socketio.on("setSettings")
def handle_set_settings(res) -> None:
    """Handle requests to set a specific setting."""
    passcode = get_passcode()
    if res.get("passcode") == passcode:
        try:
            with open("settings.json", "r") as f:
                content = f.read().strip()
                if content:
                    settings = json.loads(content)
                else:
                    settings = {}
        except FileNotFoundError:
            settings = {}

        # Update the specific setting
        settings.update(res["settings"])

        with open("settings.json", "w") as f:
            json.dump(settings, f)

        glossary = get_glossary()
        emit("language", glossary)
        emit("settings", settings)
    else:
        emit("error", glossary["InvalidPasscode"])


if __name__ == '__main__':
    socketio.run(app, debug=True, port=8080, host="0.0.0.0")
