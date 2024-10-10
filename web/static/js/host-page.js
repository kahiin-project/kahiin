const socket = io();
var question_count = 0;
var passcode = "";
var glossary = {};
function hashSHA256(message) {
  const hash = CryptoJS.SHA256(message);
  return hash.toString(CryptoJS.enc.Hex);
}

function submitPasscode() {
    passcode = hashSHA256(document.getElementById("passcode").value);
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
  document.getElementById("start_game").style.display = "none";
  document.getElementById("next_question").style.display = "block";
  socket.emit("startSession", passcode);
  question_count = 0;
  socket.emit("nextQuestion", {passcode, question_count});
  document.getElementById("next_question").style.display = "none";
}
function nextQuestion() {
  question_count += 1;
  socket.emit("nextQuestion", {passcode, question_count});
}
function showLeaderboard() {
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
function navigate(index){
  for(let i = 0; i < 5; i++){
    document.getElementById(`nav_button_${i}`).style.borderLeft = "none";
  }
  document.getElementById(`nav_button_${index}`).style.borderLeft = "solid #494949 5px";
  document.getElementById("nav_content").innerHTML = ``;
  document.getElementById("in_game_div").style.display = "none";
  switch (index) {
    case 0:
      document.getElementById("in_game_div").style.display = "block";
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
      socket.emit("getSettings", passcode);
      break;
    case 4:
      document.getElementById("nav_content").innerHTML = `
        <h1>${glossary["Account"]}</h1>
      `;
      break;
    default:
      console.log("Invalid index incoming.");
  }
}
socket.on("language", (res) => {
  glossary = res;
  console.log("Glossary received:", glossary);
  replaceAllGlossaryVariables();

  function replaceAllGlossaryVariables() {
    // Fonction pour remplacer les variables dans le HTML
    
    document.getElementById("nav").innerHTML = `
      <div class="header"></div>
      <button id="nav_button_0" style="top: 160px;" onclick="navigate(0);">
        <img src="static/icon/play.svg">
        ${glossary["Play"]}
      </button>
      <button id="nav_button_1" style="top: 250px;" onclick="navigate(1);">
        <img src="static/icon/create.svg">
        ${glossary["Create"]}
      </button>
      <button id="nav_button_2" style="top: 340px;" onclick="navigate(2);">
        <img src="static/icon/database.svg">
        Kahiin DB
      </button>
      <button id="nav_button_3" style="top: 430px;" onclick="navigate(3);">
        <img src="static/icon/settings.svg">
        ${glossary["Settings"]}
      </button>
      <button id="nav_button_4" style="bottom: 10px;" onclick="navigate(4);">
        <img src="static/icon/account.svg">
        ${glossary["Account"]}
      </button>
    `;
   
}});

socket.on("settings", (res) => {
  if(res.adminPassword != passcode){
    passcode = res.adminPassword;
    alert("Password modified");
  }
  document.getElementById("nav_content").innerHTML = `
    <h1>${glossary["Settings"]}</h1>
    <h2>${glossary["Language"]}</h2>
    <select id="language" onchange="socket.emit('setSettings', {passcode: '${passcode}', settings: {language: document.getElementById('language').value}});">
      <option value="en">🇬🇧 English</option>
      <option value="fr">🇫🇷 Français</option>
      <option value="es">🇪🇸 Español</option>
      <option value="it">🇮🇹 Italiano</option>
      <option value="al">🇩🇪 Deutsch</option>
    </select>
    <h2>${glossary["DyslexicMode"]}</h2>
    ${res.dyslexicMode ? `<button class="on" onclick="socket.emit('setSettings', {passcode: '${passcode}', settings: {dyslexicMode: false}});">ON</button>` : `<button class="off" onclick="socket.emit('setSettings', {passcode: '${passcode}', settings: {dyslexicMode: true}});">OFF</button>`}
    <h2>${glossary["AdminPassword"]}</h2>
    <input type="password" id="new_password" placeholder="New Password">
    <input type="password" id="repeat_new_password" placeholder="Repeat New Password">
    <button class="apply-button" onclick="applyNewPassword()">APPLY</button>
  `;
  document.getElementById("language").value = res.language;
});

function applyNewPassword() {
  if(document.getElementById('new_password').value == document.getElementById('repeat_new_password').value) {
    socket.emit('setSettings', {passcode: passcode, settings: {adminPassword: hashSHA256(document.getElementById('new_password').value)}});
  }
  document.getElementById('new_password').value = "";
  document.getElementById('repeat_new_password').value = "";
}