// ---------------------- Variables -------------------------

let socket = null;
let question_count = 0;
let passcode = "";
let glossary = {};
let dyslexicMode = false;
let drawer = [];
let draggedIndex = null;
let draggedQuestion = null;
let quiz = null;
let quizzes = [];
let settings = {};

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
        if (remainingSeconds == 0){
            return `${minutes}min`;
        }
        return `${minutes}min ${remainingSeconds}s`;
    }
}

function hashSHA256(message) {
    const hash = CryptoJS.SHA256(message);
    return hash.toString(CryptoJS.enc.Hex);
}

function submitPasscode() {
    passcode = hashSHA256(document.getElementById("passcode").value);
    socket.emit("hostConnect", passcode);
    getDrawer();
}

function alertError(error) {
    document.getElementById("error_div").innerHTML = error ;
    document.getElementById("error_div").style.transform = "translate(-50%, 10px)" ;
    document.getElementById("error_div").style.opacity = "1" ;
    setTimeout(() => {
        document.getElementById("error_div").style.transform = "translate(-50%, 0px)" ;
        document.getElementById("error_div").style.opacity = "0" ;
    }, 2000)
}

function alertSuccess(message) {
    document.getElementById("success_div").innerHTML = message ;
    document.getElementById("success_div").style.transform = "translate(-50%, 10px)" ;
    document.getElementById("success_div").style.opacity = "1" ;
    setTimeout(() => {
        document.getElementById("success_div").style.transform = "translate(-50%, 0px)" ;
        document.getElementById("success_div").style.opacity = "0" ;
    }, 2000)
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
    const elementsToEnable = ["skip_question","pause_question"];
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

    const editButton = document.createElement('button');
    const img = document.createElement('img');
    img.src = '/static/icon/pencil.svg';
    editButton.appendChild(img);
    editButton.addEventListener('click', () => {
        editQuestion(id);
    });
    drawer_question.appendChild(editButton);

    const questionLabel = document.createElement('label');
    questionLabel.style.display = 'inline-block';
    questionLabel.style.width = 'calc(100% - 130px)';
    questionLabel.style.paddingRight = '10px';
    questionLabel.textContent = title;
    drawer_question.appendChild(questionLabel);

    return drawer_question;
}

// ---------------------- Functions Create -------------------------

function selectQuiz(quiz_name) {
    socket.emit("selectQuiz", { passcode, quiz_name });
    document.querySelectorAll(".quiz").forEach(element => {
        element.style.background = "";
    });
    document.getElementById(quiz_name).style.background = "#49cf38";
}

function createQuiz() {
    socket.emit("createQuiz", { passcode });
    socket.emit("listQuiz", { passcode });
}

function getWholeQuiz(quiz_name) {
    socket.emit("getWholeQuiz", { passcode, quiz_name });
}

function getDrawer() {
    socket.emit("getDrawer", { passcode });
}

editing_quiz = ""
function editQuiz(quiz_name) {
    document.getElementById("edit_quiz_name").value = "";
    document.getElementById("create_div").style.display = "none";
    socket.emit("listQuiz", { passcode });
    document.getElementById("edit_quiz_name").value = quiz_name;
    editing_quiz = quiz_name;
    if (quiz_name.includes("'") || quiz_name.includes('"')) {
        alertError("Quiz name cannot contain single or double quotes.");
        return;
    }
    document.getElementById("edit_div").style.display = "block";
    document.getElementById("edit_div").scrollTop = 0;

    document.getElementById('dropbox').innerHTML = '';
    getWholeQuiz(quiz_name);
    getDrawer();
}
function editQuizName(new_name) {
    if (new_name.includes("'") || new_name.includes('"')) {
        alertError("Quiz name cannot contain single or double quotes.");
        return;
    }
    socket.emit("editQuizName", { passcode, old_name: editing_quiz, new_name });
    socket.emit("listQuiz", { passcode });
}

function editQuizLanguage(new_language) {
    socket.emit("editQuizLanguage", { passcode, quiz_name: editing_quiz, new_language });
    socket.emit("listQuiz", { passcode });
}

let previous_quiz_subject = "";
function editQuizSubject(new_subject) {
    if(new_subject == ""){
        document.getElementById("edit_quiz_subject_input").value = previous_quiz_subject;
        new_subject = previous_quiz_subject;
    }else{
        previous_quiz_subject = new_subject;
        socket.emit("editQuizSubject", { passcode, quiz_name: editing_quiz, new_subject });
        socket.emit("listQuestionary", { passcode });
    }
}

function deleteQuizInLocal() {
    const quiz_name = document.getElementById("edit_quiz_name").value;
    socket.emit("deleteQuiz", { passcode, quiz_name });
}

