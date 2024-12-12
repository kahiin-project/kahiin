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

try:
    from kahiin_websocket import ws_manager, flask_app as app
except ImportError:
    from .kahiin_websocket import ws_manager, flask_app as app
    
def get_settings() -> dict:
    with open("settings.json", "r") as f:
        return json.load(f)
    
def get_passcode():
    return get_settings()["adminPassword"]

def get_glossary() -> dict:
    with open("glossary.json", "r") as g:
        with open("settings.json", "r") as s:
            return json.load(g)[json.load(s)["language"]]



# Initialize Flask application and ws_manager
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
        self._stop_event = asyncio.Event()
        self._is_sleeping = False
        self._current_task = None
        self._duration = 0
        self._time_start = 0
        self._pause_time = 0
        self._is_paused = False

    async def sleep(self, duration):
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
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
        self._is_sleeping = False
        self._is_paused = False

    def pause(self):
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
            self._pause_time = time.time()
        self._is_paused = True

    def is_paused(self):
        return self._is_paused

    def reset(self):
        self._stop_event.clear()
        self._current_task = None
        self._pause_time = 0

    def current(self):
        if self._is_paused:
            elapsed = self._pause_time - self._time_start
            return int(self._duration - elapsed)
        elapsed = time.time() - self._time_start
        return int(self._duration - elapsed)

    def running(self):
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
    def __init__(self, websocket, username: str, connections: list) -> None:
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
    def __init__(self, websocket, connections: list) -> None:
        super().__init__(websocket, connections)


host_list = []
# List to keep track of host connections


class Host(GameTab):
    def __init__(self, websocket, connections: list) -> None:
        super().__init__(websocket, connections)


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
    """Handle client connection events."""
    data = get_settings()
    # Remove all settings except dyslexic mode before sending
    filtered_data = {key: value for key, value in data.items() if key == "dyslexicMode" or key == "language"}
    await ws_manager.emit("settings", filtered_data, to=websocket)
    await ws_manager.emit("glossary", get_glossary(), to=websocket)

@ws_manager.on('boardConnect')
@verification_wrapper
async def handle_board_connect(websocket, passcode: str) -> None:
    """
    Handle board connection requests.

    :param code: Passcode provided by the board
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
    qr_img = qrcodemaker.make("http://{IP}/guest")
    qr_img = qr_img.convert("LA")
    data = qr_img.getdata()
    new_data = [(255, 0) if item == (255,255) else item for item in data]
    qr_img.putdata(new_data)
    buffered = BytesIO()
    qr_img.save(buffered, format="PNG")
    qr_img_str = b64encode(buffered.getvalue()).decode()
    await ws_manager.emit('qrcode', f"data:image/png;base64,{qr_img_str}", to=websocket)
    for c in client_list:
        await ws_manager.emit('newUser', data={'username': c.username}, to=websocket)


@ws_manager.on('hostConnect')
@verification_wrapper
async def handle_host_connect(websocket, passcode: str) -> None:
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
    Handle new user connection requests.

    :param username: Username provided by the new user
    """
    # Check if the username is already taken
    if game.running:
        await ws_manager.emit('error', "GameAlreadyRunning", to=websocket)
        return
    if any(c.username == username for c in client_list):
        await ws_manager.emit('error', "UsernameAlreadyTaken", to=websocket)
        return
    if any(client.websocket == websocket for client in client_list):
        await ws_manager.emit('error', "UserAlreadyConnected", to=websocket)
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
    """Handle client disconnection events."""
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
async def handle_start_game(websocket, code: str) -> None:
    if game.running:
        await ws_manager.emit('error', "GameAlreadyRunning", to=websocket)
        return
    if questionary.root is None:
        await ws_manager.emit('error', "NoQuestionary", to=websocket)
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
    try:
        settings = get_settings()
        question_number = res["question_count"]
        
        # Reset all old user answer for the new question
        for client in client_list:
            client.user_answer = ""
            
        if len(client_list) == 0:
            await ws_manager.emit('error', "NoUsersConnected", to=websocket)
            return
            
        if question_number == len(questionary.questionary["questions"]):
            data = {
                "game_lead": game.display()[0],
            }
            for client in client_list + board_list + host_list:
                try:
                    await ws_manager.emit("gameEnd", data, to=client.websocket)
                except Exception:
                    continue
            return
            
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
                if sleep_manager.running():
                    await end_question(question["correct_answers"])
            except Exception:
                pass

        asyncio.create_task(timer_task())

    except Exception as e:
        print(f"Error in handle_next_question: {str(e)}")

