#!/bin/bash

# Detect operating system
if [[ "$(uname)" == "Linux" ]]; then
    if [[ -f /data/data/com.termux/files/usr/bin/bash ]]; then
        # Termux
        pkg update
        yes | pkg upgrade
        yes | pkg install python3
        pip install flask
        pip install flask-socketio
        python3 app.py 1234
    elif command -v apt >/dev/null 2>&1; then
        # Debian Based
        echo 
        echo Welcome to $(grep -oP '^NAME="\K[^"]+' /etc/os-release).
        echo To run this script, you need to be root.
        echo
        sudo apt update
        yes | sudo apt install python3 
        yes | sudo apt install python3-pip
        yes | sudo apt install python$(python3 -V 2>&1 | awk -F'[ .]' '{print $2"."$3}')-venv
        python3 -m venv venv
        source venv/bin/activate
        yes | sudo apt install python3
        yes | pip install flask
        yes | pip install flask-socketio
        yes | pip install simple-websocket
        python3 app.py 1234
    else
        echo "OS not supported"
    fi
else
    echo "This OS is not Linux"
fi