from flask import render_template
import qrcode as qrcodemaker
from io import BytesIO
import time
import json
import xml.etree.ElementTree as ET
import xmltodict
from base64 import b64encode
import random
import os
import asyncio
import socket
import requests

kahiin_db_address = "http://localhost:5000"

try:
    from kahiin_websocket import ws_manager, flask_app as app
except ImportError:
    from .kahiin_websocket import ws_manager, flask_app as app

def relative_open(filename: str, mode: str = "r", encoding: str = None):
    """
    Method to open a relative file with it's name.
    Parameters:
        filename (str): The name of the file to open.
        mode (str): The mode to open the file in.
        encoding (str): The encoding of the file.
    
    Returns:
        file: The file object.
    """
    full_path = os.path.join(os.path.dirname(__file__), filename)
    return open(full_path, mode=mode, encoding=encoding)

def get_settings() -> dict:
    """
    Get the settings for the current language.
    Returns: 
        dict: The settings for the current language.
    """
    with relative_open("settings.json", "r") as f:
        return json.load(f)

def get_passcode():
    """
    Get the passcode for the admin.
    Returns:
        str: The passcode for the admin.
    """
    return get_settings()["adminPassword"]

def get_glossary() -> dict:
    """
    Get the glossary for the current language.
    Returns: 
        dict: The glossary for the current language.
    """
    with relative_open("glossary.json", "r") as g:
        with relative_open("settings.json", "r") as s:
            return json.load(g)[json.load(s)["language"]]

app.static_folder = 'web/static'
app.template_folder = 'web/templates'

## ----------------- Classes ----------------- ##

class Quiz:
    """
    Class used to parse and store the quiz data.
    Attributes:
        root (xml.etree.ElementTree.Element): The root element of the quiz.
        tree (xml.etree.ElementTree.ElementTree): The tree of the quiz.
        filename (str): The name of the file containing the quiz.
        quiz (dict): The quiz data.

    """
    def __init__(self, root=None, tree=None) -> None:
        """
        Initialize a new Quiz instance.
        Parameters:
            root (xml.etree.ElementTree.Element): The root element of the quiz. Defaults to None.
            tree (xml.etree.ElementTree.ElementTree): The tree of the quiz. Defaults to None.

        """
        self.root = root
        self.tree = tree
        self.filename = None 
        self.quiz = {"title": "", "questions": []}

    def get_filename(self) -> str:
        """
        Get the name of the file containing the quiz.

        Returns:
            str: The name of the file containing the quiz.
        """
        return self.filename

quiz = Quiz()

class SleepManager:
    """
    Class used to manage sleep, used when the question is paused and resumed.
    Attributes:
        _stop_event (asyncio.Event): The event used to stop the sleep.
        _is_sleeping (bool): A boolean indicating if the sleep is running.
        _current_task (asyncio.Task): The current task.
        _duration (int): The duration of the sleep.
        _time_start (int): The time when the sleep started.
        _pause_time (int): The time when the sleep was paused.
        _is_paused (bool): A boolean indicating if the sleep is paused.
    """
    def __init__(self):
        """
        Initialize a new SleepManager instance.
        """
        self._stop_event = asyncio.Event()
        self._is_sleeping = False
        self._current_task = None
        self._duration = 0
        self._time_start = 0
        self._pause_time = 0
        self._is_paused = False

    async def sleep(self, duration):
        """
        Async method to sleep for a certain duration.
        Parameters:
            duration (int): The duration to sleep for.
        """
        self._duration = duration
        self._time_start = time.time()
        try:
            self._is_paused = False
            self._is_sleeping = True
            self._current_task = asyncio.create_task(asyncio.sleep(duration))
            await self._current_task
        except asyncio.CancelledError:
            pass
        self._is_sleeping = False
        self._current_task = None

    def stop(self):
        """
        Method to stop the sleep async task.
        """
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
        self._is_sleeping = False
        self._is_paused = False

    def pause(self):
        """
        Method to pause the sleep.
        """
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
            self._pause_time = time.time()
        self._is_paused = True

    def is_paused(self):
        """
        Function to check if the sleep is paused.

        Returns:
            bool: A boolean indicating if the sleep is paused.
        """
        return self._is_paused

    def reset(self):
        """
        Method to reset the sleep async task.
        """
        self._stop_event.clear()
        self._current_task = None
        self._pause_time = 0

    def current(self):
        """
        Get the current time left in the sleep.

        Returns:
            int: The current time left in the sleep.
        """
        if self._is_paused:
            elapsed = self._pause_time - self._time_start
            return int(self._duration - elapsed)
        elapsed = time.time() - self._time_start
        return int(self._duration - elapsed)

    def running(self):
        """
        Check if the sleep is running.

        Returns:
            bool: A boolean indicating if the sleep is running.
        """
        return self._is_sleeping

sleep_manager = SleepManager()
class GameTab:
    """Class representing a connected client."""

    def __init__(self, websocket, connections: list) -> None:
        """
        Initialize a new Gametab instance.

        :param sid: Session ID of the client
        :param username: Username of the client
        """
        self.websocket = websocket
        self.connections = connections
        self.connections.append(self)


# List to keep track of client connections
client_list = []


class Client(GameTab):
    """
    Class representing a connected client child of the GameTab class.
    Attributes:
        username (str): The username of the client.
        score (int): The score of the client.
        time_begin (int): The time when the client started answering the question.
        time_end (int): The time when the client finished answering the question.
        response_time (int): The time taken by the client to respond.
        timer_time (int): The time the client had to answer the question.
        user_answer (str): The answer provided by the client.
        expected_response (list): The expected response.
        question_type (str): The type of the question.
    """
    def __init__(self, websocket, username: str, connections: list) -> None:
        """
        Initialize a new Client instance.

        Parameters:
            websocket (WebSocket): The websocket of the client.
            username (str): The username of the client.
            connections (list): The list of connections.
        """
        super().__init__(websocket, connections)
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
        """
        Method to generate the score of the client using the following formula:
        score = (1 - response_time / allowed_time) * 500
        
        Returns:
            int: The score of the client.
        """

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

        self.user_answer = ""
        self.response_time = 0


