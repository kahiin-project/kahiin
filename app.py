from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import json
import sys

passcode = sys.argv[1]

with open('config.json') as config_file:
    config = json.load(config_file)

app = Flask(__name__)
socketio = SocketIO(app)

app.static_folder = 'web/static'
app.template_folder = 'web/templates'


@app.route('/admin')
def route_admin():
    return render_template('admin.html')


@socketio.on('message')
def handle_message(message):
    emit('message', message)


@app.route('/')
def route_landing_page():
    return render_template('landing-page.html')


if __name__ == '__main__':
    socketio.run(app, debug=True)
