const socket = io();
// ---------------------- Variables -------------------------

var answer_list= [];
var question_number;
// ---------------------- Functions -------------------------

function submitUsername() {
  const Username = document.getElementById("username").value;
  if (40 >= Username.length >= 1) {
    socket.emit("guestConnect", Username);
  } else {
    alert(glossary["InvalidUsername"]);
  }

}

function sendAnswer(answer) {
  elementToShow = ["loader", "loader-text"];
  elementToShow.forEach(element => {
    document.getElementById(element).style.display = "block";
  });
  elementToHide = ["buttons", "send_button"];
  elementToHide.forEach(element => {
    document.getElementById(element).style.display = "none";
  });
  socket.emit("sendAnswer", {"answers":[answer], "question_number": question_number});
  for (let i = 0; i < 4; i++) {
    document.getElementById(`button_${i}`).style.display = "none";
    document.getElementById(`button_${i}`).onclick = null;
  }

};

function editAnswer(answer) {
  if (answer_list.includes(answer)) {
    answer_list.splice(answer_list.indexOf(answer), 1);
  } else { 
    answer_list.push(answer);
}};

function sendMCQ() {
  elementToShow = ["loader", "loader-text"];
  elementToShow.forEach(element => {
    document.getElementById(element).style.display = "block";
  });
  elementToHide = ["buttons", "send_button"];
  elementToHide.forEach(element => {
    document.getElementById(element).style.display = "none";
  });
  socket.emit("sendAnswer", {"answers":answer_list, "question_number": question_number});
  for (let i = 0; i < 4; i++) {
    document.getElementById(`button_${i}`).style.display = "none";
    document.getElementById(`button_${i}`).onclick = null;
  }
};

// ---------------------- Socket.io main -------------------------

socket.on("error", (res) => {
  if (res=="Kicked") {
    alert(glossary[res]);
    setTimeout(() => {
    }, 2000);
    location.reload();
  } else {
    alert(glossary[res]);
    elementToShow = ["form"];
    elementToShow.forEach(element => {
      document.getElementById(element).style.display = "block";
    });
    elementToHide = ["loader", "loader-text"];
    elementToHide.forEach(element => {
      document.getElementById(element).style.display = "none";
    });
    }
});

socket.on("settings", (res) => {
  console.log(res);
  const elements = document.querySelectorAll('*');
  elements.forEach(element => {
    if (res.dyslexicMode) {
      element.classList.add('dyslexic');
    } else {
      element.classList.remove('dyslexic');
    }
  });
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
  document.getElementById("username").placeholder = glossary["Username"];
});

socket.on("guestConnected", (res) => {
  elementToShow = ["loader", "loader-text"];
  elementToShow.forEach(element => {
    document.getElementById(element).style.display = "block";
  });
  elementToHide = ["form"];
  elementToHide.forEach(element => {
    document.getElementById(element).style.display = "none";
  });

});
// ---------------------- Socket.io Game -------------------------

