const socket = io();
var question_count = 0;

function hashSHA256(message) {
  const hash = CryptoJS.SHA256(message);
  return hash.toString(CryptoJS.enc.Hex);
}

function Submit() {
    const passcode = hashSHA256(document.getElementById("passcode").value);
    document.getElementById("form").style.display = "none";
    document.getElementById("start").style.display = "block"
    socket.emit("hostConnect", passcode);
    socket.on("error", (res) => {
      document.getElementById("passcode").value = "";
      document.getElementById("error").style.display = "block";
      document.getElementById("error").innerHTML = res;
      document.getElementById("form").style.display = "block";
      document.getElementById("start").style.display = "none";
      document.getElementById("next").style.display = "none";
    });
}

function startSession() {
  const passcode = hashSHA256(document.getElementById("passcode").value);
  document.getElementById("start").style.display = "none";
  document.getElementById("next").style.display = "block";
  socket.emit("startSession", passcode);
  question_count = 0;
  socket.emit("nextQuestion", {passcode, question_count});
}
function nextQuestion() {
  const passcode = hashSHA256(document.getElementById("passcode").value);
  question_count += 1;
  socket.emit("nextQuestion", {passcode, question_count});
}