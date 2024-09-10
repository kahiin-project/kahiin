function Submit() {
  const socket = io();
  const Username = document.getElementById("Username").value;

  socket.emit("addUser", Username);

  document.getElementById("form").style.display = "none";
  document.getElementById("list").style.display = "block";

  socket.on("newUser", (res) => {
    console.log("new user: ", res);
    const li = document.createElement("li");
    li.appendChild(document.createTextNode(res.username));
    document.getElementById("users").appendChild(li);
  });
  socket.on("error", (res) => {
    alert(res);
    document.getElementById("list").style.display = "none";
    document.getElementById("form").style.display = "block";
  });
}
