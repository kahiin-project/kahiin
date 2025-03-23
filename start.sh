#!/bin/bash

if [[ "$(uname)" == "Linux" ]]; then
    if [[ -f /data/data/com.termux/files/usr/bin/bash ]]; then
        echo "Detected Termux environment. Setting up the environment..."
        pkg update -q
        pkg upgrade -q
        pkg install -y -q python3
        pip install -r requirements.txt -q
        echo "Starting the Kahiin server..."
        python3 app.py 1234
    elif command -v apt >/dev/null 2>&1; then
        echo "Detected Debian based system. Setting up the environment..."
        sudo apt update -qq
        sudo apt install -y -qq python3 python3-pip python3-venv
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt -q
        echo "Starting the Kahiin server..."
        python3 app.py 1234
    elif command -v pacman >/dev/null 2>&1; then
        echo "Detected Arch based system. Setting up the environment..."
        sudo pacman -Syu --noconfirm > /dev/null
        sudo pacman -S --noconfirm python3 python-pip python-virtualenv > /dev/null
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt -q
        echo "Starting the Kahiin server..."
        python3 app.py 1234
    else
        echo "OS not supported"
    fi
else
    echo "This OS is not Linux"
fi