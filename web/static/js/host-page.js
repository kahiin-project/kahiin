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
  elementsToDisable = ["next_question", "show_leaderboard"];
  elementsToDisable.forEach(element => {
    document.getElementById(element).style.background = "#e8e8e8";
    document.getElementById(element).setAttribute("disabled", true);
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
  document.querySelectorAll(".questionary").forEach(element => {
    element.style.background ="";
  })
  document.getElementById(questionary_name).style.background = "#49cf38" ;
}

function createQuestionary() {
  socket.emit("createQuestionary")
  socket.emit("listQuestionary", {passcode: passcode})
  socket.on("quetionaryCreated", (res) => {
    editQuestionary(res)
  })
}

function editQuestionary(questionary_name) {
  document.getElementById("create_div").style.display = "none";
  questionary_word = document.getElementById("questionary_name").innerHTML.split(" - ")[0]
  document.getElementById("questionary_name").innerHTML = questionary_word + " - " + questionary_name ;
  document.getElementById("edit_div").style.display = "block";
}

function editQuestionaryName(new_name) {
  questionary_word = document.getElementById("questionary_name").innerHTML.split(" - ")[0];
  old_name = document.getElementById("questionary_name").innerHTML.split(" - ")[1];
  forbiden_characters = [".","?","!",":",",","<",">","|","/"] ;
  invalid_characters = false
  already_exist = false
  forbiden_characters.forEach(element => {
    if (new_name.includes(element)) {
      invalid_characters = true
    }})
  document.querySelectorAll("#questionary_edit_list .questionary").forEach(element => {
    if (element.innerHTML == new_name + ".khn") {
      already_exist = true
    }})
  if(new_name==""){alert("Questionary's name cannot be empty")}
  else if (invalid_characters){alert("Questionary's name cannot contain special characters")}
  else if (already_exist){alert("A questionary with this name already exist")}
  else {
    document.getElementById("questionary_name").innerHTML = questionary_word + " - " + new_name +".khn";
    socket.emit("editQuestionaryName", {old_name: old_name, new_name: new_name + ".khn"})
  }
}

// ---------------------- Functions Navigation -------------------------
function navigate(index){
  for(let i = 0; i < 5; i++){
    document.getElementById(`nav_button_${i}`).style.borderLeft = "none";
  }
  elementsToHide = ["play_div", "settings_div", "create_div","edit_div"];
  elementsToHide.forEach(element => {
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

function search(page){
  searchText = document.getElementById(`search_${page}_questionary`).value
  document.querySelectorAll(`#questionary_${page}_list .questionary`).forEach(element => {
    if (element.innerHTML.toLowerCase().includes(searchText.toLowerCase())) {
      element.style.display = "block";
    } else {
      element.style.display = "none";
    }
  })
}

// ---------------------- Socket.io Main -------------------------

socket.on("error", (res) => {
  if (res=="InvalidPasscode") {
    elementsToHide = ["start_game", "next_question", "nav"];
    elementsToHide.forEach(element => {
      document.getElementById(element).style.display = "none";
    });
    elementsToShow = ["form", "error"];
    elementsToShow.forEach(element => {
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
  document.getElementById("kick_player_name").placeholder = glossary["PlayerName"];
  document.getElementById("search_edit_questionary").placeholder = glossary["Search"];
  document.getElementById("search_select_questionary").placeholder = glossary["Search"];
});

socket.on("settings", (res) => {
  document.getElementById("language").value = res.language
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
  elementsToHide = ["start_game", "get_spreadsheet", "start_game_will_remove_data", "show_leaderboard", "next_question"];
  elementsToHide.forEach(element => {
    document.getElementById(element).style.display = "none";
  });
  elementsToShow= ["next_question", "show_leaderboard"];
  elementsToShow.forEach(element => {
    document.getElementById(element).style.display = "block";
    document.getElementById(element).style.background = "#e8e8e8";
    document.getElementById(element).setAttribute("disabled", true);
  });
});

socket.on("questionEnd", (res) => {
  elementsToEnable = ["next_question", "show_leaderboard"];
  elementsToEnable.forEach(element => {
    document.getElementById(element).style.background = "";
    document.getElementById(element).removeAttribute("disabled") ;
  });
});

socket.on("gameEnd", (res) => {
  elementsToShow = ["start_game", "get_spreadsheet", "start_game_will_remove_data"];
  elementsToShow.forEach(element => {
    document.getElementById(element).style.display = "block";
  });
  elementsToHide = ["next_question", "show_leaderboard"];
  elementsToHide.forEach(element => {
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
  const questionary_select_list = document.getElementById("questionary_select_list");
  const questionary_edit_list = document.getElementById("questionary_edit_list");
  questionary_select_list.innerHTML = "";
  questionary_edit_list.innerHTML = "";
  res.questionaries.forEach(questionary => {
    questionary_select_list.innerHTML += `<button onclick="selectQuestionary('${questionary}')" id="${questionary}" class="questionary">${questionary}</button>`;
    questionary_edit_list.innerHTML += `<button onclick="editQuestionary('${questionary}')" id="${questionary}" class="questionary">${questionary}</button>`;
  }
  );
});