# List to keep track of board connections
board_list = []


class Board(GameTab):
    """
    Class representing a connected board child of the GameTab class.
    Attributes:
        websocket (WebSocket): The websocket of the board.
        connections (list): The list of connections.
    """
    def __init__(self, websocket, connections: list) -> None:
        """
        Initialize a new Board instance.
        
        Parameters:
            websocket (WebSocket): The websocket of the board.
            connections (list): The list of connections."""
        super().__init__(websocket, connections)


host_list = []
# List to keep track of host connections


class Host(GameTab):
    """
    Class representing a connected host child of the GameTab class.

    Attributes:
        websocket (WebSocket): The websocket of the host.
        connections (list): The list of connections.
    """
    def __init__(self, websocket, connections: list) -> None:
        super().__init__(websocket, connections)


class Game:
    """
    Class representing the current game.
    Attributes:
        previous_leaderboard (list): The previous leaderboard.
        current_leaderboard (list): The current leaderboard.
        promoted_users (list): The list of promoted users.
        running (bool): A boolean indicating if the game is running.
    """
    def __init__(self) -> None:
        """
        Initialize a new Game instance.
        """
        self.previous_leaderboard = []
        self.current_leaderboard = []
        self.promoted_users = []
        self.running = False

    def handleFirstLeaderboard(self):
        """
        Method used to generate the first leaderboard, only called once.
        """
        self.current_leaderboard = sorted(
            client_list, key=lambda x: x.score, reverse=True)

    def handleNextLeaderboard(self):
        """
        Method used to generate the next leaderboard.
        """
        self.previous_leaderboard = self.current_leaderboard
        self.current_leaderboard = sorted(
            client_list, key=lambda x: x.score, reverse=True)

    def genPromotedUsers(self) -> list[list]:
        """
        Method used to generate the list of promoted users.
        Follows the following rules:
        1. The user was not in the previous top 5.
        2. The user gained at least 2 places.
        3. The user is not already in the promoted list.
        
        Returns:
            list[list]: The list of promoted users.
        """
        previous = [[user.username, user.score]
                              for user in self.previous_leaderboard]
        current = [[user.username, user.score]
                              for user in self.previous_leaderboard]
        previous_ranks = {username: i+1 for i, (username, _) in enumerate(previous)}
        current_ranks = {username: i+1 for i, (username, _) in enumerate(current)}
        
        self.promoted_users = []
        
        for username, _ in current:
            if username in previous_ranks:
                previous_rank = previous_ranks[username]
                current_rank = current_ranks[username]
                
                rank_improvement = previous_rank - current_rank
                
                # Add the player if they:
                # 1. Were not in the previous top 5
                # 2. Gained at least 2 places
                # 3. Are not already in the promoted list
                if (previous_rank > 5 and 
                    rank_improvement >= 2 and 
                    username not in [user[0] for user in self.promoted_users]):
                    self.promoted_users.append([username, rank_improvement])

        self.promoted_users.sort(key=lambda x: x[1], reverse=True)
        return self.promoted_users

    def display(self):
        """
        Method used to return the current leaderboard and promoted user.

        Returns:
            list[list], list[list]: The current leaderboard and the promoted users.
        """
        if not self.current_leaderboard:
            self.handleFirstLeaderboard()
            current_leaderboard = [[user.username, user.score]
                                 for user in self.current_leaderboard]
            return current_leaderboard[:5], []

        self.handleNextLeaderboard()
        current_leaderboard = [[user.username, user.score]
                             for user in self.current_leaderboard]
        promoted_users = self.genPromotedUsers()  
        return current_leaderboard[:5], promoted_users

    def reset(self):
        """
        Method used to reset the game.
        """
        self.previous_leaderboard = []  
        self.current_leaderboard = []   
        quiz.quiz = {"title": quiz.get_filename(),"questions": []}
        questions = quiz.root.find('questions')
        for question in questions.findall('question'):
            title = question.find('title').text
            duration = question.get('duration')
            question_type = question.get('type')
            shown_answers = [answer.text for answer in question.find('shown_answers').findall('answer')]
            correct_answers = [answer.text for answer in question.find('correct_answers').findall('answer')]
            quiz.quiz["questions"].append({
                "title": title,
                "shown_answers": shown_answers,
                "correct_answers": correct_answers,
                "duration": int(duration),
                "type": question_type
            })


game = Game()

## ----------------- Functions ----------------- ##

def verification_wrapper(func):
    """
    Wrapper function to verify the passcode provided by the client.
    Parameters:
        func (function): The function to wrap.
    Returns:
        function: The wrapped function.
    """
    async def wrap(*args, **kwargs):
        real_passcode = get_passcode()
        # Vérifier si args[1] est un dict ou une string
        guessed_passcode = args[1] if isinstance(args[1], str) else args[1]["passcode"]
        websocket = args[0]
        if guessed_passcode == real_passcode:
            # Exécuter la coroutine au lieu de l'appeler directement
            return await func(*args, **kwargs)
        else:
            await ws_manager.emit('error', "InvalidPasscode", to=websocket)
            return None
    return wrap

## ----------------- Routes ----------------- ##


@app.route('/host')
def route_host() -> str:
    """Render the host page."""
    return render_template('host-page.html', glossary=get_glossary(), settings=get_settings())


@app.route('/guest')
def route_homepage() -> str:
    """Render the homepage."""
    return render_template('guest-page.html', glossary=get_glossary())


@app.route('/board')
def route_board_page() -> str:
    """Render the board page."""
    return render_template('board-page.html', glossary=get_glossary())


@app.route('/')
def route_landing_page() -> str:
    """Render the landing page."""
    return render_template('landing-page.html', glossary=get_glossary())

## ----------------- ws_manager Connections ----------------- ##


@ws_manager.on('connect')
async def handle_connect(websocket) -> None:
    """Handle client connection events. Init client class and adds if to the client list.
    
    Parameters:
        websocket (WebSocket): The websocket of the client.
        """
    data = get_settings()

    filtered_data = {key: value for key, value in data.items() if key == "dyslexicMode" or key == "language"}
    await ws_manager.emit("settings", filtered_data, to=websocket)
    await ws_manager.emit("glossary", get_glossary(), to=websocket)