async def end_question(correct_answers):
    """Helper function to handle question ending logic"""
    try:
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

    except Exception as e:
        print(f"Error in end_question: {str(e)}")



@ws_manager.on('showLeaderboard')
@verification_wrapper
async def handle_show_leaderboard(websocket, code: str) -> None:
    game_lead, promoted_users = game.display()
    for client in board_list:
        await ws_manager.emit('leaderboard', {
            "promoted_users": promoted_users, "game_lead": game_lead}, to=client.websocket)

@ws_manager.on('sendAnswer')
async def handle_answer(websocket, res) -> None:
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
async def handle_get_spreadsheet(websocket, res) -> None:
    csv = []
    csv.append("Username,Score,MaxPossibleScore")
    client_list.sort(key=lambda x: x.score, reverse=True)
    for client in client_list:
        csv.append(f"{client.username},{client.score},{500*len(questionary.questionary['questions'])}")
    data = {
            "csv" : "\n".join(csv), 
            "questionnaire_name": questionary.questionary["title"]
            }
    
    for host in host_list:
        await ws_manager.emit('spreadsheet', data, to=host.websocket)
        
## ----------------- ws_manager Configuration Events ----------------- ##

@ws_manager.on('sendNewQuestionary')
@verification_wrapper
async def handle_new_questionary(websocket, res) -> None:
    """
    Handle requests to send the questionary to the host.

    :param res: Dictionary containing the passcode and the questionary
    """
    # rename automatically the file to khn
    filename = filename.split(".")[0] + ".khn"
    with open(os.path.join("questionnaire", res["filename"]), "wb") as f:
        f.write(res["questionaire_data"])
    
@ws_manager.on('listQuestionary')
@verification_wrapper
async def handle_list_questionary(websocket, res) -> None:
    """
    Handle requests to list all the questionaries.

    :param code: Passcode provided by the host
    """
    questionaries = os.listdir("questionnaire")
    questionaries.sort()
    await ws_manager.emit("ListOfQuestionary", {"questionaries": questionaries}, to=websocket)
    
@ws_manager.on('selectQuestionary')
@verification_wrapper
async def handle_select_questionary(websocket, res) -> None:
    questionary.tree = ET.parse(os.path.join("questionnaire", res["questionnaire_name"]))
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
    
@ws_manager.on('kickPlayer')
@verification_wrapper
async def handle_kick_player(websocket,res) -> None:
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
async def handle_stop_game(websocket, code: str) -> None:
    try:
        if not game.running:
            await ws_manager.emit("error", "GameNotRunning", to=websocket)
            return
        if not sleep_manager.running():
            await ws_manager.emit("error", "QuestionNotRunning", to=websocket)
            return

        sleep_manager.stop()
        
        await end_question(client_list[0].expected_response)
        
    except Exception as e:
        print(f"Error in handle_stop_game: {str(e)}")

@ws_manager.on('pauseQuestion') 
@verification_wrapper
async def handle_pause_game(websocket, code: str) -> None:
    try:
        if not game.running:
            await ws_manager.emit("error", "GameNotRunning", to=websocket)
            return

        sleep_manager.pause()
        for client in board_list + client_list:
            await ws_manager.emit("pauseQuestion", to=client.websocket)
            
    except Exception as e:
        print(f"Error in handle_pause_game: {str(e)}")

@ws_manager.on('unpauseQuestion')
@verification_wrapper 
async def handle_unpause_game(websocket, code: str) -> None:
    try:
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

    except Exception as e:
        print(f"Error in handle_unpause_game: {str(e)}")

