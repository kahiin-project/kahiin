const socket = io();

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
  for (const key in glossary) {
    document.getElementById("body").innerHTML = document.getElementById("body").innerHTML.replace(`\${glossary["${key}"]}`, glossary[key]);
  }
});