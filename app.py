from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import qrcode as qrcodemaker
from io import BytesIO
import time
import json
import xml.etree.ElementTree as ET
from base64 import b64encode
import random
import threading
import os

def get_settings():
    with open("settings.json", "r") as f:
        return json.load(f)
    
def get_passcode():
    return get_settings()["adminPassword"]

def get_glossary():
    with open("glossary.json", "r") as g:
        with open("settings.json", "r") as s:
            return json.load(g)[json.load(s)["language"]]



# Initialize Flask application and SocketIO
app = Flask(__name__)
socketio = SocketIO(app)

# Set static and template folders
app.static_folder = 'web/static'
app.template_folder = 'web/templates'

## ----------------- Class ----------------- ##

class Questionary:
    def __init__(self, root=None, tree=None) -> None:
        self.root = root
        self.tree = tree
        
        self.questionary = {"title" : "", "questions": []}
    
    

questionary = Questionary()
class SleepManager:
    def __init__(self):
        self._stop_event = threading.Event()

    def sleep(self, duration):
        self._stop_event.wait(timeout=duration)

    def stop(self):
        self._stop_event.set()

    def reset(self):
        self._stop_event.clear()

sleep_manager = SleepManager()
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
        # Créer des dictionnaires de rang pour l'ancien et le nouveau classement
        previous_ranks = {username: i+1 for i, (username, _) in enumerate(previous)}
        current_ranks = {username: i+1 for i, (username, _) in enumerate(current)}
        
        self.promoted_users = []
        
        # Pour chaque joueur dans le classement actuel
        for username, _ in current:
            if username in previous_ranks:
                previous_rank = previous_ranks[username]
                current_rank = current_ranks[username]
                
                # Calculer la différence de rang (nombre de places gagnées)
                rank_improvement = previous_rank - current_rank
                
                # Ajouter le joueur s'il :
                # 1. N'est pas dans le top 5 précédent
                # 2. A gagné au moins 3 places
                # 3. N'est pas déjà dans la liste des promus
                if (previous_rank > 5 and 
                    rank_improvement >= 3 and 
                    username not in [user[0] for user in self.promoted_users]):
                    self.promoted_users.append([username, rank_improvement])

        self.promoted_users.sort(key=lambda x: x[1], reverse=True)
        return self.promoted_users

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
            previous_leaderboard, current_leaderboard)  
        return current_leaderboard[:5], promoted_users

    def reset(self):
        self.previous_leaderboard = []  
        self.current_leaderboard = []   
        questionary.questionary = {"title": questionary.root.find('title').text,"questions": []}
        questions = questionary.root.find('questions')
        for question in questions.findall('question'):
            title = question.find('title').text
            duration = question.get('duration')
            question_type = question.get('type')
            shown_answers = [answer.text for answer in question.find(
            'shown_answers').findall('answer')]
            correct_answers = [answer.text for answer in question.find(
            'correct_answers').findall('answer')]
            questionary.questionary["questions"].append({
            "title": title,
            "shown_answers": shown_answers,
            "correct_answers": correct_answers,
            "duration": int(duration),
            "type": question_type
            })


game = Game()

## ----------------- Functions ----------------- ##

def verification_wrapper(func):
    def wrap(*args, **kwargs):
        real_passcode = get_passcode()
        guessed_passcode = args[0] if type(args[0]) == str else args[0]["passcode"]
        if guessed_passcode == real_passcode:
            return func(*args, **kwargs)
        else:
            emit('error', "InvalidPasscode")
            return    
    return wrap


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
    data = get_settings()
    del data["adminPassword"]
    emit("language", get_glossary())
    emit("settings", data)


@socketio.on('boardConnect')
@verification_wrapper
def handle_board_connect(passcode: str) -> None:
    """
    Handle board connection requests.

    :param code: Passcode provided by the board
    """
    if game.running:
        emit('error', "GameAlreadyRunning")
        return
    Board(sid=request.sid, connections=board_list)
    emit('boardConnected')
    qr_img = qrcodemaker.make(f"http://{request.host}/board")
    buffered = BytesIO()
    qr_img.save(buffered, format="JPEG")
    qr_img_str = b64encode(buffered.getvalue()).decode()
    emit('qrcode', f"data:image/jpeg;base64,{qr_img_str}", to=request.sid)
    for c in client_list:
        emit('newUser', {'username': c.username, 'sid': c.sid})


@socketio.on('hostConnect')
@verification_wrapper
def handle_host_connect(passcode: str) -> None:
    Host(sid=request.sid, connections=host_list)
    emit('hostConnected')