@ws_manager.on('boardConnect')
@verification_wrapper
async def handle_board_connect(websocket, passcode: str) -> None:
    """
    Handle board connection requests. Init the board class and add it to the board list.

    Parameters:
        websocket (WebSocket): The websocket of the board.
        passcode: Used for verification wrapper.
    """
    if game.running:
        await ws_manager.emit('error', "GameAlreadyRunning")
        return
    if any(board.websocket == websocket for board in board_list):
        return
    Board(websocket=websocket, connections=board_list)
    await ws_manager.emit('boardConnected', to=websocket)
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.254.254.254', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    qr_img = qrcodemaker.make(f"http://{IP}:8080/guest")
    qr_img = qr_img.convert("LA")
    data = qr_img.getdata()
    new_data = [(255, 0) if item == (255,255) else item for item in data]
    qr_img.putdata(new_data)
    buffered = BytesIO()
    qr_img.save(buffered, format="PNG")
    qr_img_str = b64encode(buffered.getvalue()).decode()
    await ws_manager.emit('qrcode', f"data:image/png;base64,{qr_img_str}", to=websocket)
    await ws_manager.emit("url", f"http://{IP}:8080/guest", to=websocket)
    for c in client_list:
        await ws_manager.emit('newUser', data={'username': c.username}, to=websocket)


@ws_manager.on('hostConnect')
@verification_wrapper
async def handle_host_connect(websocket, passcode: str) -> None:
    """
    Handle host connection requests. Init the host class and add it to the host list.

    Parameters:
        websocket (WebSocket): The websocket of the host.
        passcode: Used for verification wrapper.
    """
    if game.running:
        await ws_manager.emit('error', "GameAlreadyRunning", to=websocket)
        return
    if any(host.websocket == websocket for host in host_list):
        return
    Host(websocket=websocket, connections=host_list)
    await ws_manager.emit('hostConnected', data={}, to=websocket)


@ws_manager.on('guestConnect')
async def handle_connect(websocket, username: str) -> None:
    """
    Handle guest connection requests. Init the guest class and add it to the guest list

    Parameters:
        websocket (WebSocket): The websocket of the guest
        username: The username of the guest
    """
    if game.running:
        await ws_manager.emit('error', "GameAlreadyRunning", to=websocket)
        return
    if any(client.websocket == websocket for client in client_list):
        # Client may send multiple connect request by error, thus blocking it will make them unable to connect
        # await ws_manager.emit('error', "UserAlreadyConnected", to=websocket)
        return
    if any(c.username == username for c in client_list):
        print([i.username for i in client_list])
        await ws_manager.emit('error', "UsernameAlreadyTaken", to=websocket)
        return
    if len(username) > 40 or len(username) < 1:
        await ws_manager.emit('error', "InvalidUsername", to=websocket)
        return
    
    Client(websocket=websocket, username=username, connections=client_list)
    await ws_manager.emit('guestConnected', to=websocket)
    for board in board_list:
        await ws_manager.emit('newUser', {'username': username}, to=board.websocket)
            
@ws_manager.on('disconnect')
async def handle_disconnect(websocket) -> None:
    """Handle client disconnection events. Remove client from his list
    
    Parameters: 
        websocket (WebSocket): The websocket of the client"""
    target_websocket = websocket
    client = next((client for client in client_list if client.websocket == target_websocket), None) # Get first client with the target_websocket, is used to not iter the list multiple times
    if client:
        for board in board_list:
            await ws_manager.emit('rmUser', {'username': client.username}, to=board.websocket)
        client_list.remove(client)
        if game.running:
            if len(client_list) == 0:
                for client in board_list+host_list:
                    await ws_manager.emit("error", "NoClientConnected", to=client.websocket)
                    await ws_manager.emit("gameEnd", to=client.websocket)
                    game.reset()
                    game.running = False
        return

    board = next((board for board in board_list if board.websocket == target_websocket), None)
    if target_websocket in [board.websocket for board in board_list]:
        board_list.remove(board)
        if game.running:
            if len(board_list) == 0:
                for client in client_list+host_list:
                    await ws_manager.emit("error", "NoBoardConnected", to=client.websocket)
                    await ws_manager.emit("gameEnd", to=client.websocket)
                    game.reset()
                    game.running = False
        return

    host = next((host for host in host_list if host.websocket == target_websocket), None)
    if host:
        host_list.remove(host)
        if game.running:
            if len(host_list) == 0:
                for client in client_list+board_list:
                    await ws_manager.emit("error", "NoHostConnected", to=client.websocket)
                    await ws_manager.emit("gameEnd", to=client.websocket)
                    game.reset()
                    game.running = False
        return
    

## ----------------- ws_manager Game Events ----------------- ##

@ws_manager.on('startSession')
@verification_wrapper
async def handle_start_game(websocket, passcode: str) -> None:
    """
    Handle the start of the game.

    Parameters:
        websocket (WebSocket): The host websocket.
        passcode (str): Used for verification wrapper.
    """
    if game.running:
        await ws_manager.emit('error', "GameAlreadyRunning", to=websocket)
        return
    if quiz.root is None:
        await ws_manager.emit('error', "NoQuiz", to=websocket)
        return
    if len(client_list) == 0:
        await ws_manager.emit('error', "NoUsersConnected", to=websocket)
        return
    if len(board_list) == 0:
        await ws_manager.emit('error', "NoBoardConnected", to=websocket)
        return
    game.reset()
    game.running = True
    for client in client_list + board_list + host_list:
        await ws_manager.emit('startGame', to=client.websocket)



