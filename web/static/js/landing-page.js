function init() {
  const wsUrl = `ws://${window.location.hostname}:8000?t=${Date.now()}`;
  const socket = new WebSocketHandler(wsUrl);
  setupSocketListeners(socket);
}

// ---------------------- Socket.io Main -------------------------

function setupSocketListeners(socket) {


  socket.on("settings", (res) => {
      const elements = document.querySelectorAll('*');
      elements.forEach(element => {
        if (res.dyslexicMode) {
          element.classList.add('dyslexic');
        } else {
          element.classList.remove('dyslexic');
        }
      });
  });

}

document.addEventListener('DOMContentLoaded', init);