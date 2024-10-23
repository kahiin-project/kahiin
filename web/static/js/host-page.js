const socket = io();

// ---------------------- Variables -------------------------
var question_count = 0;
var passcode = "";
var glossary = {};
let inSettingsTab = false;

// ---------------------- Functions -------------------------

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

function applyNewPassword() {
  if(document.getElementById('new_password').value == document.getElementById('repeat_new_password').value) {
    socket.emit('setSettings', {passcode: passcode, settings: {adminPassword: hashSHA256(document.getElementById('new_password').value)}});
  }
  document.getElementById('new_password').value = "";
  document.getElementById('repeat_new_password').value = "";
  alert(glossary["PasswordChanged"]);
}

function navigate(index){
  for(let i = 0; i < 5; i++){
    document.getElementById(`nav_button_${i}`).style.borderLeft = "none";
  }
  document.getElementById(`nav_button_${index}`).style.borderLeft = "solid #494949 5px";
  document.getElementById("nav_content").innerHTML = ``;
  document.getElementById("in_game_div").style.display = "none";
  inSettingsTab = false;
  switch (index) {
    case 0:
      document.getElementById("in_game_div").style.display = "block";
      socket.emit("getSettings", "");
      break;
    case 1:
      document.getElementById("nav_content").innerHTML = `
        
      `;
      socket.emit("getSettings", "");
      break;
    case 2:
      document.getElementById("nav_content").innerHTML = `
        <h1>Kahiin DB</h1>
      `;
      socket.emit("getSettings", "");
      break;
    case 3:
      inSettingsTab = true;
      socket.emit("getSettings", passcode);
      break;
    case 4:
      document.getElementById("nav_content").innerHTML = `
        <h1>${glossary["Account"]}</h1>
      `;
      socket.emit("getSettings", "");
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
  if(inSettingsTab){
    document.getElementById("nav_content").innerHTML = `
      <h1>${glossary["Settings"]}</h1>
      <h2>${glossary["Language"]}</h2>
      <select id="language" onchange="socket.emit('setSettings', {passcode: '${passcode}', settings: {language: document.getElementById('language').value}}); location.reload();">
        <option value="en" ${res.language == "en" ? "selected" : ""}>🇬🇧 English</option>
        <option value="fr" ${res.language == "fr" ? "selected" : ""}>🇫🇷 Français</option>
        <option value="es" ${res.language == "es" ? "selected" : ""}>🇪🇸 Español</option>
        <option value="it" ${res.language == "it" ? "selected" : ""}>🇮🇹 Italiano</option>
        <option value="de" ${res.language == "de" ? "selected" : ""}>🇩🇪 Deutsch</option>
      </select>
      <p style="margin-left: 50px; color: gray;">${glossary["ChangeLanguageWillRefresh"]}</p>
      <h2>${glossary["DyslexicMode"]}</h2>
      ${res.dyslexicMode ? `<button class="on" onclick="socket.emit('setSettings', {passcode: '${passcode}', settings: {dyslexicMode: false}});">ON</button>` : `<button class="off" onclick="socket.emit('setSettings', {passcode: '${passcode}', settings: {dyslexicMode: true}});">OFF</button>`}
      <h2>${glossary["RandomOrder"]}</h2>
      ${res.randomOrder ? `<button class="on" onclick="socket.emit('setSettings', {passcode: '${passcode}', settings: {randomOrder: false}});">ON</button>` : `<button class="off" onclick="socket.emit('setSettings', {passcode: '${passcode}', settings: {randomOrder: true}});">OFF</button>`}
      <h2>${glossary["EndOnAllAnswered"]}</h2>
      ${res.endOnAllAnswered ? `<button class="on" onclick="socket.emit('setSettings', {passcode: '${passcode}', settings: {endOnAllAnswered: false}});">ON</button>` : `<button class="off" onclick="socket.emit('setSettings', {passcode: '${passcode}', settings: {endOnAllAnswered: true}});">OFF</button>`}
      <h2>${glossary["AdminPassword"]}</h2>
      <input type="password" id="new_password" placeholder="New Password">
      <input type="password" id="repeat_new_password" placeholder="Repeat New Password">
      <button class="apply-button" onclick="applyNewPassword()">APPLY</button>
      <div style="height: 50px"></div>
    `;
  }
  const elements = document.querySelectorAll('*');
  elements.forEach(element => {
    if (res.dyslexicMode) {
      element.classList.add('dyslexic');
    } else {
      element.classList.remove('dyslexic');
    }
  });
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

