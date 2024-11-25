// Client-side functions to interact with the API

const address = "http://localhost:5000/";

// Signup function
function signup(email, password_hash) {
    return fetch(address + 'signup', {
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
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        return data; // Traitez les données ici
    })
    .catch(error => {
        console.error(error);
    });
}

// Login function
function login(email, password_hash) {
    return fetch(address + 'login', {
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
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        localStorage.setItem('token', data.token);
        return {"message": "Logged in successfully"};
    })
    .catch(error => {
        console.error(error);
    });
}

// Reset Password
function resetPassword(new_password_hash) {
    return fetch('http://localhost:5000/reset-password', {
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
        return data; // Traitez les données ici
    })
    .catch(error => {
        console.error(error);
    });
}

// Delete Account
function deleteAccount(password) {
    return fetch('http://localhost:5000/account', {
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
    .catch(error => {
        console.error(error);
    });
}

// Search Quizzes
function searchQuizzes(params) {
    return fetch('http://localhost:5000/quiz', {
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'token': localStorage.getItem('token'),
            'params': params
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
    .catch(error => {
        console.error(error);
    });
}

// Search Questions
function searchQuestions(params) {
    return fetch('http://localhost:5000/questions', {
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'token': localStorage.getItem('token'),
            'params': params
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
    .catch(error => {
        console.error(error);
    });
}

// Get Specific Question Content
function getQuestionContent(id_question) {
    return fetch('http://localhost:5000/question-content', {
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
    .catch(error => {
        console.error(error);
    });
}

// Upload a New Question
function uploadQuestion(subject, language, title, shown_answers, correct_answers, duration, type) {
    return fetch('http://localhost:5000/question', {
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
    .catch(error => {
        console.error(error);
    });
}

// Delete Quiz
function deleteQuiz(id_file) {
    return fetch('http://localhost:5000/quiz', {
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
    .catch(error => {
        console.error(error);
    });
}

// Delete Question
function deleteQuestion(id_question) {
    return fetch('http://localhost:5000/question', {
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
    .catch(error => {
        console.error(error);
    });
}