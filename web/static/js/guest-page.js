// ---------------------- Variables -------------------------

var answer_list= [];
var question_number;

// ---------------------- Initialisation -------------------------
function init() {
    const wsUrl = `ws://${window.location.hostname}:8000?t=${Date.now()}`;
    socket = new WebSocketHandler(wsUrl);
    setupSocketListeners();
}


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
  elementsToShow = ["loader", "loader-text"];
  elementsToShow.forEach(element => {
    document.getElementById(element).style.display = "block";
  });
  elementsToHide = ["buttons", "send_button"];
  elementsToHide.forEach(element => {
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
  elementsToShow = ["loader", "loader-text"];
  elementsToShow.forEach(element => {
    document.getElementById(element).style.display = "block";
  });
  elementsToHide = ["buttons", "send_button"];
  elementsToHide.forEach(element => {
    document.getElementById(element).style.display = "none";
  });
  socket.emit("sendAnswer", {"answers":answer_list, "question_number": question_number});
  for (let i = 0; i < 4; i++) {
    document.getElementById(`button_${i}`).style.display = "none";
    document.getElementById(`button_${i}`).onclick = null;
  }
};
  function setupSocketListeners() {
  // ---------------------- Socket.io main -------------------------

  socket.on("error", (res) => {
    if (res=="Kicked") {
      alert(glossary[res]);
      setTimeout(() => {
      }, 2000);
      location.reload();
    } else {
      alert(glossary[res]);
      elementsToShow = ["form"];
      elementsToShow.forEach(element => {
        document.getElementById(element).style.display = "block";
      });
      elementsToHide = ["loader", "loader-text"];
      elementsToHide.forEach(element => {
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

  socket.on("glossary", (res) => {
    glossary = res;
  });
  socket.on("guestConnected", (res) => {
    elementsToShow = ["loader", "loader-text"];
    elementsToShow.forEach(element => {
      document.getElementById(element).style.display = "block";
    });
    elementsToHide = ["form"];
    elementsToHide.forEach(element => {
      document.getElementById(element).style.display = "none";
    });

  });
  // ---------------------- Socket.io Game -------------------------

  socket.on("questionStart", (res) => {
    elementsToHide = ["loader", "loader-text"];
    elementsToHide.forEach(element => {
      document.getElementById(element).style.display = "none";
    });
    elementsToShow = ["buttons"];
    elementsToShow.forEach(element => {
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
    elementsToShow = ["loader-text", "loader"];
    elementsToShow.forEach(element => {
      document.getElementById(element).style.display = "block";
    });
  });

  socket.on("pauseQuestion", (res) => {
    element = ["buttons", "send_button"]
    if (document.getElementById(element[0]).style.display === "block"){
      element.forEach(element => {
        document.getElementById(element).style.display = "none";
      })
    } else {
      element.forEach(element => {
        document.getElementById(element).style.display = "block";
      });
    }
  })
}

document.addEventListener("DOMContentLoaded", init);