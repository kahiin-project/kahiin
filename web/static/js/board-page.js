const socket = io();

function Submit() {
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
    if (res.passcode == passcode) {
      const usersList = document.getElementById("users");
      const items = usersList.getElementsByTagName("li");
      for (let i = 0; i < items.length; i++) {
        if (items[i].textContent === res.username) {
          usersList.removeChild(items[i]);
          break;
        }
      }
    }
  });

  socket.on("error", (res) => {
    document.getElementById("passcode").value = "";
    document.getElementById("error").style.display = "block";
    document.getAnimations("error").innerText = res;
    document.getElementById("list").style.display = "none";
    document.getElementById("form").style.display = "block";
  });
}

function Count(duration, seconds) {
  if (seconds >= 0) {
    setTimeout(function () {
      document.getElementById("timer").innerText = `${duration - seconds}`;
      document.getElementById("timer").style.width = `calc(${
        (100 * (duration - seconds + 1)) / (duration + 1)
      }% - 30px)`;
      document.getElementById("timer").style.opacity = 1;
      document.getElementById("timerbar").style.opacity = 1;
      Count(duration, seconds - 1);
    }, 1000);
  }
}

function Display() {
  socket.on("startGame", (res) => {
    document.getElementById("timer").style.display = "block";
    document.getElementById("list").style.display = "none";
  });

  socket.on("questionStart", (res) => {
    document.getElementById("question").style.bottom = "340px";
    document.getElementById("question").style.opacity = 1;
    document.getElementById("question_number").style.display = "block";
    document.getElementById("question_number").style.opacity = 1;
    document.getElementById("timer").style.display = "block";
    document.getElementById("timer").style.opacity = 1;
    document.getElementById("timerbar").style.display = "block";
    document.getElementById("timerbar").style.opacity = 1;
    document.getElementById("answers_div").style.display = "block";
    document.getElementById("answers_div").style.opacity = 1;
    document.getElementById("answers_div").style.display = "block";
    document.getElementById("answers_div").style.opacity = 1;
    document.getElementById("loader").style.opacity = 0;
    document.getElementById("loader").style.display = "none";
    document.getElementById("loader-text").style.display = "none";

    question_title = res["question_title"]
    .split('\n')
    .map(line => line.trim().replace(/\s+/g, ' '))
    .join('\n');

    document.getElementById("question").innerHTML = marked(question_title);
    renderMathInElement(document.getElementById("question"), {
      delimiters: [
          {left: "\$", right: "\$", display: false},
          {left: "\$$", right: "\$$", display: true}
      ]
    });

    document.getElementById('answers_div').style.display = "block";
    switch (res["question_possible_answers"].length) {
      case 2:
        document.getElementById('answers_div').innerHTML = `
          <button class="answer-block" style="background: #99eeff; top: 0; left: 0; height: 200px;">
            ${res["question_possible_answers"][0]}
            <svg width="40" height="40" style="top: 80px;">
              <rect width="40" height="40" fill="white" />
            </svg>
          </button>
          <button class="answer-block" style="background: #BC5BD9; top: 0; left: calc(50% + 10px); height: 200px;">
            ${res["question_possible_answers"][1]}
            <svg width="40" height="40" style="top: 80px;">
              <circle cx="20" cy="20" r="20" fill="white" />
            </svg>
          </button>
        `;
        break;
      case 3:
        document.getElementById('answers_div').innerHTML = `
          <button class="answer-block" style="background: #99eeff; top: 0; left: 0;">
            ${res["question_possible_answers"][0]}
            <svg width="40" height="40">
              <rect width="40" height="40" fill="white" />
            </svg>
          </button>
          <button class="answer-block" style="background: #ABD95B; top: 0; left: calc(50% + 10px);">
            ${res["question_possible_answers"][1]}
            <svg width="40" height="40">
              <circle cx="20" cy="20" r="20" fill="white" />
            </svg>
          </button>
          <button class="answer-block" style="background: #BC5BD9; top: 110px; left: 0;">
            ${res["question_possible_answers"][2]}
            <svg width="40" height="40">
              <polygon points="20,2 38,38 2,38" fill="white" />
            </svg>
          </button>
          <button class="answer-block" style="background: #DFE6E9; top: 110px; left: calc(50% + 10px);"></button>
        `;
        break;
      case 4:
        document.getElementById('answers_div').innerHTML = `
          <button class="answer-block" style="background: #99eeff; top: 0; left: 0;">
            ${res["question_possible_answers"][0]}
            <svg width="40" height="40">
              <rect width="40" height="40" fill="white" />
            </svg>
          </button>
          <button class="answer-block" style="background: #ABD95B; top: 0; left: calc(50% + 10px);">
            ${res["question_possible_answers"][1]}
            <svg width="40" height="40">
              <circle cx="20" cy="20" r="20" fill="white" />
            </svg>
          </button>
          <button class="answer-block" style="background: #BC5BD9; top: 110px; left: 0;">
            ${res["question_possible_answers"][2]}
            <svg width="40" height="40">
              <polygon points="20,2 38,38 2,38" fill="white" />
            </svg>
          </button>
          <button class="answer-block" style="background: #D9955B; top: 110px; left: calc(50% + 10px);">
            ${res["question_possible_answers"][3]}
            <svg width="40" height="40">
              <polygon points="20,2 24.4,14 39.2,14 27.2,22.8 31.6,36 20,28 8.4,36 12.8,22.8 0.8,14 15.6,14" fill="white" />
            </svg>
          </button>
        `;
        break;
      default:
        console.log("Invalid data incoming");
    }

    document.getElementById("timer").innerText = "0";
    document.getElementById("question_number").innerText = `Question ${res["question_number"]}/${res["question_count"]}`;
    duration = res["question_duration"];
    Count(duration, duration);
  });

  socket.on('leaderboard', (res) => {
    const promotedUsers = res["promoted_users"];
    const gameLead = res["game_lead"];

    // Display leaderboard
    const leaderboardTop = document.getElementById("leaderboard_top");
    leaderboardTop.style.display = "block";
    leaderboardTop.style.opacity = 1;

    const top5List = document.getElementById("top5");
    top5List.innerHTML = ""; // Clear previous content
    for (const [username, score] of Object.entries(gameLead)) {
      const listItem = document.createElement("li");
      listItem.innerHTML = `<span class="username">${username}</span> - <span class="score">${score}</span>`;
      top5List.appendChild(listItem);
    }

    // Display promoted users
    const promotedList = document.getElementById("promoted-list");
    promotedList.style.display = "block";
    promotedList.style.opacity = 1;

    const promotedListItems = document.getElementById("promoted-list-items");
    promotedListItems.innerHTML = ""; // Clear previous content
    for (const [username, places] of Object.entries(promotedUsers)) {
      const listItem = document.createElement("li");
      listItem.innerHTML = `<span class="username">${username}</span> <span class="arrow">↑ ${places}</span>`;
      promotedListItems.appendChild(listItem);
    }
  });

  socket.on("questionEnd", (res) => {
    document.getElementById("question").style.opacity = 0;
    document.getElementById("question_number").style.opacity = 0;
    document.getElementById("question_number").style.display = "none";
    document.getElementById("timer").style.opacity = 0;
    document.getElementById("timer").style.display = "none";
    document.getElementById("timerbar").style.opacity = 0;
    document.getElementById("timerbar").style.display = "none";
    document.getElementById("answers_div").style.opacity = 0;
    document.getElementById("answers_div").style.display = "none";
    document.getElementById("loader").style.opacity = 1;
    document.getElementById("loader").style.display = "block";
    document.getElementById("loader-text").style.display = "block";

  }
);
}