@ws_manager.on('createQuestionary')
@verification_wrapper
async def handle_create_questionary(websocket, res) -> None:
    list_questionaries = os.listdir("questionnaire")
    questionary_index = 1
    while f"new_questionnaire{questionary_index}.khn" in list_questionaries :
            questionary_index += 1
    file = open(f"questionnaire/new_questionnaire{questionary_index}.khn","w")
    file.close()
    await ws_manager.emit("editingQuestionnary",f"new_questionnaire{questionary_index}.khn", to=websocket)

@ws_manager.on('deleteQuestionary')
@verification_wrapper
async def handle_delete_questionary(websocket, res) -> None:
    os.remove("questionnaire/"+res["questionnaire_name"])
    await ws_manager.emit("deletedQuestionnary", to=websocket)

@ws_manager.on("editQuestionaryName")
@verification_wrapper
async def handle_edit_questionnaire_name(websocket, res) -> None:
    list_questionaries = os.listdir("questionnaire")
    forbiden_characters = '/\|,.;:!?*"><'
    invalid_characters = False
    for character in forbiden_characters :
        invalid_characters += character in res["new_name"][:-4]
    if len(res["new_name"]) <= 4:
        await ws_manager.emit('error', "EmptyName", to=websocket)
    elif res["new_name"][-4:] != ".khn":
        await ws_manager.emit('error', "InvalidExtension", to=websocket)
    elif invalid_characters :
        await ws_manager.emit('error', "SpecialCharacters")
    elif res["new_name"] in list_questionaries :
        await ws_manager.emit('error', "AlreadyExist", to=websocket)
    else :
        os.rename("questionnaire/" + res["old_name"], "questionnaire/"+res["new_name"])
        await ws_manager.emit("editingQuestionnary",res["new_name"], to=websocket)
    

@ws_manager.on("getSettings")
async def handle_get_settings(websocket, code: str) -> None:
    """Handle requests to get settings."""
    if get_passcode == code:
        await ws_manager.emit("settings", get_settings(), to=websocket)
    else:
        data = get_settings()
        del data["adminPassword"]
        await ws_manager.emit("settings", data, to=websocket)

@ws_manager.on("setSettings")
@verification_wrapper
async def handle_set_settings(websocket, res) -> None:
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

    # if it's dyslexic mode, send the new settings
    settings = get_settings()
    if res["settings"].get("dyslexicMode") is not None:
        for client in host_list+client_list+board_list:
            await ws_manager.emit("settings", settings, to=client.websocket)

@ws_manager.on("getWholeQuestionnaire")
@verification_wrapper
async def handle_get_whole_questionnaire(websocket, res) -> None:
    """Handle requests to get the whole questionnaire."""
    code = res["passcode"]
    questionnaire_name = res["questionnaire_name"]
    if get_passcode() == code:
        with open(f"questionnaire/{questionnaire_name}", "rb") as f:
            xml_content = f.read()
            dict_content = xmltodict.parse(xml_content)

            questionnary = {
                "subject": dict_content["questionary"]["subject"],
                "language": dict_content["questionary"]["language"],
                "title": dict_content["questionary"]["title"],
                "questions": dict_content["questionary"]["questions"][0]["question"]
            }

            json_content = json.dumps(questionnary)
            await ws_manager.emit("wholeQuestionnaire", json_content, to=websocket)
    else:
        await ws_manager.emit("error", "InvalidPasscode", to=websocket)

@ws_manager.on("moveQuestion")
@verification_wrapper
async def handle_move_question(websocket, res) -> None:
    """Handle requests to move a question."""
    code = res["passcode"]
    if get_passcode() == code:
        from_index = res["from"]
        to_index = res["to"]
        questionnaire_name = res["questionnaire_name"]
        
        with open(f"questionnaire/{questionnaire_name}", "rb") as f:
            xml_content = f.read()
            dict_content = xmltodict.parse(xml_content)
            questions = dict_content["questionary"]["questions"][0]["question"]

        # Move the question from from_index to to_index
        questions.insert(to_index, questions.pop(from_index))

        with open(f"questionnaire/{questionnaire_name}", "wb") as f:
            f.write(xmltodict.unparse(dict_content).encode())

        questionnary = {
            "subject": dict_content["questionary"]["subject"],
            "language": dict_content["questionary"]["language"],
            "title": dict_content["questionary"]["title"],
            "questions": questions
        }

        json_content = json.dumps(questionnary)
        await ws_manager.emit("wholeQuestionnaire", json_content, to=websocket)
    else:
        await ws_manager.emit("error", "InvalidPasscode", to=websocket)

