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
        return response.text().then(data => {
            switch (response.status) {
                case 200: // Success
                    data = JSON.parse(data);
                    document.getElementById("signup_div").style.display = "none";
                    document.getElementById("login_div").style.display = "block";
                    alertSuccess(glossary["VerificationEmailSent"]);
                    return data;
                case 400: // Invalid data structure or type
                    switch (JSON.parse(data).error) {
                        case 'Invalid data structure':
                            alertError(glossary["FillAllFields"]);
                            break;
                        case 'Invalid data type for email':
                            alertError(glossary["InvalidEmail"]);
                            break;
                        case 'Password can\'t be empty':
                            alertError(glossary["PasswordEmpty"]);
                            break;
                        default:
                            alertError(glossary["UnknownError"]);
                    }
                    break;
                case 401: // Unauthorized email
                    alertError(glossary["UnauthorizedEmail"]);
                    break;
                case 409: // Email already in use
                    alertError(glossary["EmailInUse"]);
                    break;
                default: // Other HTTP errors
                    throw new Error('HTTP error ' + response.status + ' : ' + response.statusText);
            }
        });
    });
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
        return response.text().then(data => {
            switch (response.status) {
                case 200: // Success
                    localStorage.setItem('token', JSON.parse(data).token);
                    getInfos();
                    document.getElementById("login_div").style.display = "none";
                    document.getElementById("account_div").style.display = "block";
                    return { "message": "Logged in successfully" };
                case 400: // Invalid data structure
                    alertError(glossary["IncorrectEmailOrPassword"]);
                    break;
                case 401: // Invalid email or password
                    alertError(glossary["IncorrectEmailOrPassword"]);
                    break;
                default: // Other HTTP errors
                    throw new Error('HTTP error ' + response.status + ' : ' + response.statusText);
            }
        });
    });
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
        return response.text().then(data => {
            switch (response.status) {
                case 200: // Success
                    localStorage.clear();
                    alertSuccess(glossary["VerificationEmailSent"]);
                    return JSON.parse(data);
                case 400: // Invalid data structure or type
                    switch (JSON.parse(data).error) {
                        case 'Invalid data structure':
                            alertError(glossary["FillAllFields"]);
                            break;
                        case 'Invalid data type for new_password_hash':
                            alertError(glossary["InvalidPassword"]);
                            break;
                        default:
                            alertError(glossary["UnknownError"]);
                    }
                    break;
                case 401: // Invalid token
                    alertError(glossary["InvalidToken"]);
                    break;
                case 404: // Email not found
                    alertError(glossary["EmailNotFound"]);
                    break;
                default: // Other HTTP errors
                    throw new Error('HTTP error ' + response.status + ' : ' + response.statusText);
            }
        });
    });
}

// Modify User Infos
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
        return response.text().then(data => {
            switch (response.status) {
                case 200: // Success
                    alertSuccess(glossary["UserInfosUpdated"]);
                    return JSON.parse(data);
                case 400: // Invalid data structure or type
                    switch (JSON.parse(data).error) {
                        case 'Invalid data structure':
                            alertError(glossary["FillAllFields"]);
                            break;
                        case 'Invalid data type for name or academy':
                            alertError(glossary["InvalidData"]);
                            break;
                        default:
                            alertError(glossary["UnknownError"]);
                    }
                    break;
                case 401: // Invalid token
                    alertError(glossary["InvalidToken"]);
                    break;
                default: // Other HTTP errors
                    throw new Error('HTTP error ' + response.status + ' : ' + response.statusText);
            }
        });
    });
}