@ws_manager.on("nextQuestion")
@verification_wrapper
async def handle_next_question(websocket, res) -> None:
    """
    Handle the start of the game.

    Parameters:
        websocket (WebSocket): The host websocket
        res (dict): Dict containing {passcode, question_count}
    """
    settings = get_settings()
    question_number = res["question_count"]
    
    # Reset all old user answer for the new question
    for client in client_list:
        client.user_answer = ""
        
    if len(client_list) == 0:
        await ws_manager.emit('error', "NoUsersConnected", to=websocket)
        return
        
    if question_number == len(quiz.quiz["questions"]):
        data = {
            "game_lead": game.display()[0],
        }
        for client in client_list + board_list + host_list:
            try:
                await ws_manager.emit("gameEnd", data, to=client.websocket)
            except Exception:
                continue
        return
        
    question_not_answered = list(filter(lambda q: q is not None, quiz.quiz["questions"]))
    question = random.choice(question_not_answered) if settings["randomOrder"] else quiz.quiz["questions"][question_number]
    
    data = {
        "question_title": question["title"],
        "question_type": question["type"],
        "question_possible_answers": question["shown_answers"],
        "question_duration": question["duration"],
        "question_number": (len(quiz.quiz["questions"]) - len(question_not_answered) + 1) if settings["randomOrder"] else quiz.quiz["questions"].index(question) + 1,
        "question_count": len(quiz.quiz["questions"]),
    }

    # Send question start to all clients
    for client in client_list + board_list + host_list:
        try:
            await ws_manager.emit("questionStart", data, to=client.websocket)
        except Exception:
            continue

    # Initialize client data
    current_time = time.time()
    for client in client_list:
        client.time_begin = current_time
        client.expected_response = question["correct_answers"]
        client.question_type = question["type"]
        client.timer_time = question["duration"]
        client.user_answer = None
        client.time_end = 0

    async def timer_task():
        try:
            await sleep_manager.sleep(2 + question["duration"])
            if not sleep_manager.running():
                await end_question(client_list[0].expected_response)
        except Exception:
            pass

    asyncio.create_task(timer_task())


async def end_question(correct_answers):
    """Handle the host ending the question.

    Parameters:
        correct_answers (str): Used to send the correct answers to the board
    """
    data = {
        "question_correct_answer": correct_answers
    }
    if sleep_manager.is_paused():
        return
    current_time = time.time()
    for client in client_list:
        if client.user_answer is None:
            client.user_answer = []
        if client.time_end == 0:
            client.time_end = current_time
        
    for client in client_list:
        try:
            client.evalScore()
        except Exception:
            continue

    for client in client_list + board_list + host_list:
        try:
            await ws_manager.emit("questionEnd", data, to=client.websocket)
        except Exception:
            continue




@ws_manager.on('showLeaderboard')
@verification_wrapper
async def handle_show_leaderboard(websocket, passcode: str) -> None:
    """Handle the host showing the leaderboard.

    Parameters:'\n\n' +
        websocket (WebSocket): The host websocket
        passcode (str): Used for verification wrapper.
    """
    game_lead, promoted_users = game.display()
    for client in board_list:
        await ws_manager.emit('leaderboard', {
            "promoted_users": promoted_users, "game_lead": game_lead}, to=client.websocket)

@ws_manager.on('sendAnswer')
async def handle_answer(websocket, res) -> None:
    """Handle the guest sending it's answer.

    Parameters:
        websocket (WebSocket): The guest websocket.
        res (dict): Dict containing {answer, question_number}
    """
    user_answer = res["answers"]
    target_websocket = websocket
    if sleep_manager.is_paused():
        return

    for client in client_list:
        if client.websocket.id == target_websocket.id:
            client.time_end = time.time()
            client.user_answer = user_answer
            if get_settings()["endOnAllAnswered"]:
                if all(client.user_answer for client in client_list):
                    await end_question(client.expected_response)
            return
    await ws_manager.emit('error' , "UserNotFound", to=websocket)

@ws_manager.on('getSpreadsheet')
@verification_wrapper
async def handle_get_spreadsheet(websocket, passcode: str) -> None:

    """
    Handle the sending the csv spreadsheet to the host.

    Parameters:
        websocket (WebSocket): The host websocket
        passwode (str): Used for verification wrapper.
    """
    csv = []
    csv.append("Username,Score,MaxPossibleScore")
    client_list.sort(key=lambda x: x.score, reverse=True)
    for client in client_list:
        csv.append(f"{client.username},{client.score},{500*len(quiz.quiz['questions'])}")
    data = {
            "csv" : "\n".join(csv), 
            "quiz_name": quiz.quiz["title"]
            }
    
    for host in host_list:
        await ws_manager.emit('spreadsheet', data, to=host.websocket)
        
## ----------------- ws_manager Configuration Events ----------------- ##

@ws_manager.on('sendNewQuiz')
@verification_wrapper
async def handle_new_quiz(websocket, res) -> None:
    """
    Handle requests to send the quiz to the host.

    Parameters:
        websocket (WebSocket): The websocket of the host
        res (dict): Dictionary containing {filename, passcode}
    """
    filename = filename.split(".")[0] + ".khn"
    with relative_open(f"quiz/{res['filename']}", "wb") as f:
        f.write(res["quiz_data"])
    
@ws_manager.on('listQuiz')
@verification_wrapper
async def handle_list_quiz(websocket, res) -> None:
    """
    Handle the listing of all the quizzes to the host

    Parameters:
        websocket (WebSocket): The websocket of the host
        res (dict): Dictionary containing {passcode}
    """
    quizzes = os.listdir(os.path.join(os.path.dirname(__file__), "quiz"))
    quizzes.sort()
    quizzes = [q[:-4] for q in quizzes if q != ".gitkeep"]
    await ws_manager.emit("ListOfQuiz", {"quizzes": quizzes}, to=websocket)

@ws_manager.on('selectQuiz')
@verification_wrapper
async def handle_select_quiz(websocket, res) -> None:
    """
    Handle the selection of the quiz
    
    Parameters:
        websocket (WebSocket): The websocket of the host
        res (dict): Dictionary containing {passcode, quiz_name}"""
    if not res["quiz_name"].endswith(".khn"):
        res["quiz_name"] += ".khn"
    quiz.tree = ET.parse(os.path.join(os.path.dirname(__file__), "quiz", res["quiz_name"]))
    quiz.root = quiz.tree.getroot()
    quiz.filename = res["quiz_name"]

