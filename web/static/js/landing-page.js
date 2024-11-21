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

  socket.on("language", (res) => {
    glossary = res;
    const body = document.getElementById("body");
    const regex = /\$\{glossary\["([A-Za-z]+)"\]\}/g;
    const replaced = body.innerHTML.replace(regex, (match, key) => {
      return glossary[key] || match;
    });
    body.innerHTML = replaced;
    document.getElementById("body").style.display = "block";
  });
}

document.addEventListener('DOMContentLoaded', init);