// ---------------------- Variables -------------------------

let socket = null;
let question_count = 0;
let passcode = "";
let glossary = {};
let dyslexicMode = false;
let drawer = [];
let draggedIndex = null;
let draggedQuestion = null;
let questionnaire = null;

// ---------------------- Initialisation -------------------------

function init() {
    const wsUrl = `ws://${window.location.hostname}:8000?t=${Date.now()}`;
    socket = new WebSocketHandler(wsUrl);
    setupSocketListeners();
}

// Call init on page load
window.onload = init;

// ---------------------- Functions Main -------------------------

function updateDyslexicFonts(dyslexicMode){
    let elements = document.querySelectorAll('*');
    elements.forEach(element => {
      if (dyslexicMode) {
        element.classList.add('dyslexic');
      } else {
        element.classList.remove('dyslexic');
      }
    });
}

function formatDuration(seconds) {
    if (seconds < 60){
        return `${seconds}s`;
    } else {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }
}

function hashSHA256(message) {
    const hash = CryptoJS.SHA256(message);
    return hash.toString(CryptoJS.enc.Hex);
}

function submitPasscode() {
    passcode = hashSHA256(document.getElementById("passcode").value);
    socket.emit("hostConnect", passcode);
}

function printError(error) {
    document.getElementById("error_div").innerHTML = error ;
    document.getElementById("error_div").style.transform = "translate(-50%, 30px)" ;
    document.getElementById("error_div").style.opacity = "1" ;
    setTimeout(() => {
        document.getElementById("error_div").style.transform = "translate(-50%, -30px)" ;
        document.getElementById("error_div").style.opacity = "0" ;
    },5000)
}

// ---------------------- Functions Game -------------------------
function startSession() {
    socket.emit("startSession", passcode);
}