@socketio.on('disconnect')
def handle_disconnect() -> None:
    """Handle client disconnection events."""
    sessid = request.sid

    client = next((client for client in client_list if client.sid == sessid), None) # Get first client with the sessid, is used to not iter the list multiple times
    if client:
        for board in board_list:
            emit('rmUser', {'username': client.username}, to=board.sid)
        client_list.remove(client)
        if len(client_list) == 0:
            for client in board+host:
                emit("error", "NoClientConnected", to=client.sid)
                emit("gameEnd", to=client.sid)
        return

    board = next((board for board in board_list if board.sid == sessid), None)
    if sessid in [board.sid for board in board_list]:
        board_list.remove(board)
        if len(board_list == 0):
            for client in client_list+host_list:
                emit("error", "NoBoardConnected", to=client.sid)
                emit("gameEnd", to=client.sid)
        return

    host = next((host for host in host_list if host.sid == sessid), None)
    if host:
        host_list.remove(host)
        if len(host_list) == 0:
            for client in client_list+board_list:
                emit("error", "NoHostConnected", to=client.sid)
                emit("gameEnd", to=client.sid)
        return
    

@socketio.on('guestConnect')
def handle_connect(username: str) -> None:
    """
    Handle new user connection requests.

    :param username: Username provided by the new user
    """
    sessid = request.sid
    # Check if the username is already taken
    if game.running:
        emit('error', "GameAlreadyRunning")
    elif any(c.username == username for c in client_list):
        emit('error', "UsernameAlreadyTaken")
    elif any(c.sid == sessid for c in client_list):
        emit('error', "UserAlreadyConnected")
    elif len(username) > 40 or len(username) < 1:
        emit('error', "InvalidUsername")
    else:
        Client(sid=sessid, username=username, connections=client_list)
        emit('guestConnected')
        for board in board_list:
            emit('newUser', {'username': username, 'sid': sessid}, to=board.sid)
            
@socketio.on('kickPlayer')
@verification_wrapper
def handle_kick_player(res) -> None:
    for client in client_list:
        if client.username == res["username"]:
            client_list.remove(client)
            emit('error','Kicked', to=client.sid)
            for board in board_list:
                emit('rmUser', {'username': client.username}, to=board.sid)
            return
    emit('error', "UserNotFound")

## ----------------- SocketIO Game Events ----------------- ##

@socketio.on('startSession')
@verification_wrapper
def handle_start_game(code: str) -> None:
    if game.running:
        emit('error', "GameAlreadyRunning")
        return
    if questionary.root is None:
        emit('error', "NoQuestionary")
        return
    if len(client_list) == 0:
        emit('error', "NoUsersConnected")
        return
    if len(board_list) == 0:
        emit('error', "NoBoardConnected")
        return
    game.reset()
    game.running = True
    for client in client_list + board_list + host_list:
        emit('startGame', to=client.sid)


@socketio.on("nextQuestion")
@verification_wrapper
def handle_next_question(res) -> None:
    settings = get_settings()
    question_number = res["question_count"]
    # Reset all old user answer for the new question
    for client in client_list:
        client.user_answer = ""
    if len(client_list) == 0:
        emit('error', "NoUsersConnected")
        return
    if question_number == len(questionary.questionary["questions"]):
        data = {
            "game_lead": game.display()[0],
        }
        for client in client_list+board_list+host_list:
            emit("gameEnd", data, to=client.sid)
        return
    else:
        question_not_answered = list(filter(lambda q: q is not None, questionary.questionary["questions"]))
        question = random.choice(question_not_answered) if settings["randomOrder"] else questionary.questionary["questions"][question_number]
        data = {
            "question_title": question["title"],
            "question_type": question["type"],
            "question_possible_answers": question["shown_answers"],
            "question_duration": question["duration"],
            "question_number": (len(questionary.questionary["questions"]) - len(question_not_answered) + 1) if settings["randomOrder"] else questionary.questionary["questions"].index(question) + 1,
            "question_count": len(questionary.questionary["questions"]),
        }
        for client in client_list + board_list + host_list:
            emit("questionStart", data, to=client.sid)
        for client in client_list:
            client.time_begin = time.time()
            client.expected_response = question["correct_answers"]
            client.question_type = question["type"]
            client.timer_time = question["duration"]

        if settings.get("endOnAllAnswered"):
            #Threading used to stop sleep whenever all user answered
            sleep_manager.reset()
            sleep_thread = threading.Thread(target=sleep_manager.sleep, args=(2 + question["duration"],))
            sleep_thread.start()
            sleep_thread.join()
        else:
            # 2sec for progress bar to appear and first delay,
            time.sleep(2 + question["duration"])
        data = {
            "question_correct_answer": question["correct_answers"]
        }
        if settings["randomOrder"]:
            questionary.questionary["questions"][questionary.questionary["questions"].index(question)] = None
        for client in client_list:
            client.evalScore()
        for client in client_list+board_list+host_list:
            emit("questionEnd", data, to=client.sid)