socket.on("questionStart", (res) => {
  elementToHide = ["loader", "loader-text"];
  elementToShow.forEach(element => {
    document.getElementById(element).style.display = "none";
  });
  elementToShow = ["buttons"];
  elementToShow.forEach(element => {
    document.getElementById(element).style.display = "block";
  });
  question_number = res["question_number"]
  const possible_answer = res["question_possible_answers"];
  if (res["question_type"] == "mcq") {
    document.getElementById("send_button").style.display = "block";
    switch (possible_answer.length) {
      case 2:
        document.getElementById("buttons").innerHTML = `
          <button id="button_0" class="mcqButton b1" style="height: calc(100% - 110px);">
            <svg width="100" height="100"><rect width="100" height="100" fill="white" /></svg>
          </button>
          <button id="button_1" class="mcqButton b3" style="height: calc(100% - 110px); top: 20px; left: calc(50% + 10px);">
            <svg width="100" height="100"><circle cx="50" cy="50" r="50" fill="white" /></svg>
          </button>
        `;
        break;
      case 3:
        document.getElementById("buttons").innerHTML = `
          <button id="button_0" class="mcqButton b1">
            <svg width="100" height="100"><rect width="100" height="100" fill="white" /></svg>
          </button>
          <button id="button_1" class="mcqButton b2">
            <svg width="100" height="100"><circle cx="50" cy="50" r="50" fill="white" /></svg>
          </button>
          <button id="button_2" class="mcqButton b3">
            <svg width="100" height="100"><polygon points="50,5 95,95 5,95" fill="white" /></svg>
          </button>
          <button id="button_3" class="mcqButton b0"></button>
        `;
        break;
      case 4:
        document.getElementById("buttons").innerHTML = `
          <button id="button_0" class="mcqButton b1">
            <svg width="100" height="100"><rect width="100" height="100" fill="white" /></svg>
          </button>
          <button id="button_1" class="mcqButton b2">
            <svg width="100" height="100"><circle cx="50" cy="50" r="50" fill="white" /></svg>
          </button>
          <button id="button_2" class="mcqButton b3">
            <svg width="100" height="100"><polygon points="50,5 95,95 5,95" fill="white" /></svg>
          </button>
          <button id="button_3" class="mcqButton b4">
            <svg width="100" height="100"><polygon points="50,5 61,35 98,35 68,57 79,90 50,70 21,90 32,57 2,35 39,35" fill="white" /></svg>
          </button>
        `;
        break;
      default:
        console.log("Invalid answers incoming");
    }
    for (let i = 0; i < possible_answer.length; i++) {
      document.getElementById(`button_${i}`).onclick = function() {
        editAnswer(possible_answer[i]);
        document.getElementById(`button_${i}`).classList.toggle('activeButton');
      }
    }
  } else if (res["question_type"] == "uniqueanswer") {
    switch (possible_answer.length) {
      case 2:
        document.getElementById("buttons").innerHTML = `
          <button id="button_0" class="uaButton b1" style="height: calc(100% - 40px);">
            <svg width="100" height="100"><rect width="100" height="100" fill="white" /></svg>
          </button>
          <button id="button_1" class="uaButton b3" style="height: calc(100% - 40px); top: 20px; left: calc(50% + 10px);">
            <svg width="100" height="100"><circle cx="50" cy="50" r="50" fill="white" /></svg>
          </button>
        `;
        break;
      case 3:
        document.getElementById("buttons").innerHTML = `
          <button id="button_0" class="uaButton b1">
            <svg width="100" height="100"><rect width="100" height="100" fill="white" /></svg>
          </button>
          <button id="button_1" class="uaButton b2">
            <svg width="100" height="100"><circle cx="50" cy="50" r="50" fill="white" /></svg>
          </button>
          <button id="button_2" class="uaButton b3">
            <svg width="100" height="100"><polygon points="50,5 95,95 5,95" fill="white" /></svg>
          </button>
          <button id="button_3" class="uaButton b0"></button>
        `;
        break;
      case 4:
        document.getElementById("buttons").innerHTML = `
          <button id="button_0" class="uaButton b1">
            <svg width="100" height="100"><rect width="100" height="100" fill="white" /></svg>
          </button>
          <button id="button_1" class="uaButton b2">
            <svg width="100" height="100"><circle cx="50" cy="50" r="50" fill="white" /></svg>
          </button>
          <button id="button_2" class="uaButton b3">
            <svg width="100" height="100"><polygon points="50,5 95,95 5,95" fill="white" /></svg>
          </button>
          <button id="button_3" class="uaButton b4">
            <svg width="100" height="100"><polygon points="50,5 61,35 98,35 68,57 79,90 50,70 21,90 32,57 2,35 39,35" fill="white" /></svg>
          </button>
        `;
        break;
      default:
        console.log("Invalid answers incoming");
    }
    for (let i = 0; i < possible_answer.length; i++) {
      document.getElementById(`button_${i}`).onclick = function() {
        sendAnswer(possible_answer[i]);
      }
    }
  }
  socket.emit("getSettings", "");
});

socket.on("questionEnd", (res) => {
  answer_list = [];
  document.getElementById("send_button").style.display = "none";
  for (let i = 0; i < 4; i++) {
    document.getElementById(`button_${i}`).style.display = "none";
    document.getElementById(`button_${i}`).onclick = null;
  }
});

socket.on("gameEnd", (res) => {
  elementToShow = ["loader-text", "loader"];
  elementToShow.forEach(element => {
    document.getElementById(element).style.display = "block";
  });
});