@ws_manager.on('kickPlayer')
@verification_wrapper
async def handle_kick_player(websocket,res) -> None:
    """
    Handle the kicking of a player 

    Parameters:
        websocket (WebSocket): The websocket of the host
        res (dict): Dictionary containing {passcode, username}"""
    for client in client_list:
        if client.username == res["username"]:
            client_list.remove(client)
            await ws_manager.emit('error','Kicked', to=client.websocket)
            for board in board_list:
                await ws_manager.emit('rmUser', {'username': client.username}, to=board.websocket)
            return
    await ws_manager.emit('error', "UserNotFound", to=websocket)

@ws_manager.on('stopQuestion')
@verification_wrapper
async def handle_stop_game(websocket, passcode: str) -> None:
    """
    Handle the kicking of player 

    Parameters:
        websocket (WebSocket): The websocket of the host.
        passcode (str): Used for verification wrapper.
    """
    if not game.running:
        await ws_manager.emit("error", "GameNotRunning", to=websocket)
        return
    if not sleep_manager.running():
        await ws_manager.emit("error", "QuestionNotRunning", to=websocket)
        return

    sleep_manager.stop()
    
    await end_question(client_list[0].expected_response)

@ws_manager.on('pauseQuestion') 
@verification_wrapper
async def handle_pause_game(websocket, passcode: str) -> None:
    """
    Handle the host pausing the game. Using the asynchronous sleep_manager

    Parameters:
        websocket (WebSocket): The websocket of the host.
        passcode (str): Used for verification wrapper.
    """
    if not game.running:
        await ws_manager.emit("error", "GameNotRunning", to=websocket)
        return

    sleep_manager.pause()
    for client in board_list + client_list:
        await ws_manager.emit("pauseQuestion", to=client.websocket)
            

@ws_manager.on('unpauseQuestion')
@verification_wrapper 
async def handle_unpause_game(websocket, passcode: str) -> None:
    """
    Handle the host unpausing the game. Using the asynchronous sleep_manager
    
    Parameters:
        websocket (WebSocket): The websocket of the host.
        passcode (str): Used for verification wrapper.
    """
    if not game.running:
        await ws_manager.emit("error", "GameNotRunning", to=websocket)
        return
    if not sleep_manager.is_paused():
        return
    remaining_sec = sleep_manager.current()
    sleep_manager.stop() # Clean stop before resuming

    async def resume_timer():
        try:
            await sleep_manager.sleep(remaining_sec)
            if not sleep_manager.running():
                await end_question(client_list[0].expected_response)
        except asyncio.CancelledError:
            pass

    for client in board_list + client_list:
        await ws_manager.emit("unpauseQuestion", to=client.websocket)

    timer_task = asyncio.create_task(resume_timer())
    sleep_manager._current_task = timer_task


@ws_manager.on('createQuiz')
@verification_wrapper
async def handle_create_quiz(websocket, res) -> None:
    """
    Handle the creation of a new quiz.

    Parameters:
        websocket (WebSocket): The websocket of the host.
        res (dict): Dictionary containing {passcode}
    """
    list_quizzes = os.listdir(os.path.join(os.path.dirname(__file__), "quiz"))
    quiz_index = 1
    while f"new_quiz{quiz_index}.khn" in list_quizzes:
        quiz_index += 1
    filename = f"new_quiz{quiz_index}.khn"
    quiz = ET.Element("quiz")
    subject = ET.SubElement(quiz, "subject") 
    subject.text = get_glossary()["Other"]
    language = ET.SubElement(quiz, "language")
    with relative_open("settings.json", "r") as f:
        language.text = json.load(f)["language"]
    questions = ET.SubElement(quiz, "questions")
    
    tree = ET.ElementTree(quiz)
    tree.write(os.path.join(os.path.dirname(__file__), 'quiz', filename), encoding="utf-8", xml_declaration=True)
    
    await ws_manager.emit("editingQuiz", filename, to=websocket)

@ws_manager.on('deleteQuiz')
@verification_wrapper
async def handle_delete_quiz(websocket, res) -> None:
    """
    Handle the deletion of a quiz.

    Parameters:
        websocket (WebSocket): The websocket of the host.
        res (dict): Dictionary containing {passcode, quiz_name}
    """
    if not res["quiz_name"].endswith(".khn"):
        res["quiz_name"] += ".khn"
    os.remove(os.path.join(os.path.dirname(__file__), "quiz", res["quiz_name"]))
    await ws_manager.emit("deletedQuiz", to=websocket)

@ws_manager.on("editQuizName")
@verification_wrapper
async def handle_edit_quiz_name(websocket, res) -> None:
    """
    Handle the renaming of a quiz.

    Parameters:
        websocket (WebSocket): The websocket of the host.
        res (dict): Dictionary containing {passcode, old_name, new_name}
    """
    list_quizzes = os.listdir(os.path.join(os.path.dirname(__file__), "quiz"))
    forbiden_characters = '/\\|,.;:!?*"><'
    invalid_characters = False
    old_name = res["old_name"]
    new_name = res["new_name"]

    # Add .khn extension if not present
    if not old_name.endswith(".khn"):
        old_name += ".khn"
    if not new_name.endswith(".khn"):
        new_name += ".khn"

    for character in forbiden_characters:
        invalid_characters += character in new_name[:-4]
    if len(new_name) <= 4:
        await ws_manager.emit('error', "EmptyName", to=websocket)
    elif invalid_characters:
        await ws_manager.emit('error', "SpecialCharacters")
    elif new_name in list_quizzes:
        await ws_manager.emit('error', "AlreadyExists", to=websocket)
    else:
        os.rename(
            os.path.join(os.path.dirname(__file__), "quiz", old_name),
            os.path.join(os.path.dirname(__file__), "quiz", new_name)
        )
        await ws_manager.emit("editingQuiz", new_name, to=websocket)


@ws_manager.on("editQuizLanguage")
@verification_wrapper
async def handle_edit_quiz_language(websocket, res) -> None:
    """
    Handle editing the language of a quiz.

    Parameters:
        websocket (WebSocket): The websocket of the host.
        res (dict): Dictionary containing {passcode, quiz_name, new_language}
    """
    quiz_name = res["quiz_name"]
    new_language = res["new_language"]
    if not quiz_name.endswith(".khn"):
        quiz_name += ".khn"
    tree = ET.parse(os.path.join(os.path.dirname(__file__), "quiz", quiz_name))
    root = tree.getroot()
    root.find("language").text = new_language
    tree.write(os.path.join(os.path.dirname(__file__), "quiz", quiz_name))