@socketio.on('showLeaderboard')
@verification_wrapper
def handle_show_leaderboard(code: str) -> None:
    game_lead, promoted_users = game.display()
    for client in board_list:
        emit('leaderboard', {
            "promoted_users": promoted_users, "game_lead": game_lead}, to=client.sid)



@socketio.on('sendAnswer')
def handle_answer(res) -> None:
    user_answer = res["answers"]
    sessid = request.sid
    for client in client_list:
        if client.sid == sessid:
            client.time_end = time.time()
            client.user_answer = user_answer
            if get_settings()["endOnAllAnswered"]:
                if all(client.user_answer for client in client_list):
                    sleep_manager.stop()
            return
    
    emit('error' , "UserNotFound")

@socketio.on('getSpreadsheet')
def handle_get_spreadsheet(res) -> None:
    csv = []
    csv.append("Username,Score,MaxPossibleScore")
    client_list.sort(key=lambda x: x.score, reverse=True)
    for client in client_list:
        csv.append(f"{client.username},{client.score},{500*len(questionary.questionary['questions'])}")
    data = {
            "csv" : "\n".join(csv), 
            "questionary_name": questionary.questionary["title"]
            }
    
    for host in host_list:
        emit('spreadsheet', data, to=host.sid)
        
## ----------------- SocketIO Configuration Events ----------------- ##

@socketio.on('sendNewQuestionary')
@verification_wrapper
def handle_new_questionary(res) -> None:
    """
    Handle requests to send the questionary to the host.

    :param res: Dictionary containing the passcode and the questionary
    """
    # rename automatically the file to khn
    filename = filename.split(".")[0] + ".khn"
    with open(os.path.join("questionary", res["filename"]), "wb") as f:
        f.write(res["questionaire_data"])
    
@socketio.on('listQuestionary')
@verification_wrapper
def handle_list_questionary(res) -> None:
    """
    Handle requests to list all the questionaries.

    :param code: Passcode provided by the host
    """
    questionaries = os.listdir("questionary")
    questionaries.sort()
    emit("ListOfQuestionary", {"questionaries": questionaries})
    
@socketio.on('selectQuestionary')
@verification_wrapper
def handle_select_questionary(res) -> None:
    questionary.tree = ET.parse(os.path.join("questionary", res["questionary_name"]))
    questionary.root = questionary.tree.getroot()
    # questionary.questionary = {"questions": []}
    # for question in questionary.root.findall('question'):
    #     title = question.find('title').text
    #     duration = question.find('duration').text
    #     question_type = question.find('type').text
    #     shown_answers = [answer.text for answer in question.find(
    #         'shown_answers').findall('answer')]
    #     correct_answers = [answer.text for answer in question.find(
    #         'correct_answers').findall('answer')]

    #     questionary.questionary["questions"].append({
    #         "title": title,
    #         "shown_answers": shown_answers,
    #         "correct_answers": correct_answers,
    #         "duration": int(duration),
    #         "type": question_type
    #     })
    

@socketio.on('createQuestionary')
@verification_wrapper
def handle_create_questionary(res) -> None:
    list_questionaries = os.listdir("questionary")
    questionary_index = 1
    while f"new_questionary{questionary_index}.khn" in list_questionaries :
            questionary_index += 1
    file = open(f"questionary/new_questionary{questionary_index}.khn","w")
    file.close()
    emit("editingQuestionnary",f"new_questionary{questionary_index}.khn")

@socketio.on("editQuestionaryName")
@verification_wrapper
def handle_edit_questionary_name(res) -> None:
    list_questionaries = os.listdir("questionary")
    forbiden_characters = '/\|,.;:!?*"><'
    invalid_characters = False
    for character in forbiden_characters :
        invalid_characters += character in res["new_name"]
    if res["new_name"] == "" :
        emit('error', "EmptyName")
    elif invalid_characters :
        emit('error', "SpecialCharacters")
    elif res["new_name"] + ".khn" in list_questionaries :
        emit('error', "AlreadyExist")
    else :
        os.rename("questionary/" + res["old_name"], "questionary/"+res["new_name"]+".khn")
        emit("editingQuestionnary",res["new_name"]+".khn")
    

@socketio.on("getSettings")
def handle_get_settings(code: str) -> None:
    """Handle requests to get settings."""
    if get_passcode == code:
        emit("settings", get_settings())
    else:
        data = get_settings()
        del data["adminPassword"]
        emit("settings", data)



@socketio.on("setSettings")
@verification_wrapper
def handle_set_settings(res) -> None:
    """Handle requests to set a specific setting."""
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

    # Announce every client the new settings
    for client in client_list+board_list+host_list:
        emit("settings", settings, to=client.sid)


def start_flask():
    socketio.run(app, debug=True, port=8080, host="0.0.0.0")

if __name__ == '__main__':
    start_flask()
