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