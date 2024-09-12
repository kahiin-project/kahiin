const socket = io();
function Submit() {
    const passcode = document.getElementById("passcode").value;
    
    document.getElementById("form").style.display = "none";
    socket.emit("hostConnect", passcode);
  
    socket.on("error", (res) => {
      alert(res);
      document.getElementById("form").style.display = "block";
    });
}

function StartSession() {
  const passcode = document.getElementById("passcode").value;
  socket.emit("StartSession", passcode);

}