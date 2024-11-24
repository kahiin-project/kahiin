// ---------------------- Variables -------------------------

let socket = null;
let question_count = 0;
let passcode = "";
let glossary = {};

// ---------------------- Initialisation -------------------------

function init() {
    const wsUrl = `ws://${window.location.hostname}:8000?t=${Date.now()}`;
    socket = new WebSocketHandler(wsUrl);
    setupSocketListeners();
}

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
    const elementsToDisable = ["next_question", "show_leaderboard"];
    elementsToDisable.forEach(element => {
        document.getElementById(element).style.background = "#e8e8e8";
        document.getElementById(element).setAttribute("disabled", true);
    });
    socket.emit("nextQuestion", { passcode, question_count });
}

function showLeaderboard() {
    socket.emit("showLeaderboard", passcode);
}

function kickPlayer() {
    const playerName = document.getElementById("kick_player_name").value;
    socket.emit("kickPlayer", { passcode, username: playerName });
    document.getElementById("kick_player_name").value = "";
}

function getSpreadsheet() {
    socket.emit("getSpreadsheet", passcode);
}

// ---------------------- Functions Config -------------------------

function applyNewPassword() {
    if (document.getElementById('new_password').value === document.getElementById('repeat_new_password').value) {
        socket.emit('setSettings', { passcode, settings: { adminPassword: hashSHA256(document.getElementById('new_password').value) } });
    }
    document.getElementById('new_password').value = "";
    document.getElementById('repeat_new_password').value = "";
    alert(glossary["PasswordChanged"]);
}

function changeLanguage() {
    socket.emit('setSettings', { passcode, settings: { language: document.getElementById('language').value } });
    location.reload();
}

function editSettingsButton(setting) {
    socket.emit('setSettings', { passcode, settings: { [setting]: document.getElementById(`${setting}Button`).innerHTML !== "ON" } });
    document.getElementById(`${setting}Button`).innerHTML = document.getElementById(`${setting}Button`).innerHTML === "ON" ? "OFF" : "ON";
    const button = document.getElementById(`${setting}Button`);
    if (button.classList.contains("off")) {
        button.classList.remove("off");
        button.classList.add("on");
    } else {
        button.classList.remove("on");
        button.classList.add("off");
    }

}

// ---------------------- Functions Create -------------------------

function selectQuestionary(questionary_name) {
    socket.emit("selectQuestionary", { passcode, questionary_name });
    document.querySelectorAll(".questionary").forEach(element => {
        element.style.background = "";
    });
    document.getElementById(questionary_name).style.background = "#49cf38";
}

function createQuestionary() {
    socket.emit("createQuestionary", { passcode });
    socket.emit("listQuestionary", { passcode });
}

editing_questionary = ""
function editQuestionary(questionary_name) {
    document.getElementById("edit_questionary_name").value = "";
    document.getElementById("create_div").style.display = "none";
    socket.emit("listQuestionary", { passcode });
    document.getElementById("edit_questionary_name").value = questionary_name;
    editing_questionary = questionary_name;
    document.getElementById("edit_div").style.display = "block";
}

function editQuestionaryName(new_name) {
    const old_name = editing_questionary;
    socket.emit("editQuestionaryName", { passcode, old_name, new_name });
    socket.emit("listQuestionary", { passcode });
}

// ---------------------- Functions Navigation -------------------------
function navigate(index) {
    for (let i = 0; i < 5; i++) {
        document.getElementById(`nav_button_${i}`).style.borderLeft = "none";
    }
    const elementsToHide = ["play_div", "settings_div", "create_div", "edit_div"];
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
            break;
        case 4:
            // document.getElementById("settings_div").innerHTML = `
            //   <h1>${glossary["Account"]}</h1>
            // `;
            break;
        default:
            console.log("Invalid index incoming.");
    }
}

function search(page) {
    const searchText = document.getElementById(`search_${page}_questionary`).value;
    document.querySelectorAll(`#questionary_${page}_list .questionary`).forEach(element => {
        if (element.innerHTML.toLowerCase().includes(searchText.toLowerCase())) {
            element.style.display = "block";
        } else {
            element.style.display = "none";
        }
    });
}

// ---------------------- Socket.io Main -------------------------

function setupSocketListeners() {
    socket.on("error", (res) => {
        if (res == "InvalidPasscode") {
            const elementsToHide = ["start_game", "next_question", "nav"];
            elementsToHide.forEach(element => {
                document.getElementById(element).style.display = "none";
            });
            const elementsToShow = ["form", "error"];
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

    socket.on("settings", (res) => {
        document.getElementById("language").value = res.language;
        // const dyslexicModeButton = document.getElementById("dyslexicModeButton");
        // dyslexicModeButton.className = res.dyslexicMode ? "on" : "off";
        // dyslexicModeButton.innerHTML = res.dyslexicMode ? "ON" : "OFF";

        // const randomOrderButton = document.getElementById("randomOrderButton");
        // randomOrderButton.className = res.randomOrder ? "on" : "off";
        // randomOrderButton.innerHTML = res.randomOrder ? "ON" : "OFF";

        // const endOnAllAnsweredButton = document.getElementById("endOnAllAnsweredButton");
        // endOnAllAnsweredButton.className = res.endOnAllAnswered ? "on" : "off";
        // endOnAllAnsweredButton.innerHTML = res.endOnAllAnswered ? "ON" : "OFF";

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
        socket.emit("listQuestionary", { passcode });
    });

    // ---------------------- Socket.io Game -------------------------

    socket.on("startGame", (res) => {
        question_count = 0;
        socket.emit("nextQuestion", { passcode, question_count });
        const elementsToHide = ["start_game", "get_spreadsheet", "start_game_will_remove_data", "show_leaderboard", "next_question"];
        elementsToHide.forEach(element => {
            document.getElementById(element).style.display = "none";
        });
        const elementsToShow = ["next_question", "show_leaderboard"];
        elementsToShow.forEach(element => {
            document.getElementById(element).style.display = "block";
            document.getElementById(element).style.background = "#e8e8e8";
            document.getElementById(element).setAttribute("disabled", true);
        });
    });

    socket.on("questionEnd", (res) => {
        const elementsToEnable = ["next_question", "show_leaderboard"];
        elementsToEnable.forEach(element => {
            document.getElementById(element).style.background = "";
            document.getElementById(element).removeAttribute("disabled");
        });
    });

    socket.on("gameEnd", (res) => {
        const elementsToShow = ["start_game", "get_spreadsheet", "start_game_will_remove_data"];
        elementsToShow.forEach(element => {
            document.getElementById(element).style.display = "block";
        });
        const elementsToHide = ["next_question", "show_leaderboard"];
        elementsToHide.forEach(element => {
            document.getElementById(element).style.display = "none";
        });
        question_count = 0;
    });

    socket.on("spreadsheet", (res) => {
        const csv = res['csv'];
        const datetime = new Date();
        const formattedDate = datetime.toISOString().slice(0, 16).replace(/T/g, '_').replace(/:/g, '-');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const csv_link = document.createElement('a');
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
        });
    });
}

// Initialisation au chargement de la page
document.addEventListener("DOMContentLoaded", init);