function showQuestionInfos(question) {
    let formattedType = "";
    switch(question["@type"]) {
        case "mcq":
            formattedType = glossary["MCQ"];
            break;
        case "uniqueanswer":
            formattedType = glossary["UniqueAnswer"];
            break;
    }
    document.getElementById("type_p").innerHTML = formattedType;
    const flags = {en: "🇬🇧", fr: "🇫🇷", es: "🇪🇸", it: "🇮🇹", de: "🇩🇪"};
    document.getElementById("language_p").innerHTML = flags[question.language];
    document.getElementById("subject_p").innerHTML = question.subject;

    document.getElementById("duration_p").innerHTML = formatDuration(question["@duration"]);

    if(Array.isArray(question.shown_answers)){
        question.shown_answers = { answer: question.shown_answers };
    }
    if(Array.isArray(question.correct_answers)){
        question.correct_answers = { answer: question.correct_answers };
    }
    let shown_answers = question.shown_answers.answer;
    let correct_answers = question.correct_answers;
    if(correct_answers == null){
        correct_answers = [];
    }else{
        correct_answers = correct_answers.answer;
    }
    for(let i = 0; i < 4; i++) {
        document.getElementById(`answer${i + 1}_p`).style.display = "none";
        document.getElementById(`answer${i + 1}_p`).innerHTML = "";
    }

    shown_answers.forEach((answer, index) => {
        let text;
        document.getElementById(`answer${index + 1}_p`).style.display = "inline-block";
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
}

function showQuestionInfosFromDrawer(id) {
    if (quiz == null) {
        return;
    }
    if (id >= quiz.questions.length) {
        return;
    }
    showQuestionInfos(quiz.questions[id]);
}

document.getElementById("edit_popup_container").addEventListener("click", function() {
    document.getElementById("edit_popup_container").style.display = "none";
});

let quill;
function editQuestion(id) {
    if (quiz == null) {
        return;
    }
    document.getElementById("edit_div").style.display = "none";
    document.getElementById("edit_question_div").style.display = "block";

    document.getElementById("edit_question_type").value = drawer[id].type;
    document.getElementById("edit_question_duration").value = drawer[id].duration;
    document.getElementById("edit_question_language").value = drawer[id].language;
    document.getElementById("edit_question_subject").value = drawer[id].subject;
    shown_answers = drawer[id].shown_answers;

    //shown_answers = shown_answers.answer;
    switch(shown_answers.length) {
        case 2:
            document.getElementById("edit_answer_input0").value = shown_answers[0];
            document.getElementById("edit_answer_input1").value = shown_answers[1];
            document.getElementById("edit_answer_input2").value = "";
            document.getElementById("edit_answer_input3").value = "";
            break;
        case 3:
            document.getElementById("edit_answer_input0").value = shown_answers[0];
            document.getElementById("edit_answer_input1").value = shown_answers[1];
            document.getElementById("edit_answer_input2").value = shown_answers[2];
            document.getElementById("edit_answer_input3").value = "";
            break;
        case 4:
            document.getElementById("edit_answer_input0").value = shown_answers[0];
            document.getElementById("edit_answer_input1").value = shown_answers[1];
            document.getElementById("edit_answer_input2").value = shown_answers[2];
            document.getElementById("edit_answer_input3").value = shown_answers[3];
            break;
    }

    const markdownContent = drawer[id].title;
    let htmlContent = marked(markdownContent);

    document.querySelectorAll('.ql-toolbar').forEach(toolbar => {
        toolbar.remove();
    });
    quill = new Quill('#question_editor', {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }]
          ]
        }
    });

    htmlContent = htmlContent.replace(/<del>/g, '<s>').replace(/<\/del>/g, '</s>');
    htmlContent = htmlContent.replace(/<blockquote>\s*<p>(.*?)<\/p>\s*<\/blockquote>/g, '<blockquote>$1</blockquote>');
    
    quill.setText("");
    quill.clipboard.dangerouslyPasteHTML(htmlContent);
    for(let i = 0; i < quill.root.childNodes.length; i++) { 
        if(quill.root.childNodes[i].nodeName == "BLOCKQUOTE") {
            quill.root.childNodes[i - 1].remove();
        }
    }

    function refreshCorrectAnswersCheckboxes() {
        document.getElementById("correct_answers_inputs_div").style.opacity = "0";
        setTimeout(() => {
            document.getElementById("correct_answers_inputs_div").innerHTML = "";
            for(let i = 0; i < 4; i++) {
                if(document.getElementById(`edit_answer_input${i}`).value != ""){
                    const div = document.createElement("div");
                    div.style.width = "fit-content";
                    div.style.position = "relative";
                    div.style.left = "50px";
                    const input = document.createElement("input");
                    input.type = "checkbox";
                    input.style.width = "25px";
                    input.style.height = "25px";
                    input.style.marginLeft = "0";
                    input.style.cursor = "pointer";
                    div.appendChild(input);
                    const label = document.createElement("label");
                    label.style.fontSize = "25px";
                    label.style.position = "relative";
                    label.style.bottom = "3px";
                    label.style.left = "10px";
                    label.innerHTML = document.getElementById(`edit_answer_input${i}`).value;
                    div.appendChild(label);
                    document.getElementById("correct_answers_inputs_div").appendChild(div);
                }
            }
            document.getElementById("correct_answers_inputs_div").style.opacity = "1";
        }, 400);
    }

    for(let i = 0; i < 4; i++) {
        document.getElementById(`edit_answer_input${i}`).addEventListener("change", function() {
            let transition = false;
            for(let j = 0; j < 4; j++) {
                if(transition) {
                    break;
                }
                if (document.getElementById(`edit_answer_input${j}`).value == "") {
                    for (let k = j+1; k < 4; k++) {
                        if (document.getElementById(`edit_answer_input${k}`).value != "") {
                            transition = true;
                            break;
                        }
                    }
                }
            }
            if(transition) {
                for(let j = 0; j < 4; j++) {
                    setTimeout(() => {
                        document.getElementById(`edit_answer_input0`).style.opacity = "0";
                        setTimeout(() => {
                            document.getElementById(`edit_answer_input1`).style.opacity = "0";
                            setTimeout(() => {
                                document.getElementById(`edit_answer_input2`).style.opacity = "0";
                                setTimeout(() => {
                                    document.getElementById(`edit_answer_input3`).style.opacity = "0";
                                    for(k = j; k >= 0; k--) {
                                        if(k != 0){
                                            if (document.getElementById(`edit_answer_input${k - 1}`).value == "") {
                                                document.getElementById(`edit_answer_input${k - 1}`).value = document.getElementById(`edit_answer_input${k}`).value;
                                                document.getElementById(`edit_answer_input${k}`).value = "";
                                            }else{
                                                break;
                                            }
                                        }
                                    }
                                    refreshCorrectAnswersCheckboxes();
                                    setTimeout(() => {
                                        document.getElementById(`edit_answer_input0`).style.opacity = "1";
                                        setTimeout(() => {
                                            document.getElementById(`edit_answer_input1`).style.opacity = "1";
                                            setTimeout(() => {
                                                document.getElementById(`edit_answer_input2`).style.opacity = "1";
                                                setTimeout(() => {
                                                    document.getElementById(`edit_answer_input3`).style.opacity = "1";
                                                }, 100);
                                            }, 100);
                                        }, 100);
                                    }, 100);
                                }, 100);
                            }, 100);
                        }, 100);
                    }, 100);
                }
            }else{
                refreshCorrectAnswersCheckboxes();
            }
        });
    }

    correct_answers_inputs_div = document.getElementById("correct_answers_inputs_div");
    correct_answers_inputs_div.innerHTML = "";
    if(Array.isArray(drawer[id].shown_answers)){
        drawer[id].shown_answers = { answer: drawer[id].shown_answers };
    }
    if(Array.isArray(drawer[id].correct_answers)){
        drawer[id].correct_answers = { answer: drawer[id].correct_answers };
    }
    drawer[id].shown_answers.answer.forEach((correct_answer, index) => {

        const div = document.createElement("div");
        div.style.width = "fit-content";
        div.style.position = "relative";
        div.style.left = "50px";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.style.width = "25px";
        input.style.height = "25px";
        input.style.marginLeft = "0";
        input.style.cursor = "pointer";
        div.appendChild(input);

        const label = document.createElement("label");
        label.style.fontSize = "25px";
        label.style.position = "relative";
        label.style.bottom = "3px";
        label.style.left = "10px";
        div.appendChild(label);

        input.checked = drawer[id].correct_answers.answer.includes(correct_answer);
        label.innerHTML = correct_answer;

        correct_answers_inputs_div.appendChild(div);
    });

    document.getElementById("save_question_button").onclick = function() {
        const title = getMarkdownQuillContent();
        const type = document.getElementById("edit_question_type").value;
        const duration = document.getElementById("edit_question_duration").value;
        const language = document.getElementById("edit_question_language").value;
        const subject = document.getElementById("edit_question_subject").value;
        let shown_answers = [];
        for(let i = 0; i < 4; i++) {
            if(document.getElementById(`edit_answer_input${i}`).value != ""){
                shown_answers.push(document.getElementById(`edit_answer_input${i}`).value);
            }
        }
        if(shown_answers.length < 2){
            shown_answers = [];
            shown_answers.push(glossary["True"]);
            shown_answers.push(glossary["False"]);
        }
        const correct_answers = [];
        correct_answers_inputs_div.childNodes.forEach((div, index) => {
            if (div.childNodes[0].checked) {
                correct_answers.push(div.childNodes[1].innerHTML);
            }
        });

        socket.emit("editQuestion", { passcode, id, title, type, duration, shown_answers, correct_answers, language, subject });
        document.getElementById("edit_question_div").style.display = "none";
        document.getElementById("edit_div").style.display = "block";

    }

    document.getElementById("delete_question_button").onclick = function() {
        socket.emit("deleteQuestionInDrawer", { passcode, id });
        document.getElementById("edit_question_div").style.display = "none";
        document.getElementById("edit_div").style.display = "block";
    }

    document.getElementById("edit_question_div").scrollTop = 0;
      
}

