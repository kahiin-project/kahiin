# kahiin

An open source game for school classes, with server runnable on any terminal.

### Installation

#### Easy way (Docker)

1. Install [Docker](https://docs.docker.com/get-docker/)
2. Run the following command:
```bash
docker build -t kahiin .
docker run --network=host kahiin
```

#### Manual way (Only for Linux)
1. Install [Python](https://www.python.org/downloads/)
2. Run the installation script:
```bash
bash start.sh
```

### Credits

- Javascript libraries
    - **[Socket.IO](https://cdn.socket.io/4.7.5/socket.io.min.js)**: Used for server-client communication.

    - **[CryptoJS 4.1.1](https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js)**: Used to hash passwords.

    - **Application Icon**: Made using [Microsoft Copilot](https://en.wikipedia.org/wiki/Microsoft_Copilot)

    - **[Marked](https://cdn.jsdelivr.net/npm/marked@1.1.0/marked.min.js)**: Used for rendering Markdown.

    - **KaTeX**: Used for rendering mathematical formulas.
        - [KaTeX CSS](https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css)
        - [KaTeX JS](https://cdn.jsdelivr.net/npm/katex/dist/katex.min.js)
        - [KaTeX Auto-render](https://cdn.jsdelivr.net/npm/katex/dist/contrib/auto-render.min.js)

- Python modules
    - **[Flask](https://palletsprojects.com/p/flask/)**: The webframework hosting the server.

    - **[Flask-SocketIO](https://flask-socketio.readthedocs.io/en/latest/)**: Handle socket.IO requests

    - **[qrcode](https://github.com/lincolnloop/python-qrcode)**: Used to generate the qrcode in the board page.