function nextQuestion() {
    question_count += 1;
    const elementsToDisable = ["next_question", "show_leaderboard"];
    elementsToDisable.forEach(element => {
        document.getElementById(element).setAttribute("disabled", true);
    });
    const elementsToEnable = ["pass_question","pause_question"];
    elementsToEnable.forEach(element => {
        document.getElementById(element).removeAttribute("disabled");
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

function passQuestion() {
    socket.emit("stopQuestion", passcode);
}

function pauseQuestion() {
    if (document.getElementById("pause_question").innerHTML === glossary["UnpauseQuestion"]) {
        socket.emit("unpauseQuestion", passcode);
        document.getElementById("pause_question").innerHTML = glossary["PauseQuestion"];
    } else {
        socket.emit("pauseQuestion", passcode);
        document.getElementById("pause_question").innerHTML = glossary["UnpauseQuestion"];
    }
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

function createDrawerQuestionElement(id, title) {
    const drawer_question = document.createElement('div');
    drawer_question.classList.add('drawer-question');
    drawer_question.draggable = true;
    drawer_question.setAttribute('question-id', id);

    const bulletLabel = document.createElement('label');
    bulletLabel.style.display = 'inline-block';
    bulletLabel.style.width = '50px';
    bulletLabel.style.textAlign = 'left';
    bulletLabel.style.color = '#c0c0c0';
    bulletLabel.textContent = '•';

    const questionLabel = document.createElement('label');
    questionLabel.style.display = 'inline-block';
    questionLabel.style.width = 'calc(100% - 130px)';
    questionLabel.style.paddingRight = '60px';
    questionLabel.textContent = title;

    drawer_question.appendChild(bulletLabel);
    drawer_question.appendChild(questionLabel);

    return drawer_question;
}

// ---------------------- Functions Create -------------------------

function selectQuestionary(questionnaire_name) {
    socket.emit("selectQuestionary", { passcode, questionnaire_name });
    document.querySelectorAll(".questionary").forEach(element => {
        element.style.background = "";
    });
    document.getElementById(questionnaire_name).style.background = "#49cf38";
}

function createQuestionary() {
    socket.emit("createQuestionary", { passcode });
    socket.emit("listQuestionary", { passcode });
}

function getWholeQuestionnaire(questionnaire_name) {
    socket.emit("getWholeQuestionnaire", { passcode, questionnaire_name });
}

function getDrawer() {
    socket.emit("getDrawer", { passcode });
}

editing_questionnaire = ""
function editQuestionary(questionnaire_name) {
    document.getElementById("edit_questionnaire_name").value = "";
    document.getElementById("create_div").style.display = "none";
    socket.emit("listQuestionary", { passcode });
    document.getElementById("edit_questionnaire_name").value = questionnaire_name;
    editing_questionnaire = questionnaire_name;
    document.getElementById("edit_div").style.display = "block";

    document.getElementById('dropbox').innerHTML = '';
    getWholeQuestionnaire(questionnaire_name);
    getDrawer();
}

function editQuestionaryName(new_name) {
    const old_name = editing_questionnaire;
    socket.emit("editQuestionaryName", { passcode, old_name, new_name });
    socket.emit("listQuestionary", { passcode });
}

function deleteQuestionary() {
    const questionnaire_name = document.getElementById("edit_questionnaire_name").value;
    socket.emit("deleteQuestionary", { passcode, questionnaire_name });
}

function showQuestionInfos(id) {
    if (questionnaire == null) {
        return;
    }
    if (id >= questionnaire.questions.length) {
        return;
    }

    formattedType = "";
    switch(questionnaire.questions[id]["@type"]) {
        case "mcq":
            formattedType = glossary["MCQ"];
            break;
        case "uniqueanswer":
            formattedType = glossary["UniqueAnswer"];
            break;
    }
    document.getElementById("type_p").innerHTML = formattedType;

    document.getElementById("duration_p").innerHTML = formatDuration(questionnaire.questions[id]["@duration"]);

    shown_answers = questionnaire.questions[id]["shown_answers"].answer;
    correct_answers = questionnaire.questions[id]["correct_answers"].answer;
    shown_answers.forEach((answer, index) => {
        if (correct_answers.includes(answer)) {
            text = `✓ ${answer}`;
            document.getElementById(`answer${index + 1}_p`).style.color = "green";
        }else {
            text = `✗ ${answer}`;
            document.getElementById(`answer${index + 1}_p`).style.color = "red";
        }
        document.getElementById(`answer${index + 1}_p`).innerHTML = text;
    });

    document.getElementById("edit_popup_container").style.display = "block";
    console.log(questionnaire.questions[id]);
}

document.getElementById("edit_popup_container").addEventListener("click", function() {
    document.getElementById("edit_popup_container").style.display = "none";
});

// ---------------------- Functions Navigation -------------------------
function navigate(index) {
    document.getElementById("edit_popup_container").style.display = "none";
    const elementsToHide = ["play_div", "settings_div", "create_div", "edit_div", "login_div","signup_div", "account_div"];
    elementsToHide.forEach(element => {
        document.getElementById(element).style.display = "none";
    });
    if (index < 5) {
        for (let i = 0; i < 5; i++) {
            document.getElementById(`nav_button_${i}`).style.borderLeft = "none";
        };
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
                if (localStorage.getItem('token') != null){ //modifier test (l'actuel sert juste à tester la fonction)
                    document.getElementById("account_div").style.display = "block";
                } else {
                    document.getElementById("login_div").style.display = "block";
                }
                break;
            default:
                console.log("Invalid index incoming.");
    }} else {
        document.getElementById("signup_div").style.display = "block";
    };
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
// ---------------------- Fuctions DB Front -------------------------

function loginPage() {
    if (document.getElementById("login_email").value != "", document.getElementById("login_password").value != ""){
        login(document.getElementById("login_email").value,document.getElementById("login_password").value)
        .then(data => {
            document.getElementById("login_div").style.display = "none";
            document.getElementById("account_div").style.display = "block";
        })
        .catch(error => {
            console.error(error);
        });
    };
}

function signupPage() {
    if (document.getElementById("signup_password").value == document.getElementById("signup_verify").value, document.getElementById("signup_email").value != "", document.getElementById("signup_password").value != "") {
        signup(document.getElementById("signup_email").value,document.getElementById("signup_password").value)
        .then(data => {
            document.getElementById("signup_div").style.display = "none";
            document.getElementById("login_div").style.display = "block";
        })
        .catch(error => {
            console.error(error);
        });
    };
}

// ---------------------- socket.io Main -------------------------

function setupSocketListeners() {
    socket.on("error", (res) => {
        if (res == "InvalidPasscode") {
            const elementsToHide = ["nav", "playdiv", "settingsdiv", "creatediv", "editdiv"];
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

        dyslexicMode = res.dyslexicMode
        updateDyslexicFonts(dyslexicMode);
    });

    socket.on("glossary", (res) => {
        glossary = res;
    });

    socket.on("hostConnected", (res) => {
        document.getElementById("form").style.display = "none";
        document.getElementById("nav").style.display = "block";
        socket.emit("listQuestionary", { passcode });
    });

    // ---------------------- socket.io Game -------------------------

    socket.on("startGame", (res) => {
        question_count = 0;
        socket.emit("nextQuestion", { passcode, question_count });
        const elementsToHide = ["start_game", "get_spreadsheet", "start_game_will_remove_data", "show_leaderboard"];
        elementsToHide.forEach(element => {
            document.getElementById(element).style.display = "none";
        });
        const elementsToShow = ["next_question", "show_leaderboard","pass_question","pause_question","question_number"];
        elementsToShow.forEach(element => {
            document.getElementById(element).style.display = "block";
        });
        const elementsToDisable = ["next_question", "show_leaderboard"];
        elementsToDisable.forEach(element => {
            document.getElementById(element).setAttribute("disabled", true);
        });
    });

    socket.on("questionStart", (res) => {
        document.getElementById("question_number").innerText = `${glossary["Question"]} ${res["question_number"]}/${res["question_count"]}`;
    });

    socket.on("questionEnd", (res) => {
        const elementsToEnable = ["next_question", "show_leaderboard"];
        elementsToEnable.forEach(element => {
            document.getElementById(element).removeAttribute("disabled");
        });
        const elementsToDisable = ["pass_question","pause_question"];
        elementsToDisable.forEach(element => {
            document.getElementById(element).setAttribute("disabled", true);
        });
    });

    socket.on("gameEnd", (res) => {
        const elementsToShow = ["start_game", "get_spreadsheet", "start_game_will_remove_data"];
        elementsToShow.forEach(element => {
            document.getElementById(element).style.display = "block";
        });
        const elementsToHide = ["next_question", "show_leaderboard","pass_question","pause_question","question_number"];
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
        csv_link.download = `${res.questionnaire_name}_leaderboard_${formattedDate}.csv`;
        document.body.appendChild(csv_link);
        csv_link.click();
        document.body.removeChild(csv_link);
        window.URL.revokeObjectURL(url);
    });

    // ---------------------- socket.io Create -------------------------

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

    socket.on("deletedQuestionnary", (res) => {
        socket.emit("listQuestionary", { passcode });
        navigate(1);
    });

    socket.on("wholeQuestionnaire", (res) => {
        document.getElementById('dropbox').innerHTML = '';
        questionnaire = JSON.parse(res);
        questions = questionnaire.questions;
        questions.forEach((question, index) => {
            createDroppableSpace(index);
            const question_div = document.createElement('div');

            question_div.classList.add('question');
            question_div.draggable = true;
            question_div.setAttribute('line-pos', index);
            question_div.addEventListener('dragstart', (e) => {
                draggedIndex = parseInt(index);
                e.dataTransfer.setData('text/plain', '');
            });

            document.getElementById('dropbox').appendChild(question_div);

            question_title = question.title
            .split('\n')
            .map(line => line.trim().replace(/\s+/g, ' '))
            .join('\n');
            question_div.innerHTML = marked(question_title)
            renderMathInElement(question_div, {
                delimiters: [
                    {left: "\$", right: "\$", display: false},
                    {left: "\$$", right: "\$$", display: true}
                ]
            });
            hljs.highlightAll();

            const trashButton = document.createElement('img');
            trashButton.classList.add('trash-button');
            trashButton.src = '/static/icon/trash.svg';
            trashButton.title = glossary["DeleteQuestion"];
            trashButton.addEventListener('click', () => {
                socket.emit('deleteQuestion', { passcode, index, questionnaire_name: editing_questionnaire });
            });
            question_div.appendChild(trashButton);

            const barcodeButton = document.createElement('img');
            barcodeButton.classList.add('barcode-button');
            barcodeButton.src = '/static/icon/barcode.svg';
            barcodeButton.title = glossary["OtherData"];
            barcodeButton.addEventListener('click', () => {
                showQuestionInfos(index);
            });
            question_div.appendChild(barcodeButton);

        });
        createDroppableSpace(questions.length);
        updateDyslexicFonts(dyslexicMode);
    });

    socket.on("drawer", (res) => {
        drawer = res;
        const drawer_div = document.getElementById('questions_drawer');
        drawer_div.innerHTML = '';
        res.forEach((question, index) => {
            const drawer_question = createDrawerQuestionElement(index, question.title.substring(0, 20) + "...");
            drawer_div.appendChild(drawer_question);
            drawer_question.addEventListener('dragstart', (e) => {
                draggedQuestion = e.target.getAttribute('question-id');
            });
        });
        updateDyslexicFonts(dyslexicMode);
    });

}