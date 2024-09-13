const socket = io();

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
  socket.on("startGame", (res) => {
    document.getElementById('loader').style.display = "none"
    /* Make all the button visible */
  });
}

function AnswerA() {
  socket.emit("AnswerA")
  /* Make the A button selectioned */
}
function AnswerB() {
  socket.emit("AnswerB")
  /* Make the B button selectioned */
}
function AnswerA() {
  socket.emit("AnswerC")
  /* Make the C button selectioned */
}
function AnswerA() {
  socket.emit("AnswerD")
  /* Make the D button selectioned */
}