function getMarkdownQuillContent() {
    let html = quill.root.innerHTML;
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        emDelimiter: '*',
    });

    // Rule for underline
    turndownService.addRule('underline', {
        filter: ['u'],
        replacement: function(content) {
          return '<u>' + content + '</u>';
        }
    });

    // Rule for stroked text
    turndownService.addRule('strikethrough', {
        filter: ['s', 'strike'],
        replacement: function (content) {
          return '~~' + content + '~~';
        }
    });
      
    // Rule for code blocks
    turndownService.addRule('codeBlock', {
        filter: 'pre',
        replacement: function (content) {
          return `\`\`\`
${content}\`\`\``;
        }
    });

    return turndownService.turndown(html)
    .replaceAll("\\\\", "¶")
    .replaceAll("\\*", "*")
    .replaceAll("\\_", "_")
    .replaceAll("\\{", "{")
    .replaceAll("\\}", "}")
    .replaceAll("\\[", "[")
    .replaceAll("\\]", "]")
    .replaceAll("\\(", "(")
    .replaceAll("\\)", ")")
    .replaceAll("\\#", "#")
    .replaceAll("\\+", "+")
    .replaceAll("\\-", "-")
    .replaceAll("\\.", ".")
    .replaceAll("\\!", "!")
    .replaceAll("¶", "\\");

}



