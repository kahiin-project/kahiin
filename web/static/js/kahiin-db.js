// Client-side functions to interact with the API

const kahiin_db_address = "http://localhost:5000/";

// Signup function
function signup(email, password_hash) {
    return fetch(kahiin_db_address + 'signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'email': email,
            'password_hash': password_hash
        })
    })
    .then(response => {
        if (!response.ok) {
            printError("An error has occured");
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        document.getElementById("signup_div").style.display = "none";
        document.getElementById("login_div").style.display = "block";
        return data; // Traitez les données ici
    })
}

// Login function
function login(email, password_hash) {
    return fetch(kahiin_db_address + 'login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'email': email,
            'password_hash': password_hash
        })
    })
    .then(response => {
        if (!response.ok) {
            printError("An error has occured");
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        localStorage.setItem('token', data.token);
        getInfos()
        document.getElementById("login_div").style.display = "none";
        document.getElementById("account_div").style.display = "block";
        return {"message": "Logged in successfully"};
        
    })
}

// Reset Password
function resetPassword(new_password_hash) {
    return fetch(kahiin_db_address + 'reset-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'token': localStorage.getItem('token'),
            'new_password_hash': new_password_hash
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        localStorage.clear();
        return data;
    })
}

//Modify User Infos
function editInfos(name, academy) {
    return fetch(kahiin_db_address + 'editInfos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'token': localStorage.getItem('token'),
            'name': name,
            'academy': academy
        })
    })
    .then(response => {
        if (!response.ok) {
            printError("An error has occured");
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        return data;
    })
}

//Modify User Infos
function getInfos() {
    return fetch(kahiin_db_address + 'getInfos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'token': localStorage.getItem('token')
        })
    })
    .then(response => {
        if (!response.ok) {
            printError("An error has occured");
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        document.getElementById("info_name").value = data.name
        document.getElementById("info_academy").value = data.academy
    })
}

// Delete Account
function deleteAccount(password) {
    return fetch(kahiin_db_address + 'account', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'token': localStorage.getItem('token'),
            'password': password
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        return data; // Traitez les données ici
    })
}

// Search Quizzes
function searchQuizzes(params) {
    const url = new URL(kahiin_db_address + 'quiz');
    url.search = new URLSearchParams({
        'token': localStorage.getItem('token'),
        ...params
    }).toString();

    return fetch(url, {
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        return data; // Traitez les données ici
    })
}

// Search Questions
function searchQuestions(params) {
    const url = new URL(kahiin_db_address + 'questions');
    url.search = new URLSearchParams({
        'token': localStorage.getItem('token'),
        ...params
    }).toString();

    return fetch(url, {
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        return data; // Traitez les données ici
    })
}

// Get Specific Question Content
function getQuestionContent(id_question) {
    const url = new URL(kahiin_db_address + 'question-content');
    url.search = new URLSearchParams({
        'token': localStorage.getItem('token'),
        'id_question': id_question
    }).toString();

    return fetch(url, {
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        return data; // Traitez les données ici
    })
}

// Get My Posts
function getMyPosts() {
    const token = localStorage.getItem('token');
    const url = new URL(kahiin_db_address + 'myposts');
    url.searchParams.append('token', token);

    return fetch(url, {
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        return data; // Traitez les données ici
    })
}

// Upload a New Question
function uploadQuestion(subject, language, title, shown_answers, correct_answers, duration, type) {
    return fetch(kahiin_db_address + 'question', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'token': localStorage.getItem('token'),
            'question': {
                'subject': subject,
                'language': language,
                'title': title,
                'shown_answers': shown_answers,
                'correct_answers': correct_answers,
                'duration': duration,
                'type': type
            }
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        return data; // Traitez les données ici
    })
}

// Delete Quiz
function deleteQuiz(id_file) {
    return fetch(kahiin_db_address + 'quiz', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'token': localStorage.getItem('token'),
            'id_file': id_file
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        return data; // Traitez les données ici
    })
}

// Delete Question
function deleteQuestion(id_question) {
    return fetch(kahiin_db_address + 'question', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'token': localStorage.getItem('token'),
            'id_question': id_question
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        return data; // Traitez les données ici
    })
}