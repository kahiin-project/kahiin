function Submit() {
  const socket = io();
  const passcode = document.getElementById("passcode").value;
  
  socket.emit("boardConnect", passcode);
  document.getElementById("form").style.display = "none";
  document.getElementById("list").style.display = "block";

  socket.on("newUser", (res) => {
    const li = document.createElement("li");
    li.appendChild(document.createTextNode(res.username));
    document.getElementById("users").appendChild(li);
  });

  socket.on("rmUser", (res) => {
    console.log("1")
    if(res.passcode == passcode) {
      const usersList = document.getElementById("users");
      console.log("1")
      const items = usersList.getElementsByTagName("li");
      console.log("1")
      for (let i = 0; i < items.length; i++) {
        if (items[i].textContent === res.username) {
          console.log("1")
          usersList.removeChild(items[i]);
          break;
        }
      }
    }
  });

  socket.on("error", (res) => {
    alert(res);
    document.getElementById("list").style.display = "none";
    document.getElementById("form").style.display = "block";
  });
}
