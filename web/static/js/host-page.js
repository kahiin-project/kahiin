const socket = io();

// ---------------------- Variables -------------------------
var question_count = 0;
var passcode = "";
var glossary = {};

// ---------------------- Functions -------------------------

function hashSHA256(message) {
  const hash = CryptoJS.SHA256(message);
  return hash.toString(CryptoJS.enc.Hex);
}

function submitPasscode() {
    passcode = hashSHA256(document.getElementById("passcode").value);
    socket.emit("hostConnect", passcode);
}

function startSession() {
  document.getElementById("start_game").style.display = "none";
  document.getElementById("next_question").style.display = "block";
  socket.emit("startSession", passcode);
  question_count = 0;
  socket.emit("nextQuestion", {passcode, question_count});
  document.getElementById("next_question").style.display = "none";
}

function nextQuestion() {
  question_count += 1;
  document.getElementById("next_question").style.display = "none";
  document.getElementById("show_leaderboard").style.display = "none";
  socket.emit("nextQuestion", {passcode, question_count});
}

function showLeaderboard() {
  socket.emit("showLeaderboard", passcode);
}

function kickPlayer() {
  playerName = document.getElementById("kick_player_name").value;
  socket.emit("kickPlayer", {passcode : passcode, username : playerName});
  document.getElementById("kick_player_name").value = "";
  
}

function applyNewPassword() {
  if(document.getElementById('new_password').value == document.getElementById('repeat_new_password').value) {
    socket.emit('setSettings', {passcode: passcode, settings: {adminPassword: hashSHA256(document.getElementById('new_password').value)}});
  }
  document.getElementById('new_password').value = "";
  document.getElementById('repeat_new_password').value = "";
  alert(glossary["PasswordChanged"]);
}

function changeLanguage() {
  socket.emit('setSettings', {passcode: passcode, settings: {language: document.getElementById('language').value}}); location.reload();
}

function editSettingsButton(setting) {
  socket.emit('setSettings', {passcode
    , settings: {[setting]: document.getElementById(`${setting}Button`).innerHTML != "ON"}});
}

function navigate(index){
  for(let i = 0; i < 5; i++){
    document.getElementById(`nav_button_${i}`).style.borderLeft = "none";
  }
  document.getElementById(`nav_button_${index}`).style.borderLeft = "solid #494949 5px";
  document.getElementById("play_div").style.display = "none";
  document.getElementById("settings_div").style.display = "none";
  switch (index) {
    case 0:
      document.getElementById("play_div").style.display = "block";
      document.getElementById("start_game").style.display = "block";
      document.getElementById("kick_player_name").style.display = "block";
      document.getElementById("kick_player_button").style.display = "block";
      break;
    case 1:
      // document.getElementById("settings_div").innerHTML = `
      // `;
      break;
    case 2:
      // document.getElementById("settings_div").innerHTML = `
      //   <h1>Kahiin DB</h1>
      // `;
      break;
    case 3:
      document.getElementById("settings_div").style.display = "block";
      break
    case 4:
      // document.getElementById("settings_div").innerHTML = `
      //   <h1>${glossary["Account"]}</h1>
      // `;
      break;
    default:
      console.log("Invalid index incoming.");
  }
}

// ---------------------- Socket.io Main -------------------------

socket.on("error", (res) => {
  if (res=="InvalidPasscode") {
    document.getElementById("passcode").value = "";
    document.getElementById("error").style.display = "block";
    document.getElementById("error").innerHTML = glossary[res];
    document.getElementById("form").style.display = "block";
    document.getElementById("start_game").style.display = "none";
    document.getElementById("next_question").style.display = "none";
    document.getElementById("nav").style.display = "none";
  } else {
    alert(glossary[res]);
    document.getElementById("error").style.display = "block";
    document.getElementById("error").innerHTML = glossary[res];
  }
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
  document.getElementById("passcode").placeholder = glossary["Passcode"];
});

socket.on("settings", (res) => {
  document.getElementById("language").value = "fr" 
  dyslexicModeButton = document.getElementById("dyslexicModeButton");
  dyslexicModeButton.className = res.dyslexicMode ? "on" : "off";
  dyslexicModeButton.innerHTML = res.dyslexicMode ? "ON" : "OFF";

  randomOrderButton = document.getElementById("randomOrderButton");
  randomOrderButton.className = res.randomOrder ? "on" : "off";
  randomOrderButton.innerHTML = res.randomOrder ? "ON" : "OFF";

  endOnAllAnsweredButton = document.getElementById("endOnAllAnsweredButton");
  endOnAllAnsweredButton.className = res.endOnAllAnswered ? "on" : "off";
  endOnAllAnsweredButton.innerHTML = res.endOnAllAnswered ? "ON" : "OFF";

  
  const elements = document.querySelectorAll('*');
  elements.forEach(element => {
    if (res.dyslexicMode) {
      element.classList.add('dyslexic');
    } else {
      element.classList.remove('dyslexic');
    }
  });
});

socket.on("hostConnected", (res) => {
  document.getElementById("form").style.display = "none";
  document.getElementById("nav").style.display = "block";
});
// ---------------------- Socket.io Game -------------------------

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

