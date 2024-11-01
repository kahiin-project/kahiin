const socket = io();

// ---------------------- Socket.io Main -------------------------

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