// Get User Infos
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
        return response.text().then(data => {
            switch (response.status) {
                case 200: // Success
                    const parsed = JSON.parse(data);
                    document.getElementById("account_h1").innerHTML = `${glossary["Account"]} <label style="color: grey; font-size: 30px;">(id ${parsed.id_acc})</label>`;
                    document.getElementById("info_name").value = parsed.name;
                    document.getElementById("info_academy").value = parsed.academy;
                    return parsed;
                case 400: // Invalid data structure or type
                    switch (JSON.parse(data).error) {
                        case 'Invalid data structure':
                            alertError(glossary["FillAllFields"]);
                            break;
                        default:
                            alertError(glossary["UnknownError"]);
                    }
                    break;
                case 401: // Invalid token
                    alertError(glossary["InvalidToken"]);
                    break;
                default: // Other HTTP errors
                    throw new Error('HTTP error ' + response.status + ' : ' + response.statusText);
            }
        });
    });
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
        return response.text().then(data => {
            switch (response.status) {
                case 200: // Success
                    return JSON.parse(data);
                case 400: // Invalid data structure or type
                    switch (JSON.parse(data).error) {
                        case 'Invalid data structure':
                            alertError(glossary["FillAllFields"]);
                            break;
                        case 'Invalid data type for token or password':
                            alertError(glossary["InvalidData"]);
                            break;
                        default:
                            alertError(glossary["UnknownError"]);
                    }
                    break;
                case 401: // Invalid token or password
                    switch (JSON.parse(data).error) {
                        case 'Invalid token':
                            alertError(glossary["InvalidToken"]);
                            break;
                        case 'Invalid password':
                            alertError(glossary["IncorrectPassword"]);
                            break;
                        default:
                            alertError(glossary["UnknownError"]);
                    }
                    break;
                default: // Other HTTP errors
                    throw new Error('HTTP error ' + response.status + ' : ' + response.statusText);
            }
        });
    });
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
        return response.text().then(data => {
            switch (response.status) {
                case 200: // Success
                    return JSON.parse(data);
                case 400: // Invalid data structure or type
                    switch (JSON.parse(data).error) {
                        case 'Invalid data structure':
                            alertError(glossary["FillAllFields"]);
                            break;
                        default:
                            alertError(glossary["UnknownError"]);
                    }
                    break;
                case 401: // Invalid token
                    alertError(glossary["InvalidToken"]);
                    break;
                default: // Other HTTP errors
                    throw new Error('HTTP error ' + response.status + ' : ' + response.statusText);
            }
        });
    });
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
        return response.text().then(data => {
            switch (response.status) {
                case 200: // Success
                    return JSON.parse(data);
                case 400: // Invalid data structure or type
                    switch (JSON.parse(data).error) {
                        case 'Invalid data structure':
                            alertError(glossary["FillAllFields"]);
                            break;
                        default:
                            alertError(glossary["UnknownError"]);
                    }
                    break;
                case 401: // Invalid token
                    alertError(glossary["InvalidToken"]);
                    break;
                default: // Other HTTP errors
                    throw new Error('HTTP error ' + response.status + ' : ' + response.statusText);
            }
        });
    });
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
        return response.text().then(data => {
            switch (response.status) {
                case 200: // Success
                    return JSON.parse(data);
                case 400: // Invalid data structure or type
                    switch (JSON.parse(data).error) {
                        case 'Invalid data structure':
                            alertError(glossary["FillAllFields"]);
                            break;
                        default:
                            alertError(glossary["UnknownError"]);
                    }
                    break;
                case 401: // Invalid token
                    alertError(glossary["InvalidToken"]);
                    break;
                default: // Other HTTP errors
                    throw new Error('HTTP error ' + response.status + ' : ' + response.statusText);
            }
        });
    });
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
        return response.text().then(data => {
            switch (response.status) {
                case 200: // Success
                    document.getElementById("kahiin_db_div").style.display = "block";
                    document.getElementById("kahiin_db_message_div").style.display = "none";
                    return JSON.parse(data);
                case 400: // Invalid data structure or type
                    switch (JSON.parse(data).error) {
                        case 'Invalid data structure':
                            alertError(glossary["FillAllFields"]);
                            break;
                        default:
                            alertError(glossary["UnknownError"]);
                    }
                    break;
                case 401: // Invalid token
                    alertError(glossary["YouMustBeLoggedInToUseKahiinDB"]);
                    document.getElementById("kahiin_db_message_div").style.display = "block";
                    document.getElementById("kahiin_db_div").style.display = "none";
                    break;
                default: // Other HTTP errors
                    throw new Error('HTTP error ' + response.status + ' : ' + response.statusText);
            }
        });
    });
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
        return response.text().then(data => {
            switch (response.status) {
                case 200: // Success
                    return JSON.parse(data);
                case 400: // Invalid data structure or type
                    switch (JSON.parse(data).error) {
                        case 'Invalid data structure':
                            alertError(glossary["FillAllFields"]);
                            break;
                        default:
                            alertError(glossary["UnknownError"]);
                    }
                    break;
                case 401: // Invalid token
                    alertError(glossary["InvalidToken"]);
                    break;
                default: // Other HTTP errors
                    throw new Error('HTTP error ' + response.status + ' : ' + response.statusText);
            }
        });
    });
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
        return response.text().then(data => {
            switch (response.status) {
                case 200: // Success
                    return JSON.parse(data);
                case 400: // Invalid data structure or type
                    switch (JSON.parse(data).error) {
                        case 'Invalid data structure':
                            alertError(glossary["FillAllFields"]);
                            break;
                        default:
                            alertError(glossary["UnknownError"]);
                    }
                    break;
                case 401: // Invalid token or unauthorized to delete quiz
                    switch (JSON.parse(data).error) {
                        case 'Invalid token':
                            alertError(glossary["InvalidToken"]);
                            break;
                        case 'Unauthorized to delete quiz':
                            alertError(glossary["Unauthorized"]);
                            break;
                        default:
                            alertError(glossary["UnknownError"]);
                    }
                    break;
                case 404: // Quiz not found
                    alertError(glossary["QuizNotFound"]);
                    break;
                default: // Other HTTP errors
                    throw new Error('HTTP error ' + response.status + ' : ' + response.statusText);
            }
        });
    });
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
        return response.text().then(data => {
            switch (response.status) {
                case 200: // Success
                    return JSON.parse(data);
                case 400: // Invalid data structure or type
                    switch (JSON.parse(data).error) {
                        case 'Invalid data structure':
                            alertError(glossary["FillAllFields"]);
                            break;
                        default:
                            alertError(glossary["UnknownError"]);
                    }
                    break;
                case 401: // Invalid token or unauthorized to delete question
                    switch (JSON.parse(data).error) {
                        case 'Invalid token':
                            alertError(glossary["InvalidToken"]);
                            break;
                        case 'Unauthorized to delete question':
                            alertError(glossary["Unauthorized"]);
                            break;
                        default:
                            alertError(glossary["UnknownError"]);
                    }
                    break;
                case 404: // Question not found
                    alertError(glossary["QuestionNotFound"]);
                    break;
                default: // Other HTTP errors
                    throw new Error('HTTP error ' + response.status + ' : ' + response.statusText);
            }
        });
    });
}