// ---------------------- Functions Kahiin DB -------------------------

function searchDB() {
    document.getElementById("db_search_button").setAttribute("disabled", true);
    document.getElementById("db_search_results_div").innerHTML = "";
    if(document.getElementById("db_search_switch").checked){
        const subject = document.getElementById("search_db_question_subject").value;
        const language = document.getElementById("search_db_question_language").value;
        const id_question = document.getElementById("search_db_question_id_question").value;
        const id_acc = document.getElementById("search_db_question_id_acc").value;
        const title = document.getElementById("search_db_question_title").value;
        const duration = document.getElementById("search_db_question_duration").value;
        const type = document.getElementById("search_db_question_type").value;

        const params = { subject, language, id_question, id_acc, title, duration, type };
        const filteredParams = Object.fromEntries(
            Object.entries(params).filter(([key, value]) => value !== "" && value !== "none")
        );

        searchQuestions(filteredParams)
            .then(data => {
                let space = document.createElement('div');
                space.style.height = "25px";
                document.getElementById("db_search_results_div").appendChild(space);
                data.forEach(question => {
                    const user_p = document.createElement('p');
                    if(question.username == null || question.username == ""){
                        user_p.innerHTML = glossary["Anonymous"];
                    }else if(question.user_academy == null || question.user_academy == ""){
                        user_p.innerHTML = `${question.username}`;
                    }else{
                        user_p.innerHTML = `${question.username} <label style="color: grey;">(${question.user_academy})</label>`;
                    }
                    user_p.classList.add('user_p');
                    user_p.style.marginLeft = "25px";
                    document.getElementById("db_search_results_div").appendChild(user_p);

                    const questionElement = document.createElement('div');
                    questionElement.classList.add('question');
                    questionElement.style.cursor = "default";
                    questionElement.style.textAlign = "center";
                    questionElement.style.height = "50px";
                    questionElement.style.backgroundColor = "light-dark(#f4f4f4,#383838)";

                    const questionTitle = question.title
                        .split('\n')
                        .map(line => line.trim().replace(/\s+/g, ' '))
                        .join('\n');
                    questionElement.innerHTML = marked(questionTitle);
                    renderMathInElement(questionElement, {
                        delimiters: [
                            {left: "\$", right: "\$", display: false},
                            {left: "\$$", right: "\$$", display: true}
                        ]
                    });
                    hljs.highlightAll();
                    questionElement.title = `ID: ${question.id_question}`;

                    const barcodeButton = document.createElement('img');
                    barcodeButton.style.right = "12px";
                    barcodeButton.classList.add('barcode-button');
                    barcodeButton.src = '/static/icon/barcode.svg';
                    barcodeButton.title = glossary["OtherData"];
                    barcodeButton.addEventListener('click', () => {
                        showQuestionInfos({
                            "@type": question.type,
                            "@duration": question.duration,
                            "shown_answers": question.shown_answers,
                            "correct_answers": question.correct_answers,
                            "title": question.title,
                            "language": question.language,
                            "subject": question.subject
                        });
                    });
                    questionElement.appendChild(barcodeButton);

                    const downloadButton = document.createElement('img');
                    downloadButton.style.right = "62px";
                    downloadButton.classList.add('download-button');
                    downloadButton.src = '/static/icon/download.svg';
                    downloadButton.title = glossary["DownloadQuestion"];
                    downloadButton.addEventListener('click', () => {
                        delete question["id_acc"];
                        delete question["id_question"];
                        socket.emit("downloadQuestion", { passcode, question });
                    });
                    questionElement.appendChild(downloadButton);

                    document.getElementById("db_search_results_div").appendChild(questionElement);
                });
                space = document.createElement('div');
                space.style.height = "25px";
                document.getElementById("db_search_results_div").appendChild(space);
                updateDyslexicFonts(dyslexicMode);
            })
            .catch(error => {
            console.error('Error searching questions:', error);
            });
    }else{
        const name = document.getElementById("search_db_quiz_name").value;
        const subject = document.getElementById("search_db_quiz_subject").value;
        const language = document.getElementById("search_db_quiz_language").value;
        const id_file = document.getElementById("search_db_quiz_id_file").value;
        const id_acc = document.getElementById("search_db_quiz_id_acc").value;

        const params = { name, subject, language, id_file, id_acc };
        const filteredParams = Object.fromEntries(
            Object.entries(params).filter(([key, value]) => value !== "" && value !== "none")
        );

        searchQuizzes(filteredParams)
            .then(data => {
                let space = document.createElement('div');
                space.style.height = "25px";
                document.getElementById("db_search_results_div").appendChild(space);
                data.forEach(data => {
                    const user_p = document.createElement('p');
                    if(data.username == null || data.username == ""){
                        user_p.innerHTML = glossary["Anonymous"];
                    }else if(data.user_academy == null || data.user_academy == ""){
                        user_p.innerHTML = `${data.username}`;
                    }else{
                        user_p.innerHTML = `${data.username} <label style="color: grey;">(${data.user_academy})</label>`;
                    }
                    user_p.classList.add('user_p');
                    document.getElementById("db_search_results_div").appendChild(user_p);
                    
                    const quizElement = document.createElement('div');
                    quizElement.classList.add('question');
                    quizElement.style.marginBottom = "5px";
                    quizElement.style.padding = "10px";
                    quizElement.style.fontSize = "25px";
                    quizElement.style.height = "25px";
                    quizElement.style.maxHeight = "none";
                    quizElement.style.cursor = "default";
                    quizElement.style.textAlign = "center";
                    quizElement.innerHTML = data.name;
                    quizElement.title = `ID: ${data.id_file}`;
                    quizElement.style.backgroundColor = "light-dark(#f4f4f4,#383838)";

                    const downloadButton = document.createElement('img');
                    downloadButton.classList.add('download-button');
                    downloadButton.src = '/static/icon/download.svg';
                    downloadButton.title = glossary["DownloadQuiz"];
                    downloadButton.style.top = "8px";
                    downloadButton.style.right = "8px";
                    downloadButton.style.width = "30px";
                    downloadButton.addEventListener('click', () => {
                        socket.emit("downloadQuiz", { passcode, quiz_id: data.id_file, token: localStorage.getItem('token') });
                    });
                    quizElement.appendChild(downloadButton);

                    const more_p = document.createElement('p');
                    flags = {en: "🇬🇧", fr: "🇫🇷", es: "🇪🇸", it: "🇮🇹", de: "🇩🇪"};
                    more_p.innerHTML = flags[data.language] + " " + data.subject;
                    more_p.style.position = "absolute";
                    more_p.style.left = "10px";
                    more_p.style.top = "10px";
                    more_p.style.color = "light-dark(#666, #aaa)";
                    more_p.style.fontSize = "20px";
                    quizElement.appendChild(more_p);

                    document.getElementById("db_search_results_div").appendChild(quizElement);
                });
                space = document.createElement('div');
                space.style.height = "25px";
                document.getElementById("db_search_results_div").appendChild(space);
                updateDyslexicFonts(dyslexicMode);
            })
            .catch(error => {
            console.error('Error searching quizzes:', error);
            });
    }
    updateDyslexicFonts(dyslexicMode);
}