@ws_manager.on("editQuizSubject")
@verification_wrapper
async def handle_edit_quiz_subject(websocket, res) -> None:
    """
    Handle the changing of the subject of a quiz.

    Parameters:
        websocket (WebSocket): The websocket of the host.
        res (dict): Dictionary containing {passcode, quiz_name, new_subject}
    """
    quiz_name = res["quiz_name"]
    new_subject = res["new_subject"]
    if not quiz_name.endswith(".khn"):
        quiz_name += ".khn"
    tree = ET.parse(os.path.join(os.path.dirname(__file__), "quiz", quiz_name))
    root = tree.getroot()
    root.find("subject").text = new_subject
    tree.write(os.path.join(os.path.dirname(__file__), "quiz", quiz_name))
    

@ws_manager.on("editQuestion")
@verification_wrapper
async def handle_edit_quiz(websocket, res) -> None:
    """
    Handle the editing of a question.

    Parameters:
        websocket (WebSocket): The websocket of the host.
        res (dict): Dictionary containing {passcode, type, duration, shown_answers, correct_answers, language, subject, id, title}
    """
    question_id = res["id"]

    with relative_open("drawer.json", "r") as f:
        drawer = json.load(f)

    if not res["type"] in ["uniqueanswer", "mcq"]:
        return
    if not res["duration"].isdigit() and int(res["duration"]) < 0:
        return
    if not "shown_answers" in res or not "correct_answers" in res:
        return
    for ans in res["correct_answers"]:
        if ans not in res["shown_answers"]:
            return
    
    drawer[question_id] = {
        "title": res["title"],
        "type": res["type"],
        "duration": int(res["duration"]),
        "shown_answers": {"answer": [ans for ans in res["shown_answers"]]},
        "correct_answers": {"answer": [ans for ans in res["correct_answers"]]},
        "language": res["language"],
        "subject": res["subject"]
    }

    with relative_open("drawer.json", "w") as f:
        json.dump(drawer, f, indent=4)

    with relative_open("drawer.json", "r") as f:
        drawer = json.load(f)
        await ws_manager.emit("drawer", drawer, to=websocket)

@ws_manager.on("deleteQuestionInDrawer")
@verification_wrapper
async def handle_delete_question_in_drawer(websocket, res) -> None:
    """
    Handle the deletion of a question in the drawer.

    Parameters:
        websocket (WebSocket): The websocket of the host.
        res (dict): Dictionary containing {passcode, id}
    """
    question_id = res["id"]

    with relative_open("drawer.json", "r") as f:
        drawer = json.load(f)

    del drawer[question_id]

    with relative_open("drawer.json", "w") as f:
        json.dump(drawer, f, indent=4)

    with relative_open("drawer.json", "r") as f:
        drawer = json.load(f)
        await ws_manager.emit("drawer", drawer, to=websocket)

@ws_manager.on("newQuestion")
@verification_wrapper
async def handle_new_question(websocket, res) -> None:
    """
    Handle the addition of a new question to the drawer.

    Parameters:
        websocket (WebSocket): The websocket of the host.
        res (dict): Dictionary containing {passcode}
    """
    glossary = get_glossary()
    with relative_open("drawer.json", "r") as f:
        drawer = json.load(f)

    drawer.append({
        "title": glossary["NewQuestion"],
        "type": "uniqueanswer",
        "duration": 20,
        "shown_answers": ["A", "B"],
        "correct_answers": [],
        "language": get_settings()["language"],
        "subject": glossary["Other"]
    })

    with relative_open("drawer.json", "w") as f:
        json.dump(drawer, f, indent=4)

    with relative_open("drawer.json", "r") as f:
        drawer = json.load(f)
        await ws_manager.emit("questionAdded", drawer, to=websocket)

@ws_manager.on("getSettings")
async def handle_get_settings(websocket, passcode: str) -> None:
    """Handle requests to get settings.
    
    Parameters:
        websocket (WebSocket): The websocket of the client.
        passcode (str): Used for verification wrapper.
    """
    if get_passcode() == passcode:
        await ws_manager.emit("settings", get_settings(), to=websocket)
    else:
        data = get_settings()
        del data["adminPassword"]
        await ws_manager.emit("settings", data, to=websocket)

@ws_manager.on("setSettings")
@verification_wrapper
async def handle_set_settings(websocket, res) -> None:
    """Handle requests to set a specific setting.
    
    Parameters:
        websocket (WebSocket): The websocket of the client.
        res (dict): Dictionary containing {passcode, settings}
    """
    try:
        with relative_open("settings.json", "r") as f:
            content = f.read().strip()
            if content:
                settings = json.loads(content)
            else:
                settings = {}
    except FileNotFoundError:
        settings = {}

    # Update the specific setting
    settings.update(res["settings"])

    with relative_open("settings.json", "w") as f:
        json.dump(settings, f)

    # if it's dyslexic mode, send the new settings
    settings = get_settings()
    if res["settings"].get("dyslexicMode") is not None:
        for client in host_list+client_list+board_list:
            await ws_manager.emit("settings", settings, to=client.websocket)

