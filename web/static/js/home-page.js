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
    if (res["question_type"] == "mcq") {
      for (let i = 0; i < possible_answer.length; i++) {
        document.getElementById("buttons").style.display = "block";
        console.log(res[possible_answer[i]]);
        document.getElementById(`button_${i}`).onclick = function() {editAnswer(possible_answer[i])}
        document.getElementById(`button_${i}`).innerHTML = possible_answer[i];
        document.getElementById(`button_${i}`).style.display = "block";
        document.getElementById("send_button").style.display = "block";
      }
    } else if (res["question_type"] == "uniqueanswer") {
      document.getElementById("buttons").style.display = "block";
      for (let i = 0; i < possible_answer.length; i++) {
        console.log(possible_answer[i]);
        document.getElementById(`button_${i}`).onclick = function() {sendAnswer(possible_answer[i])}
        document.getElementById(`button_${i}`).innerHTML = possible_answer[i];
        document.getElementById(`button_${i}`).style.display = "block";
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