function enableDBSearchButton() {
    document.getElementById("db_search_button").removeAttribute("disabled");
}

function updateSearchInputs() {
    enableDBSearchButton();
    document.getElementById("db_search_results_div").innerHTML = "";
    if(document.getElementById("db_search_switch").checked){
        document.getElementById("db_search_quizzes_div").style.display = "none";
        document.getElementById("db_search_questions_div").style.display = "block";
        
        document.getElementById("search_db_question_subject").placeholder = glossary["Subject"];
        document.getElementById("search_db_question_subject").value = "";
        document.getElementById("search_db_question_language").placeholder = glossary["Language"];
        document.getElementById("search_db_question_language").value = "none";
        document.getElementById("search_db_question_id_question").placeholder = glossary["QuestionID"];
        document.getElementById("search_db_question_id_question").value = "";
        document.getElementById("search_db_question_id_acc").placeholder = glossary["AccountID"];
        document.getElementById("search_db_question_id_acc").value = "";
        document.getElementById("search_db_question_title").placeholder = glossary["Title"];
        document.getElementById("search_db_question_title").value = "";
        document.getElementById("search_db_question_duration").placeholder = glossary["Duration"];
        document.getElementById("search_db_question_duration").value = "";
        document.getElementById("search_db_question_type").placeholder = glossary["Type"];
        document.getElementById("search_db_question_type").value = "none";
    }else{
        document.getElementById("db_search_quizzes_div").style.display = "block";
        document.getElementById("db_search_questions_div").style.display = "none";

        document.getElementById("search_db_quiz_name").placeholder = glossary["QuizName"];
        document.getElementById("search_db_quiz_name").value = "";
        document.getElementById("search_db_quiz_subject").placeholder = glossary["Subject"];
        document.getElementById("search_db_quiz_subject").value = "";
        document.getElementById("search_db_quiz_language").placeholder = glossary["Language"];
        document.getElementById("search_db_quiz_language").value = "none";
        document.getElementById("search_db_quiz_id_file").placeholder = glossary["QuizID"];
        document.getElementById("search_db_quiz_id_file").value = "";
        document.getElementById("search_db_quiz_id_acc").placeholder = glossary["AccountID"];
        document.getElementById("search_db_quiz_id_acc").value = "";
    }
}

