const socket = io();
var questionCount = 0;
function Submit() {
    const passcode = document.getElementById("passcode").value;
    document.getElementById("form").style.display = "none";
    document.getElementById("start").style.display = "block"
    socket.emit("hostConnect", passcode);
    socket.on("error", (res) => {
      alert(res);
      document.getElementById("form").style.display = "block";
      document.getElementById("start").style.display = "none"
    });
}

function StartSession() {
  const passcode = document.getElementById("passcode").value;
  document.getElementById("start").style.display = "none";
  document.getElementById("next").style.display = "block";
  socket.emit("startSession", passcode);
}
function NextQuestion() {
  const passcode = document.getElementById("passcode").value;
  questionCount += 1;
  socket.emit("nextQuestion", {passcode, questionCount});
}