@ws_manager.on("getWholeQuiz")
@verification_wrapper
async def handle_get_whole_quiz(websocket, res) -> None:
    """Handle requests to get the whole quiz.
    
    Parameters:
        websocket (WebSocket): The websocket of the client.
        res (dict): Dictionary containing {passcode, quiz_name}
    """
    quiz_name = res["quiz_name"]
    if not quiz_name.endswith(".khn"):
        quiz_name += ".khn"
    with relative_open(f"quiz/{quiz_name}", "rb") as f:
        xml_content = f.read()
        dict_content = xmltodict.parse(xml_content)

        if "questions" not in dict_content["quiz"]:
            dict_content["quiz"]["questions"] = []

        if isinstance(dict_content["quiz"]["questions"], dict):
            questions = [dict_content["quiz"]["questions"]]
            dict_content["quiz"]["questions"] = questions
        elif dict_content["quiz"]["questions"] is None:
            questions = []
        elif isinstance(dict_content["quiz"]["questions"][0]["question"], dict):
            questions = [dict_content["quiz"]["questions"][0]["question"]]
            dict_content["quiz"]["questions"][0]["question"] = questions

        if not isinstance(questions, list):
            questions = [e["question"] for e in questions]
        elif(len(questions) == 0):
            questions = []
        else:
            questions = questions[0]["question"]
        
        if not isinstance(questions, list):
            questions = [questions]

        # Ensure correct_answers is always present
        for question in questions:
            if isinstance(question, dict) and "correct_answers" not in question:
                question["correct_answers"] = []

        if not quiz_name.endswith(".khn"):
            quiz_name += ".khn"

        quiz = {
            "subject": dict_content["quiz"]["subject"],
            "language": dict_content["quiz"]["language"],
            "title": quiz_name[:-4],
            "questions": questions
        }

        json_content = json.dumps(quiz)
        await ws_manager.emit("wholeQuiz", json_content, to=websocket)

@ws_manager.on("moveQuestion")
@verification_wrapper
async def handle_move_question(websocket, res) -> None:
    """Handle requests to move a question.
    
    Parameters:
        websocket (WebSocket): The websocket of the client.
        res (dict): Dictionary containing {passcode, from, to, quiz_name}
    """
    from_index = res["from"]
    to_index = res["to"]
    quiz_name = res["quiz_name"]
    
    if not quiz_name.endswith(".khn"):
        quiz_name += ".khn"

    with relative_open(f"quiz/{quiz_name}", "rb") as f:
        xml_content = f.read()
        dict_content = xmltodict.parse(xml_content)
        if "questions" not in dict_content["quiz"]:
            dict_content["quiz"]["questions"] = []

        if isinstance(dict_content["quiz"]["questions"], dict):
            questions = [dict_content["quiz"]["questions"]]
            dict_content["quiz"]["questions"] = questions
        elif dict_content["quiz"]["questions"] is None:
            questions = []
        elif isinstance(dict_content["quiz"]["questions"][0]["question"], dict):
            questions = [dict_content["quiz"]["questions"][0]["question"]]
            dict_content["quiz"]["questions"][0]["question"] = questions

        if not isinstance(questions, list):
            questions = [e["question"] for e in questions]
        elif len(questions) == 0:
            questions = []
        else:
            questions = questions[0]["question"]

    # Ensure questions is a list
    if not isinstance(questions, list):
        questions = [questions]

    # Ensure correct_answers is always present
    for question in questions:
        if "correct_answers" not in question:
            question["correct_answers"] = []

    # Move the question from from_index to to_index
    questions.insert(to_index, questions.pop(from_index))

    with relative_open(f"quiz/{quiz_name}", "wb") as f:
        f.write(xmltodict.unparse(dict_content).encode())

    if not quiz_name.endswith(".khn"):
        quiz_name += ".khn"

    quiz = {
        "subject": dict_content["quiz"]["subject"],
        "language": dict_content["quiz"]["language"],
        "title": quiz_name[:-4],
        "questions": questions
    }

    json_content = json.dumps(quiz)
    await ws_manager.emit("wholeQuiz", json_content, to=websocket)


@ws_manager.on("copyQuestion")
@verification_wrapper
async def handle_copy_question(websocket, res) -> None:
    """Handle requests to copy a question.
    
    Parameters:
        websocket (WebSocket): The websocket of the client.
        res (dict): Dictionary containing {passcode, question, to, quiz_name}
    """
    question_to_copy = res["question"]
    question_to_copy["@duration"] = question_to_copy.pop("duration")
    question_to_copy["@type"] = question_to_copy.pop("type")

    target_index = res["to"]
    quiz_name = res["quiz_name"]
    
    if not quiz_name.endswith(".khn"):
        quiz_name += ".khn"

    with relative_open(f"quiz/{quiz_name}", "rb") as f:
        xml_content = f.read()
        dict_content = xmltodict.parse(xml_content)
        if "questions" not in dict_content["quiz"] or dict_content["quiz"]["questions"] is None:
            dict_content["quiz"]["questions"] = {"question": []}
        questions = dict_content["quiz"]["questions"].get("question", [])

    # Ensure questions is a list
    if not isinstance(questions, list):
        questions = [questions]

    # Ensure correct_answers is always present
    for question in questions:
        if "correct_answers" not in question:
            question["correct_answers"] = []

    # Copy the question to the target index
    questions.insert(target_index, question_to_copy)

    dict_content["quiz"]["questions"]["question"] = questions

    with relative_open(f"quiz/{quiz_name}", "wb") as f:
        f.write(xmltodict.unparse(dict_content).encode())

    if not quiz_name.endswith(".khn"):
        quiz_name += ".khn"

    quiz = {
        "subject": dict_content["quiz"]["subject"],
        "language": dict_content["quiz"]["language"],
        "title": quiz_name[:-4],
        "questions": questions
    }

    json_content = json.dumps(quiz)
    await ws_manager.emit("wholeQuiz", json_content, to=websocket)

@ws_manager.on("deleteQuestion")
@verification_wrapper
async def handle_delete_question(websocket, res) -> None:
    """Handle requests to delete a question.
    
    Parameters:
        websocket (WebSocket): The websocket of the client.
        res (dict): Dictionary containing {passcode, index, quiz_name}
    """
    index = res["index"]
    quiz_name = res["quiz_name"]
    
    if not quiz_name.endswith(".khn"):
        quiz_name += ".khn"
    with relative_open(f"quiz/{quiz_name}", "rb") as f:
        xml_content = f.read()
        dict_content = xmltodict.parse(xml_content)
        questions = dict_content["quiz"]["questions"].get("question", [])

    # Ensure questions is a list
    if not isinstance(questions, list):
        questions = [questions]

    # Delete the question at the specified index
    if 0 <= index < len(questions):
        del questions[index]

    dict_content["quiz"]["questions"]["question"] = questions

    with relative_open(f"quiz/{quiz_name}", "wb") as f:
        f.write(xmltodict.unparse(dict_content).encode())

    if not quiz_name.endswith(".khn"):
        quiz_name += ".khn"
    
    quiz = {
        "subject": dict_content["quiz"]["subject"],
        "language": dict_content["quiz"]["language"],
        "title": quiz_name[:-4],
        "questions": questions
    }

    json_content = json.dumps(quiz)
    await ws_manager.emit("wholeQuiz", json_content, to=websocket)


