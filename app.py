from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import json
import sys

#passcode = sys.argv[1]
passcode = 'a'
with open('config.json') as config_file:
    config = json.load(config_file)

app = Flask(__name__)
socketio = SocketIO(app)

app.static_folder = 'web/static'
app.template_folder = 'web/templates'

clients = []


class Client:
    def __init__(self, sid, username):
        self.sid = sid
        self.username = username
        clients.append(self)

    def __del__(self):
        clients.remove(self)

display_list = []

class Display:
    def __init__(self, sid, code):
        self.sid = sid
        self.code = code
        display_list.append(self)
    
    def __del__(self):
        display_list.remove(self)

@app.route('/admin')
def route_admin():
    return render_template('admin.html')


@socketio.on('message')
def handle_message(message):
    emit('message', message)


@app.route('/homepage')
def route_homepage():
    return render_template('homepage.html')

@app.route('/display')
def route_display_page():
    return render_template('display-page.html')

@socketio.on('displayConnect')
def handle_display_connect(code):
    if code == passcode:
        session = Display(request.sid, code)
        for c in clients:
            emit('newUser', {'username': c.username, 'sid': c.sid})
    else:
        emit('error', "Vous n'avez pas entré le bon passcode")

@socketio.on('addUser')
def handle_connect(username):
    sessid = request.sid
    if any(c.username == username for c in clients):
        emit('error', 'Nom d\'utilisateur déjà pris')
        return
    elif any(c.sid == sessid for c in clients):
        emit('error', 'Vous êtes déjà connecté')
    session = Client(sessid, username)
    emit('newUser', {'username': session.username,
         'id': session.sid}, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    sessid = request.sid
    for c in clients:
        if c.sid == sessid:
            for d in display_list:
                emit('rmUser', {'username' : c.username, 'passcode' : passcode}, to=d.sid)
                del(c)
                return

    for d in display_list:
        if d.sid == sessid:
            del(d)


@socketio.on('edit')
def handle_edit(message: dict):
    if message['passcode'] == passcode:
        config[message['key']] = message['value']
        with open('config.json', 'w') as config_file:
            json.dump(config, config_file)
        emit('edit', message)
    else:
        emit('error', 'Invalid passcode')


@app.route('/')
def route_landing_page():
    return render_template('landing-page.html')

if __name__ == '__main__':
    socketio.run(app, debug=True, port=8080, host="0.0.0.0")
