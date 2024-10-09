const socket = io();
var question_count = 0;

function hashSHA256(message) {
  const hash = CryptoJS.SHA256(message);
  return hash.toString(CryptoJS.enc.Hex);
}

function submitPasscode() {
    const passcode = hashSHA256(document.getElementById("passcode").value);
    document.getElementById("form").style.display = "none";
    document.getElementById("start_game").style.display = "block"
    socket.emit("hostConnect", passcode);
    socket.on("error", (res) => {
      document.getElementById("passcode").value = "";
      document.getElementById("error").style.display = "block";
      document.getElementById("error").innerHTML = res;
      document.getElementById("form").style.display = "block";
      document.getElementById("start_game").style.display = "none";
      document.getElementById("next_question").style.display = "none";
    });
}

function startSession() {
  const passcode = hashSHA256(document.getElementById("passcode").value);
  document.getElementById("start_game").style.display = "none";
  document.getElementById("next_question").style.display = "block";
  socket.emit("startSession", passcode);
  question_count = 0;
  socket.emit("nextQuestion", {passcode, question_count});
  document.getElementById("next_question").style.display = "none";
}
function nextQuestion() {
  const passcode = hashSHA256(document.getElementById("passcode").value);
  question_count += 1;
  socket.emit("nextQuestion", {passcode, question_count});
}
function showLeaderboard() {
  const passcode = hashSHA256(document.getElementById("passcode").value);
  socket.emit("showLeaderboard", passcode);
}

socket.on("questionEnd", (res) => {
  document.getElementById("next_question").style.display = "block";
  document.getElementById("show_leaderboard").style.display = "block";
});

socket.on("gameEnd", (res) => {
  document.getElementById("next_question").style.display = "none";
  document.getElementById("show_leaderboard").style.display = "none";
  question_count = 0;
  document.getElementById("start_game").style.display = "block";
});