@ws_manager.on("getDrawer")
@verification_wrapper
async def handle_get_drawer(websocket, res) -> None:
    """Handle requests to get the drawer.
    
    Parameters:
        websocket (WebSocket): The websocket of the client.
        res (dict): Dictionary containing {passcode}
    """
    with relative_open("drawer.json", "r") as f:
        drawer = json.load(f)
        await ws_manager.emit("drawer", drawer, to=websocket)

@ws_manager.on("uploadQuiz")
@verification_wrapper
async def handle_upload_quiz_at_id(websocket, res) -> None:
    """
    Handle the upload of a quiz to kahiindb.
    
    Parameters:
        websocket (WebSocket): The websocket of the client.
        res (dict): Dictionary containing {passcode, quiz, token}
    """
    quiz = res["quiz"]
    token = res["token"]
    
    # Send the quiz_id and token to kahiindb
    if quiz.endswith(".khn"):
        quiz = quiz[:-4]
    files = {
        'token': (None, token),
        'filename': (None, quiz),
        'file': (quiz, open(f"quiz/{quiz}.khn", 'rb'))
    }
    response = requests.post(kahiin_db_address + "/quiz", files=files)
    if json.loads(response.text) == {"message": "Quiz uploaded successfully"}:
        await ws_manager.emit("quizUploaded", to=websocket)
    else:
        raise Exception("Error while uploading the quiz")
    
def already_in_drawer(question):
    """
    Check if a question is already in the drawer.
    
    Parameters:
        question (dict): The question to check.
    """
    with relative_open("drawer.json", "r") as f:
        drawer = json.load(f)
        for q in drawer:
            if q["title"] == question["title"] and q["type"] == question["type"] and q["duration"] == question["duration"]:
                return True
    return False

@ws_manager.on("downloadQuestion")
@verification_wrapper
async def handle_download_question(websocket, res) -> None:
    """
    Handle the download of a question from the drawer.
    
    Parameters:
        websocket (WebSocket): The websocket of the client.
        res (dict): Dictionary containing {passcode, question}
    """
    question = res["question"]
    with relative_open("drawer.json", "r") as f:
        drawer = json.load(f)
        if not already_in_drawer(question):
            drawer.append(question)
            with relative_open("drawer.json", "w") as f:
                json.dump(drawer, f, indent=4)
            await ws_manager.emit("questionDownloaded", drawer, to=websocket)

def download_file(token, file_id, output_filename):
    """
    Download a file from kahiindb.
    
    Parameters:
        token (str): The token to use for the download.
        file_id (str): The id of the file to download.
        output_filename (str): The name of the file to save the download to.
    """
    full_url = f"{kahiin_db_address}/download?token={token}&id_file={file_id}"
    response = requests.get(full_url)
    if response.status_code == 200:
        with open(output_filename, 'wb') as file:
            file.write(response.content)
            return True
    else:
        return False

def get_quiz_name_from_id(token, quiz_id):
    """
    Get the name of a quiz from its id.

    Parameters:
        token (str): The token to use for the download.
        quiz_id (str): The id of the quiz to get the name of.
    """
    params = {
        "token": token,
        "id_file": quiz_id
    }
    response = requests.get(f"{kahiin_db_address}/quiz", params=params)
    if response.status_code != 200:
        return "InternalError"
    return response.json()[0]["name"]

@ws_manager.on("downloadQuiz")
@verification_wrapper
async def handle_download_quiz(websocket, res) -> None:
    quiz_id = res["quiz_id"]
    token = res["token"]
    quiz_name = get_quiz_name_from_id(token, quiz_id)
    if quiz_name == "InternalError":
        await ws_manager.emit("error", "InternalError", to=websocket)
    if download_file(token, quiz_id, f"quiz/{quiz_name}.khn"):
        quiz_list = os.listdir(os.path.join(os.path.dirname(__file__), "quiz"))
        quiz_list.sort()
        quiz_list = [q[:-4] for q in quiz_list if q != ".gitkeep"]
        for quiz in quiz_list:
            if quiz.endswith(".khn"):
                quiz_list[quiz_list.index(quiz)] = quiz[:-4]
        await ws_manager.emit("quizDownloaded", quiz_list, to=websocket)
    else:
        await ws_manager.emit("error", "QuizNotFound", to=websocket)

@ws_manager.on("restartAll")
@verification_wrapper
async def handle_restart_all(websocket, res) -> None:
    """
    Handle the restart of a new game.

    Parameters:
        websocket (WebSocket): The websocket of the client.
        res (dict): Dictionary containing {passcode}
    """
    global kahiin_db_address, quiz, sleep_manager, client_list, board_list, host_list, game
    for client in client_list + board_list + host_list:
        await ws_manager.emit("restart", to=client.websocket)
    await ws_manager.stop()

    kahiin_db_address = "http://localhost:5000"
    quiz = Quiz()
    sleep_manager = SleepManager()
    client_list = []
    board_list = []
    host_list = []
    game = Game()

    start_flask()
    
def start_flask():
    # ws_manager.add_background_task(background_task())
    asyncio.run(ws_manager.start())

# Create personnal files if they don't exist
if not os.path.exists(os.path.join(os.path.dirname(__file__), "drawer.json")):
    with relative_open("drawer.json", "w") as f:
        json.dump([], f)
if not os.path.exists(os.path.join(os.path.dirname(__file__), "settings.json")):
    with relative_open("settings.json", "w") as f:
        # Default admin password is 1234
        json.dump({"language": "en", "dyslexicMode": False, "adminPassword": "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4", "randomOrder": False, "endOnAllAnswered": True}, f)
if not os.path.exists(os.path.join(os.path.dirname(__file__), "quiz")):
    os.makedirs(os.path.join(os.path.dirname(__file__), "quiz"))

if __name__ == '__main__':
    start_flask()

