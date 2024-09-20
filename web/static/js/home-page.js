const socket = io();
var answer_list= [];
var question_number;
function Submit() {
  const Username = document.getElementById("Username").value;
  socket.emit("addUser", Username);

  document.getElementById("form").style.display = "none";
  document.getElementById("loader").style.display = "block";
}

function Game() {
  socket.on("questionStart", (res) => {
    document.getElementById("buttons").style.display = "block";
    question_number = res["question_number"]
  });
  socket.on("questionEnd", (res) => {
    answer_list = [];
  });
  socket.on("error", (res) => {
    alert(res);
    document.getElementById("form").style.display = "block";
    document.getElementById("loader").style.display = "none";
  });
}

function sendAnswer(answer) {
  if (["a", "b", "c", "d"].includes(answer)) {
    if (answer_list.includes(answer)) {
      answer_list.splice(answer_list.indexOf(answer), 1);
    } else { 
      answer_list.push(answer);
    socket.emit("sendAnswer", {"answers":answer_list, "question_number": question_number});}
  } else {
    socket.alert("Erreur au niveau de la reponse, veuillez réesayer");
  }
};

