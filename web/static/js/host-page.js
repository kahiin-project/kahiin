const socket = io();
var question_count = 0;

function hashSHA256(message) {
  const hash = CryptoJS.SHA256(message);
  return hash.toString(CryptoJS.enc.Hex);
}

function submitPasscode() {
    const passcode = hashSHA256(document.getElementById("passcode").value);
    document.getElementById("form").style.display = "none";
    document.getElementById("start_game").style.display = "block";
    document.getElementById("nav").style.display = "block";
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

function navigate(index){
  for(let i = 0; i < 5; i++){
    document.getElementById(`nav_button_${i}`).style.borderLeft = "none";
  }
  document.getElementById(`nav_button_${index}`).style.borderLeft = "solid #494949 5px";
  switch (index) {
    case 0:
      document.getElementById("nav_content").innerHTML = `
        
      `;
      break;
    case 1:
      document.getElementById("nav_content").innerHTML = `
        
      `;
      break;
    case 2:
      document.getElementById("nav_content").innerHTML = `
        <h1>Kahiin DB</h1>
      `;
      break;
    case 3:
      document.getElementById("nav_content").innerHTML = `
        <h1>Settings</h1>
      `;
      break;
    case 4:
      document.getElementById("nav_content").innerHTML = `
        <h1>Account</h1>
      `;
      break;
    default:
      console.log("Invalid index incoming.");
  }
}