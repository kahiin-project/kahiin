const socket = io();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function Submit() {
  const passcode = document.getElementById("passcode").value;

  socket.emit("boardConnect", passcode);
  document.getElementById("form").style.display = "none";
  document.getElementById("list").style.display = "block";

  socket.on("newUser", (res) => {
    const li = document.createElement("li");
    li.appendChild(document.createTextNode(res.username));
    document.getElementById("users").appendChild(li);
  });

  socket.on("rmUser", (res) => {
    if (res.passcode == passcode) {
      const usersList = document.getElementById("users");
      const items = usersList.getElementsByTagName("li");
      for (let i = 0; i < items.length; i++) {
        if (items[i].textContent === res.username) {
          usersList.removeChild(items[i]);
          break;
        }
      }
    }
  });

  socket.on("error", (res) => {
    alert(res);
    document.getElementById("list").style.display = "none";
    document.getElementById("form").style.display = "block";
  });
}

function Display() {
  socket.on("questionStart", (res) => {
    document.getElementById("question").style.display = "block";
    document.getElementById("question").innerText = res.question["title"];
    document.getElementById("timer").innerText = "0";
    duration = res.question["duration"];
  });

  socket.on("questionEnd", (res) => {
    document.getElementById("question").style.display = "none";
  });
}