@ws_manager.on("copyQuestion")
@verification_wrapper
async def handle_copy_question(websocket, res) -> None:
    """Handle requests to copy a question."""
    code = res["passcode"]
    if get_passcode() == code:
        question_to_copy = res["question"]
        question_to_copy["@duration"] = question_to_copy.pop("duration")
        question_to_copy["@type"] = question_to_copy.pop("type")

        target_index = res["to"]
        questionnaire_name = res["questionnaire_name"]
        
        with open(f"questionnaire/{questionnaire_name}", "rb") as f:
            xml_content = f.read()
            dict_content = xmltodict.parse(xml_content)
            questions = dict_content["questionary"]["questions"][0]["question"]

        # Copy the question to the target index
        questions.insert(target_index, question_to_copy)

        # Reformat answers
        for question in questions:
            if "shown_answers" in question:
                shown_answers = question["shown_answers"]
                if isinstance(shown_answers, list):
                    question["shown_answers"] = {"answer": shown_answers}
            if "correct_answers" in question:
                correct_answers = question["correct_answers"]
                if isinstance(correct_answers, list):
                    question["correct_answers"] = {"answer": correct_answers}

        with open(f"questionnaire/{questionnaire_name}", "wb") as f:
            f.write(xmltodict.unparse(dict_content).encode())

        questionnary = {
            "subject": dict_content["questionary"]["subject"],
            "language": dict_content["questionary"]["language"],
            "title": dict_content["questionary"]["title"],
            "questions": questions
        }

        json_content = json.dumps(questionnary)
        await ws_manager.emit("wholeQuestionnaire", json_content, to=websocket)
    else:
        await ws_manager.emit("error", "InvalidPasscode", to=websocket)

@ws_manager.on("deleteQuestion")
@verification_wrapper
async def handle_delete_question(websocket, res) -> None:
    """Handle requests to delete a question."""
    code = res["passcode"]
    if get_passcode() == code:
        index = res["index"]
        questionnaire_name = res["questionnaire_name"]
        
        with open(f"questionnaire/{questionnaire_name}", "rb") as f:
            xml_content = f.read()
            dict_content = xmltodict.parse(xml_content)
            questions = dict_content["questionary"]["questions"][0]["question"]

        # Delete the question at the specified index
        del questions[index]

        with open(f"questionnaire/{questionnaire_name}", "wb") as f:
            f.write(xmltodict.unparse(dict_content).encode())

        questionnary = {
            "subject": dict_content["questionary"]["subject"],
            "language": dict_content["questionary"]["language"],
            "title": dict_content["questionary"]["title"],
            "questions": questions
        }

        json_content = json.dumps(questionnary)
        await ws_manager.emit("wholeQuestionnaire", json_content, to=websocket)
    else:
        await ws_manager.emit("error", "InvalidPasscode", to=websocket)

@ws_manager.on("getDrawer")
@verification_wrapper
async def handle_get_drawer(websocket, res) -> None:
    """Handle requests to get the drawer."""
    code = res["passcode"]
    if get_passcode() == code:
        with open("drawer.json", "r") as f:
            drawer = json.load(f)
            await ws_manager.emit("drawer", drawer, to=websocket)
    else:
        await ws_manager.emit("error", "InvalidPasscode", to=websocket)

def start_flask():
    # ws_manager.add_background_task(background_task())
    asyncio.run(ws_manager.start())

if __name__ == '__main__':
    start_flask()
else:
    os.chdir(os.path.dirname(__file__))