function loadMyPosts() {
    document.getElementById("db_search_switch").addEventListener("change", updateSearchInputs);

    document.getElementById("db_quizzes_drawer").innerHTML = "";
    document.getElementById("db_questions_drawer").innerHTML = "";
    document.getElementById("db_posted_quizzes_div").innerHTML = "";
    document.getElementById("db_posted_questions_div").innerHTML = "";
    quizzes.forEach(quiz => {
        const quizElement = document.createElement('div');
        quizElement.classList.add('drawer-question');
        quizElement.innerHTML = quiz.substring(0, 20) + "...";
        quizElement.style.cursor = "default";
        quizElement.style.backgroundColor = "light-dark(white, #595959)";

        uploadButton = document.createElement('button');
        uploadImg = document.createElement('img');
        uploadImg.src = '/static/icon/upload.svg';
        uploadButton.appendChild(uploadImg);
        uploadButton.addEventListener('click', () => {
            socket.emit("uploadQuiz", { passcode, quiz, token: localStorage.getItem('token') });
            enableDBSearchButton();
        });
        quizElement.appendChild(uploadButton);

        document.getElementById("db_quizzes_drawer").appendChild(quizElement);
    });
    drawer.forEach((question, index) => {
        const drawerElement = document.createElement('div');
        drawerElement.classList.add('drawer-question');
        drawerElement.innerHTML = question.title.substring(0, 20) + "...";
        drawerElement.style.cursor = "default";
        drawerElement.style.backgroundColor = "light-dark(white, #595959)";

        uploadButton = document.createElement('button');
        uploadImg = document.createElement('img');
        uploadImg.src = '/static/icon/upload.svg';
        uploadButton.appendChild(uploadImg);
        uploadButton.addEventListener('click', () => {
            uploadQuestion(question.subject, question.language, question.title, question.shown_answers, question.correct_answers, question.duration, question.type).then(res => {
                loadMyPosts();
                enableDBSearchButton();
            });
        });
        drawerElement.appendChild(uploadButton);

        document.getElementById("db_questions_drawer").appendChild(drawerElement);
    });

    getMyPosts().then(res => {
        let space = document.createElement('div');
        space.style.height = "25px";
        document.getElementById("db_posted_quizzes_div").appendChild(space);
        res.quizzes.forEach(quiz => {
            const quizElement = document.createElement('div');
            quizElement.classList.add('question');
            quizElement.style.marginBottom = "5px";
            quizElement.style.padding = "10px";
            quizElement.style.fontSize = "25px";
            quizElement.style.height = "25px";
            quizElement.style.maxHeight = "none";
            quizElement.style.cursor = "default";

            const quizTitle = quiz.name
                .split('\n')
                .map(line => line.trim().replace(/\s+/g, ' '))
                .join('\n');
            
            quizElement.innerHTML = quizTitle;
            quizElement.title = `ID: ${quiz.id_file}`;

            const trashButton = document.createElement('img');
            trashButton.classList.add('trash-button');
            trashButton.src = '/static/icon/trash.svg';
            trashButton.title = glossary["DeleteQuiz"];
            trashButton.style.top = "8px";
            trashButton.style.right = "8px";
            trashButton.style.width = "30px";
            trashButton.addEventListener('click', () => {
                deleteQuiz(quiz.id_file).then(res => {
                    loadMyPosts();
                    enableDBSearchButton();
                });
            });
            quizElement.appendChild(trashButton);

            const downloadButton = document.createElement('img');
            downloadButton.classList.add('download-button');
            downloadButton.src = '/static/icon/download.svg';
            downloadButton.title = glossary["DownloadQuiz"];
            downloadButton.style.top = "8px";
            downloadButton.style.right = "42px";
            downloadButton.style.width = "30px";
            downloadButton.addEventListener('click', () => {
                socket.emit("downloadQuiz", { passcode, quiz_id: quiz.id_file, token: localStorage.getItem('token') });
            });
            quizElement.appendChild(downloadButton);

            const more_p = document.createElement('p');
            flags = {en: "🇬🇧", fr: "🇫🇷", es: "🇪🇸", it: "🇮🇹", de: "🇩🇪"};
            more_p.innerHTML = flags[quiz.language] + " " + quiz.subject;
            more_p.style.position = "absolute";
            more_p.style.left = "10px";
            more_p.style.top = "10px";
            more_p.style.color = "light-dark(#666, #aaa)";
            more_p.style.fontSize = "20px";
            quizElement.appendChild(more_p);
            
            document.getElementById("db_posted_quizzes_div").appendChild(quizElement);
            updateDyslexicFonts(dyslexicMode);
        });
        space = document.createElement('div');
        space.style.height = "25px";
        document.getElementById("db_posted_quizzes_div").appendChild(space);

        res.questions.forEach(question => {
            const questionElement = document.createElement('div');
            questionElement.classList.add('question');
            questionElement.style.marginTop = "25px";
            questionElement.style.cursor = "default";

            const questionTitle = question.title
                .split('\n')
                .map(line => line.trim().replace(/\s+/g, ' '))
                .join('\n');
            questionElement.innerHTML = marked(questionTitle);
            renderMathInElement(questionElement, {
                delimiters: [
                    {left: "\$", right: "\$", display: false},
                    {left: "\$$", right: "\$$", display: true}
                ]
            });
            hljs.highlightAll();
            questionElement.title = `ID: ${question.id_question}`;

            const trashButton = document.createElement('img');
            trashButton.classList.add('trash-button');
            trashButton.src = '/static/icon/trash.svg';
            trashButton.title = glossary["DeleteQuestion"];
            trashButton.addEventListener('click', () => {
                deleteQuestion(question.id_question).then(res => {
                    loadMyPosts();
                    enableDBSearchButton();
                });
            });
            questionElement.appendChild(trashButton);

            const barcodeButton = document.createElement('img');
            barcodeButton.classList.add('barcode-button');
            barcodeButton.src = '/static/icon/barcode.svg';
            barcodeButton.title = glossary["OtherData"];
            barcodeButton.addEventListener('click', () => {
                showQuestionInfos({
                    "@type": question.type,
                    "@duration": question.duration,
                    "shown_answers": question.shown_answers,
                    "correct_answers": question.correct_answers,
                    "title": question.title,
                    "language": question.language,
                    "subject": question.subject
                });
            });
            questionElement.appendChild(barcodeButton);

            const downloadButton = document.createElement('img');
            downloadButton.classList.add('download-button');
            downloadButton.src = '/static/icon/download.svg';
            downloadButton.title = glossary["DownloadQuestion"];
            downloadButton.addEventListener('click', () => {
                delete question["id_acc"];
                delete question["id_question"];
                socket.emit("downloadQuestion", { passcode, question });
            });
            questionElement.appendChild(downloadButton);

            document.getElementById("db_posted_questions_div").appendChild(questionElement);
            updateDyslexicFonts(dyslexicMode);
        });
    });
    updateDyslexicFonts(dyslexicMode);
}

