const socket = io();
var question_count = 0;
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

function startSession() {
  const passcode = document.getElementById("passcode").value;
  document.getElementById("start").style.display = "none";
  document.getElementById("next").style.display = "block";
  socket.emit("startSession", passcode);
  question_count = 0;
  socket.emit("nextQuestion", {passcode, question_count});
}
function nextQuestion() {
  const passcode = document.getElementById("passcode").value;
  question_count += 1;
  socket.emit("nextQuestion", {passcode, question_count});
}