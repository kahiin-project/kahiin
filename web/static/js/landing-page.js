const socket = io();

socket.emit("getSettings", "");
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
  console.log("Glossary received:", glossary);
  document.getElementById("main-container").innerHTML = `
    <img src="/static/icon/app-icon.png" />
    <h1>kahiin</h1>

    <a href="host">${glossary["Host"]}</a>
    <a href="guest">${glossary["Join"]}</a>
    <a href="board">${glossary["Board"]}</a>
  `;
   
});