// ---------------------- Functions Navigation -------------------------
function navigate(index) {
    document.getElementById("edit_popup_container").style.display = "none";
    const elementsToHide = ["play_div", "settings_div", "create_div", "kahiin_db_message_div", "kahiin_db_div", "edit_div", "edit_question_div", "edit_popup_container", "login_div","signup_div", "account_div"];
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
                const quiz_select_list = document.getElementById("quiz_select_list");
                const quiz_edit_list = document.getElementById("quiz_edit_list");
                quiz_select_list.innerHTML = "";
                quiz_edit_list.innerHTML = "";
                quizzes.forEach(quiz => {
                    quiz_select_list.innerHTML += `<button onclick="selectQuiz('${quiz}')" id="${quiz}" class="quiz">${quiz}</button>`;
                    quiz_edit_list.innerHTML += `<button onclick="editQuiz('${quiz}')" id="${quiz}" class="quiz">${quiz}</button>`;
                });
                document.getElementById("create_div").style.display = "block";
                break;
            case 2:
                document.getElementById("db_search_switch").checked = false;
                updateSearchInputs();
                loadMyPosts();
                break;
            case 3:
                document.getElementById("settings_div").style.display = "block";
                document.getElementById('new_password').placeholder = glossary["NewPassword"];
                document.getElementById('repeat_new_password').placeholder = glossary["ConfirmNewPassword"];
                break;
            case 4:
                document.getElementById('apply_user_infos_button').setAttribute('disabled', 'true'); 
                if (localStorage.getItem('token') != null){ //modifier test (l'actuel sert juste à tester la fonction)
                    getInfos()
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
    const searchText = document.getElementById(`search_${page}_quiz`).value;
    document.querySelectorAll(`#quiz_${page}_list .quiz`).forEach(element => {
        if (element.innerHTML.toLowerCase().includes(searchText.toLowerCase())) {
            element.style.display = "block";
        } else {
            element.style.display = "none";
        }
    });
}
// ---------------------- Fuctions DB Account -------------------------

function loginPage() {
    login(document.getElementById("login_email").value,hashSHA256(document.getElementById("login_password").value))
};

function signupPage() {
    if (document.getElementById("signup_password").value == document.getElementById("signup_verify").value) {
        if (document.getElementById("signup_password").value.length >= 8) {
            signup(document.getElementById("signup_email").value, hashSHA256(document.getElementById("signup_password").value))
        } else {
            alertError(glossary["PasswordMustBe8Characters"]);
        }
    } else {
        alertError(glossary["PasswordsDontMatch"]);
    }
}

function resetPasswordPage() {
    if (document.getElementById("new_account_password").value == document.getElementById("confirm_new_account_password").value) {
        if (document.getElementById("new_account_password").value.length >= 8) {
            resetPassword(hashSHA256(document.getElementById("new_account_password").value));
            document.getElementById("new_account_password").value = "";
            document.getElementById("confirm_new_account_password").value = "";
            setTimeout(() => {
                navigate(4);
            }, 1000);
        } else {
            alertError(glossary["PasswordMustBe8Characters"]);
        }
    } else {
        alertError(glossary["PasswordsDontMatch"]);
    }
}

function deleteAccountPage() {
    deleteAccount(hashSHA256(document.getElementById("password_delete_account").value)).then(res => {
        if(typeof res == "object"){
            if("message" in res){
                if(res.message == "Account deleted successfully"){
                    alertSuccess(glossary["AccountDeleted"]);
                    logout();
                }
            }
        }
    });
}

function editInfosPage() {
    editInfos(document.getElementById("info_name").value, document.getElementById("info_academy").value)
    document.getElementById('apply_user_infos_button').setAttribute('disabled', 'true'); 
}

function logout(){
    localStorage.clear();
    location.reload();
}

// ---------------------- socket.io Main -------------------------

function setupSocketListeners() {
    socket.on("error", (res) => {
        if (res == "InvalidPasscode") {
            const elementsToHide = ["nav", "play_div", "settings_div", "create_div", "edit_div"];
            elementsToHide.forEach(element => {
                document.getElementById(element).style.display = "none";
            });
            const elementsToShow = ["form", "error"];
            elementsToShow.forEach(element => {
                document.getElementById(element).style.display = "block";
            });
            document.getElementById("passcode").value = "";
            document.getElementById("error").innerHTML = glossary[res];
        } else if (res == "EmptyName" || res == "SpecialCharacters" || res == "AlreadyExists") { 
            alert(glossary[res]);
            if(editing_quiz.endsWith(".khn")){
                editing_quiz = editing_quiz.substring(0, editing_quiz.length - 4);
            }
            document.getElementById("edit_quiz_name").value = editing_quiz;
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

        settings = res;
        dyslexicMode = res.dyslexicMode
        updateDyslexicFonts(dyslexicMode);
    });

    socket.on("glossary", (res) => {
        glossary = res;
    });

    socket.on("hostConnected", (res) => {
        document.getElementById("form").style.display = "none";
        document.getElementById("nav").style.display = "block";
        socket.emit("listQuiz", { passcode });
    });

    // ---------------------- socket.io Game -------------------------

    socket.on("startGame", (res) => {
        question_count = 0;
        socket.emit("nextQuestion", { passcode, question_count });
        const elementsToHide = ["start_game", "get_spreadsheet", "start_game_will_remove_data", "show_leaderboard"];
        elementsToHide.forEach(element => {
            document.getElementById(element).style.display = "none";
        });
        const elementsToShow = ["next_question", "show_leaderboard","skip_question","pause_question","question_number"];
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
        const elementsToDisable = ["skip_question","pause_question"];
        elementsToDisable.forEach(element => {
            document.getElementById(element).setAttribute("disabled", true);
        });
    });

    socket.on("gameEnd", (res) => {
        const elementsToShow = ["restart_all", "get_spreadsheet", "start_game_will_remove_data"];
        elementsToShow.forEach(element => {
            document.getElementById(element).style.display = "block";
        });
        const elementsToHide = ["next_question", "show_leaderboard","skip_question","pause_question","question_number"];
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
        csv_link.download = `${res.quiz_name}_leaderboard_${formattedDate}.csv`;
        document.body.appendChild(csv_link);
        csv_link.click();
        document.body.removeChild(csv_link);
        window.URL.revokeObjectURL(url);
    });

    // ---------------------- socket.io Create -------------------------

    socket.on("ListOfQuiz", (res) => {
        const quiz_select_list = document.getElementById("quiz_select_list");
        const quiz_edit_list = document.getElementById("quiz_edit_list");
        quiz_select_list.innerHTML = "";
        quiz_edit_list.innerHTML = "";
        quizzes = res.quizzes;
        res.quizzes.forEach(quiz => {
            quiz_select_list.innerHTML += `<button onclick="selectQuiz('${quiz}')" id="${quiz}" class="quiz">${quiz}</button>`;
            quiz_edit_list.innerHTML += `<button onclick="editQuiz('${quiz}')" id="${quiz}" class="quiz">${quiz}</button>`;
        });
    });

    socket.on("deletedQuiz", (res) => {
        socket.emit("listQuiz", { passcode });
        navigate(1);
    });

    socket.on("wholeQuiz", (res) => {
        document.getElementById('dropbox').innerHTML = '';
        quiz = JSON.parse(res);
        questions = quiz.questions;
        previous_quiz_subject = quiz.subject;
        document.getElementById("edit_quiz_subject_input").value = quiz.subject;
        document.getElementById("edit_quiz_language_select").value = quiz.language;
        
        if(questions == null || questions.length == 0){
            createDroppableSpace(0);
            document.getElementById("dropbox").children[0].style.height = "100%";
            document.getElementById("dropbox").children[0].style.margin = "0";
            document.getElementById("dropbox").children[0].innerHTML = `<p>${glossary["DropQuestionsHere"]}</p>`;
            updateDyslexicFonts(dyslexicMode);
        } else {
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
                    socket.emit('deleteQuestion', { passcode, index, quiz_name: editing_quiz });
                });
                question_div.appendChild(trashButton);
    
                const barcodeButton = document.createElement('img');
                barcodeButton.classList.add('barcode-button');
                barcodeButton.src = '/static/icon/barcode.svg';
                barcodeButton.title = glossary["OtherData"];
                barcodeButton.addEventListener('click', () => {
                    showQuestionInfosFromDrawer(index);
                });
                question_div.appendChild(barcodeButton);
    
            });
            createDroppableSpace(questions.length);
            allDroppableSpaces = document.querySelectorAll('.droppable-space');
            allDroppableSpaces[allDroppableSpaces.length - 1].style.height = `calc(100% - ${118 * questions.length + 25}px)`;
            allDroppableSpaces[allDroppableSpaces.length - 1].style.minHeight = "25px";
            updateDyslexicFonts(dyslexicMode);
        }
    });

    function updateDrawer(res){
        drawer = res;
        const drawer_div = document.getElementById('questions_drawer');
        drawer_div.innerHTML = '';
        document.getElementById("new_question_button").onclick = function() {
            socket.emit('newQuestion', { passcode });
        }
        res.forEach((question, index) => {
            const drawer_question = createDrawerQuestionElement(index, question.title.substring(0, 20) + "...");
            drawer_div.appendChild(drawer_question);
            drawer_question.addEventListener('dragstart', (e) => {
                draggedQuestion = e.target.getAttribute('question-id');
            });
        });
        updateDyslexicFonts(dyslexicMode);
    }
    socket.on("drawer", (res) => {
        updateDrawer(res);
    });

    socket.on("questionAdded", (res) => {
        updateDrawer(res);
        editQuestion(drawer.length - 1);
    });

    socket.on("editingQuiz", (res) => {
        editing_quiz = res;
    });

    socket.on("quizUploaded", (res) => {
        loadMyPosts();
    });

    socket.on("questionDownloaded", (res) => {
        drawer = res;
        loadMyPosts();
    });

    socket.on("quizDownloaded", (res) => {
        quizzes = res;
        loadMyPosts();
    });

    socket.on("restart", (res) => {
        location.reload(true);
    });

}

function restartAll(){
    socket.emit("restartAll", { passcode });
}