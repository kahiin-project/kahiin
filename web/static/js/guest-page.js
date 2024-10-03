const socket = io();
var answer_list= [];
var question_number;
function Submit() {
  const Username = document.getElementById("username").value;
  socket.emit("addUser", Username);

  document.getElementById("form").style.display = "none";
  document.getElementById("loader").style.display = "block";
  document.getElementById("loader-text").style.display = "block";
}
function Game() {
  socket.on("questionStart", (res) => {
    question_number = res["question_number"]
    const possible_answer = res["question_possible_answers"];
    document.getElementById("buttons").style.display = "block";
    if (res["question_type"] == "mcq") {
      switch (possible_answer.length) {
        case 2:
          document.getElementById("buttons").innerHTML = `
            <button id="button_0" class="mcqButton b1" style="height: calc(100% - 100px);">A</button>
            <button id="button_1" class="mcqButton b3" style="height: calc(100% - 100px); top: 20px; left: calc(50% + 10px);">B</button>
          `;
          break;
        case 3:
          document.getElementById("buttons").innerHTML = `
            <button id="button_0" class="mcqButton b1">A</button>
            <button id="button_1" class="mcqButton b2">B</button>
            <button id="button_2" class="mcqButton b3">C</button>
            <button class="mcqButton b0"></button>
          `;
          break;
        case 4:
          document.getElementById("buttons").innerHTML = `
            <button id="button_0" class="mcqButton b1">A</button>
            <button id="button_1" class="mcqButton b2">B</button>
            <button id="button_2" class="mcqButton b3">C</button>
            <button id="button_3" class="mcqButton b4">D</button>
          `;
          break;
        default:
          console.log("Invalid answers incoming");
      }
      for (let i = 0; i < possible_answer.length; i++) {
        document.getElementById(`button_${i}`).onclick = function() {
          editAnswer(possible_answer[i]);
        }
        document.getElementById(`button_${i}`).innerHTML = possible_answer[i];
      }
    } else if (res["question_type"] == "uniqueanswer") {
      switch (possible_answer.length) {
        case 2:
          document.getElementById("buttons").innerHTML = `
            <button id="button_0" class="uaButton b1" style="height: calc(100% - 40px);">A</button>
            <button id="button_1" class="uaButton b3" style="height: calc(100% - 40px); top: 20px; left: calc(50% + 10px);">B</button>
          `;
          break;
        case 3:
          document.getElementById("buttons").innerHTML = `
            <button id="button_0" class="uaButton b1">A</button>
            <button id="button_1" class="uaButton b2">B</button>
            <button id="button_2" class="uaButton b3">C</button>
            <button class="uaButton b0"></button>
          `;
          break;
        case 4:
          document.getElementById("buttons").innerHTML = `
            <button id="button_0" class="uaButton b1">A</button>
            <button id="button_1" class="uaButton b2">B</button>
            <button id="button_2" class="uaButton b3">C</button>
            <button id="button_3" class="uaButton b4">D</button>
          `;
          break;
        default:
          console.log("Invalid answers incoming");
      }
      for (let i = 0; i < possible_answer.length; i++) {
        document.getElementById(`button_${i}`).onclick = function() {
          sendAnswer(possible_answer[i]);
        }
        document.getElementById(`button_${i}`).innerHTML = possible_answer[i];
      }
    }
  });
}

  socket.on("questionEnd", (res) => {
    answer_list = [];
    document.getElementById("send_button").style.display = "none";
    for (let i = 0; i < 4; i++) {
      document.getElementById(`button_${i}`).style.display = "none";
      document.getElementById(`button_${i}`).onclick = null;
    }
  });

  socket.on("error", (res) => {
    alert(res);
    document.getElementById("form").style.display = "block";
    document.getElementById("loader").style.display = "none";
    document.getElementById("loader-text").style.display = "none";
  });

function sendAnswer(answer) {
  console.log(answer);
  socket.emit("sendAnswer", {"answers":[answer], "question_number": question_number});
  document.getElementById("send_button").style.display = "none";
  document.getElementById("buttons").style.display = "none";
  for (let i = 0; i < 4; i++) {
    document.getElementById(`button_${i}`).style.display = "none";
    document.getElementById(`button_${i}`).onclick = null;
  }
  // if (["a", "b", "c", "d"].includes(answer)) {
  //   if (answer_list.includes(answer)) {
  //     answer_list.splice(answer_list.indexOf(answer), 1);
  //   } else { 
  //     answer_list.push(answer);
  //   socket.emit("sendAnswer", {"answers":answer_list, "question_number": question_number});}
  // } else {
  //   socket.alert("Erreur au niveau de la reponse, veuillez réesayer");
  // }
};

function editAnswer(answer) {
  if (answer_list.includes(answer)) {
    answer_list.splice(answer_list.indexOf(answer), 1);
  } else { 
    answer_list.push(answer);
  }};


function sendMCQ() {
  socket.emit("sendAnswer", {"answers":answer_list, "question_number": question_number});
  for (let i = 0; i < 4; i++) {
    document.getElementById(`button_${i}`).style.display = "none";
    document.getElementById(`button_${i}`).onclick = null;
  }
};
