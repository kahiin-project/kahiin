const socket = io();
var question_number;
function Submit() {
  const Username = document.getElementById("Username").value;
  socket.emit("addUser", Username);

  document.getElementById("form").style.display = "none";
  document.getElementById("loader").style.display = "block";

  socket.on("error", (res) => {
    alert(res);
    document.getElementById("form").style.display = "block";
    document.getElementById("loader").style.display = "none";
  });
}

function Game() {
  socket.on("questionStart", (res) => {
    document.getElementById("buttons").style.display = "block";
    question_number = res["question_number"]
  });
}

function sendAnswer(button) {
  if (button in ["a", "b", "c", "d"]) {
    emit("sendAnswer", {"button":button, "question_number": question_number});
  } else {
    alert("Erreur au niveau de la reponse, veuillez réesayer");
  }
};
