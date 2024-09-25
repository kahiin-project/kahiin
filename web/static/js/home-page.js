const socket = io();
var answer_list= [];
var question_number;
function Submit() {
  const Username = document.getElementById("Username").value;
  socket.emit("addUser", Username);

  document.getElementById("form").style.display = "none";
  document.getElementById("loader").style.display = "block";
  document.getElementById("loader-text").style.display = "block";
}

function Game() {
  socket.on("questionStart", (res) => {
    question_number = res["question_number"]
    if (res["type"] == "mqc") {
      document.getElementById("buttons").style.display = "block";
      res["shown_answers"].forEach(answer => {
        document.getElementById("button_"+answer).onclick = function() {editAnswer(res[answer])}
        document.getElementById("button_"+answer).display = "block";
      document.getElementById("send").style.display = "block";
      });

    } else if (res["type"] == "uniqueanswer") {
      document.getElementById("buttons").style.display = "block";
      res["shown_answers"].forEach(answer => {
        document.getElementById("button_"+answer).display = "block";
      });
    }   
                                
  });

  socket.on("questionEnd", (res) => {
    answer_list = [];
    document.getElementById("buttons").style.display = "none";
    document.getElementById("send").style.display = "none";
    buttons = ["a", "b", "c", "d"];
    buttons.array.forEach(button => {
      document.getElementById("button_"+button).onclick = function() {sendAnswer(button)};
    });
  });

  socket.on("error", (res) => {
    alert(res);
    document.getElementById("form").style.display = "block";
    document.getElementById("loader").style.display = "none";
    document.getElementById("loader-text").style.display = "none";
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

function editAnswer(answer) {
  if (["a", "b", "c", "d"].includes(answer)) {
    if (answer_list.includes(answer)) {
      answer_list.splice(answer_list.indexOf(answer), 1);
    } else { 
      answer_list.push(answer);
    }}};


function sendMQC() {
  socket.emit("sendAnswer", {"answers":answer_list, "question_number": question_number});
};
