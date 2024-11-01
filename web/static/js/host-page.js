const socket = io();

// ---------------------- Variables -------------------------
var question_count = 0;
var passcode = "";
var glossary = {};

// ---------------------- Functions Main -------------------------

function hashSHA256(message) {
  const hash = CryptoJS.SHA256(message);
  return hash.toString(CryptoJS.enc.Hex);
}

function submitPasscode() {
    passcode = hashSHA256(document.getElementById("passcode").value);
    socket.emit("hostConnect", passcode);
}

// ---------------------- Functions Game -------------------------
function startSession() {
  socket.emit("startSession", passcode);
}

function nextQuestion() {
  question_count += 1;
  elementToHide = ["next_question", "show_leaderboard"];
  elementToHide.forEach(element => {
    document.getElementById(element).style.display = "none";
  });
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

function getSpreadsheet() {
  socket.emit("getSpreadsheet", passcode);
}

// ---------------------- Functions Config -------------------------

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

// ---------------------- Functions Create -------------------------

function selectQuestionary(questionary_name) {
  socket.emit("selectQuestionary", {passcode: passcode, questionary_name: questionary_name});
  alert(glossary["QuestionarySelected"]);
}


// ---------------------- Functions Navigation -------------------------
function navigate(index){
  for(let i = 0; i < 5; i++){
    document.getElementById(`nav_button_${i}`).style.borderLeft = "none";
  }
  elementToHide = ["play_div", "settings_div", "create_div"];
  elementToHide.forEach(element => {
    document.getElementById(element).style.display = "none";
  });
  document.getElementById(`nav_button_${index}`).style.borderLeft = "solid #494949 5px";
  switch (index) {
    case 0:
      document.getElementById("play_div").style.display = "block";
      break;
    case 1:
      document.getElementById("create_div").style.display = "block";
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
    elementToHide = ["start_game", "next_question", "nav"];
    elementToHide.forEach(element => {
      document.getElementById(element).style.display = "none";
    });
    elementToShow = ["form", "error"];
    elementToShow.forEach(element => {
      document.getElementById(element).style.display = "block";
    });
    document.getElementById("passcode").value = "";
    document.getElementById("error").innerHTML = glossary[res];

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
  socket.emit("listQuestionary", {passcode: passcode});
});
// ---------------------- Socket.io Game -------------------------

socket.on("startGame", (res) => {
  question_count = 0;
  socket.emit("nextQuestion", {passcode, question_count});
  elementToHide = ["start_game", "get_spreadsheet", "start_game_will_remove_data", "show_leaderboard", "next_question"];
  elementToHide.forEach(element => {
    document.getElementById(element).style.display = "none";
  });

});

socket.on("questionEnd", (res) => {
  elementToShow = ["next_question", "show_leaderboard"];
  elementToHide.forEach(element => {
    document.getElementById(element).style.display = "block";
  });
});

socket.on("gameEnd", (res) => {
  elementToShow = ["start_game", "get_spreadsheet", "start_game_will_remove_data"];
  elementToHide.forEach(element => {
    document.getElementById(element).style.display = "block";
  });
  elementToHide = ["next_question", "show_leaderboard"];
  elementToHide.forEach(element => {
    document.getElementById(element).style.display = "none";
  });
  question_count = 0;

});

socket.on("spreadsheet", (res) => {
  var csv = res['csv'];
  var datetime = new Date();
  var formattedDate = datetime.toISOString().slice(0,16).replace(/T/g, '_').replace(/:/g, '-');
  var blob = new Blob([csv], { type: 'text/csv' });
  var url = window.URL.createObjectURL(blob);
  var csv_link = document.createElement('a');
  csv_link.href = url;
  csv_link.download = `${res.questionary_name}_leaderboard_${formattedDate}.csv`;
  document.body.appendChild(csv_link);
  csv_link.click();
  document.body.removeChild(csv_link);
  window.URL.revokeObjectURL(url);
  
});

  
// ---------------------- Socket.io Create -------------------------

socket.on("ListOfQuestionary", (res) => {
  const questionary_list = document.getElementById("questionary_list");
  questionary_list.innerHTML = "";
  res.questionaries.forEach(questionary => {
    questionary_list.innerHTML += `<button onclick="selectQuestionary('${questionary}')" class="questionary">${questionary}</button>`;
  }
  );
});