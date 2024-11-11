const socket = io();


// ---------------------- Functions -------------------------

function generatePastelColor() {
  const r = Math.floor(Math.random() * 128 + 127);
  const g = Math.floor(Math.random() * 128 + 127);
  const b = Math.floor(Math.random() * 128 + 127);
  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  return hex;
}

function hashSHA256(message) {
  const hash = CryptoJS.SHA256(message);
  return hash.toString(CryptoJS.enc.Hex);
}

function submitPasscode() {
  const passcode = hashSHA256(document.getElementById("passcode").value);
  socket.emit("boardConnect", passcode);
}

function Count(duration, seconds) {
  if (document.getElementById("timer").style.opacity == 0) {
    return;
  }
  if (seconds >= 0) {
    setTimeout(function () {
      document.getElementById("timer").innerText = `${duration - seconds}`;
      document.getElementById("timer").style.width = `calc(${
        (100 * (duration - seconds + 1)) / (duration + 1)
      }% - 30px)`;
      Count(duration, seconds - 1);
    }, 1000);
  }
}

// ---------------------- Socket.io  Main-------------------------

socket.on("error", (res) => {
  if (res == "InvalidPasscode") {
    elementsToHide = ["list", "qrcode", "scan"];
    elementsToHide.forEach(id => {
      document.getElementById(id).style.display = "none";
    });
    elementsToShow = ["form", "error"];
    elementsToShow.forEach(id => {
      document.getElementById(id).style.display = "block";
    });
    document.getElementById("passcode").value = "";
    document.getElementById("error").innerHTML = glossary[res];
    document.getElementById("form").style.display = "block";

  } else {
    alert(glossary[res]);
    document.getElementById("error").style.display = "block";
    document.getElementById("error").innerHTML = glossary[res];
  }
});

socket.on("settings", (res) => {
  let elements = document.querySelectorAll('*');
  elements.forEach(element => {
    if (res.dyslexicMode) {
      element.classList.add('dyslexic');
    } else {
      element.classList.remove('dyslexic');
    }
  });
});

socket.on("language", (res) => {
  glossary = res;
  const body = document.getElementById("body");
  const regex = /\$\{glossary\["([A-Za-z]+)"\]\}/g;
  const replaced = body.innerHTML.replace(regex, (match, key) => {
    return glossary[key] || match;
  });
  body.innerHTML = replaced;
  document.getElementById("body").style.display = "block";
  document.getElementById("passcode").placeholder = glossary["Passcode"];
});

socket.on("qrcode", (res) => {
  document.getElementById("qrcode").src = res;
});

socket.on("boardConnected", (res) => {
  elementsToHide = ["form"];
  elementsToHide.forEach(id => {
    document.getElementById(id).style.display = "none";
  });
  elementsToShow = ["list", "qrcode", "scan"];
  elementsToShow.forEach(id => {
    document.getElementById(id).style.display = "block";
  });
});
// ---------------------- Socket.io Game -------------------------

socket.on("newUser", (res) => {
  const li = document.createElement("li");
  li.appendChild(document.createTextNode(res.username));
  const pastel_color = generatePastelColor();
  li.style.background = pastel_color;
  li.style.boxShadow = `${pastel_color} 0px 1px 4px`;
  document.getElementById("users").appendChild(li);
});

socket.on("rmUser", (res) => {
  const usersList = document.getElementById("users");
  const items = usersList.getElementsByTagName("li");
  for (let i = 0; i < items.length; i++) {
    if (items[i].textContent === res.username) {
      usersList.removeChild(items[i]);
      break;
      }
    }
  }
);

socket.on("startGame", (res) => {
  document.getElementById("timer").style.display = "block";
  document.getElementById("list").style.display = "none";
  document.getElementById("qrcode").style.display = "none";
  document.getElementById("scan").style.display = "none";
});

socket.on("questionStart", (res) => {
  elementsToHide = ["leaderboard-container", "leaderboard_top", "promoted-list","loader", "loader-text"];
  elementsToHide.forEach(id => {
    document.getElementById(id).style.opacity = 0;
  });
  elementsToShow = ["question", "question_number", "timer", "timerbar", "answers_div"];
  elementsToShow.forEach(id => {
    document.getElementById(id).style.opacity = 1;
  });

  document.getElementById("question").style.bottom = "340px";


  const answer_blocks = document.getElementById("answers_div").getElementsByClassName("answer-block");
  for (let i = 0; i < answer_blocks.length; i++) {
    answer_blocks[i].style.opacity = 1;
    answer_blocks[i].style.boxShadow = "rgba(0, 0, 0, 0.16) 0px 1px 4px";
  }
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
  hljs.highlightAll();

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
  document.getElementById("question_number").innerText = `Question ${res["question_number"]}/${res["question_count"]}`;
  duration = res["question_duration"];
  Count(duration, duration);
});

socket.on('leaderboard', (res) => {
  // {'promoted_users': [], 'game_lead': [('username16', 980), ('username16', 980), ('username17', 973), ('username17', 973), ('username19', 938)]}
  document.getElementById("question").style.opacity = 0;
  document.getElementById("question_number").style.opacity = 0;
  document.getElementById("answers_div").style.opacity = 0;
  document.getElementById("leaderboard-container").style.opacity = 1;
  document.getElementById("leaderboard_top").style.opacity = 1;
  document.getElementById("promoted-list").style.opacity = 1;
  document.getElementById("loader").style.opacity = 0;
  const promoted_users = res["promoted_users"];
  const game_lead = res["game_lead"];
  
  const leaderboard_top_items = document.getElementById("leaderboard-top-items");
  leaderboard_top_items.innerHTML = ""; 
  game_lead.forEach(element => {
    const list_leaderboard_top_item = document.createElement("li");
    list_leaderboard_top_item.innerHTML = `<span class="username">${element[0]}</span> - <span class="score">${element[1]}</span>`;
    leaderboard_top_items.appendChild(list_leaderboard_top_item);
    const pastel_color = generatePastelColor();
    list_leaderboard_top_item.style.background = pastel_color;
    list_leaderboard_top_item.style.boxShadow = `${pastel_color} 0px 1px 4px`;
  });

  const promoted_items = document.getElementById("promoted-list-items");
  promoted_items.innerHTML = ""; 
  promoted_users.forEach(element => {
    const list_promoted_item = document.createElement("li");
    list_promoted_item.innerHTML = `<span class="username">${element[0]}</span> <span class="arrow">↑ ${element[1]}</span>`;
    promoted_list_items.appendChild(list_promoted_item);
    const pastel_color = generatePastelColor();
    list_promoted_item.style.background = pastel_color;
    list_promoted_item.style.boxShadow = `${pastel_color} 0px 1px 4px`;
  });
});

socket.on("questionEnd", (res) => {
  elementsToHide = ["timer", "timerbar"];
  elementsToHide.forEach(id => {
      document.getElementById(id).style.opacity = 0;
  });
  const question_correct_answer = res["question_correct_answer"].map((x) => x.trim());
  // Gray out the incorrect answers
  const answers_div = document.getElementById("answers_div");
  const answer_blocks = answers_div.getElementsByClassName("answer-block");
  for (let i = 0; i < answer_blocks.length; i++) {
    if (!question_correct_answer.includes(answer_blocks[i].innerText.trim())) {
      answer_blocks[i].style.opacity = 0.2;
      answer_blocks[i].style.boxShadow = "none";
    }
  }
});

socket.on("gameEnd", (res) => {
  elementsToHide = ["question", "question_number", "answers_div", "leaderboard-container", "loader"];
  elementsToHide.forEach(id => {
      document.getElementById(id).style.opacity = 0;
  });

  const podium = document.getElementById("podium");
  podium.innerHTML = "";
  podium.style.opacity = 1;
  const game_lead = res["game_lead"];
  let podiumConfig;
  
  switch(game_lead.length) {
      case 1:
          podiumConfig = [[1, "first"]];
          break;
      case 2:
          podiumConfig = [[2, "second"], [1, "first"]];
          break;
      case 3:
          podiumConfig = [[2, "second"], [1, "first"], [3, "third"]];
          break;
      case 4:
          podiumConfig = [[4, "fourth"], [2, "second"], [1, "first"], [3, "third"]];
          break;
      default:
          podiumConfig = [[4, "fourth"], [2, "second"], [1, "first"], [3, "third"], [5, "fifth"]];
  }

  podiumConfig.forEach((config, index) => {
      if (index >= game_lead.length) return;

      const podium_item = document.createElement("div");
      podium_item.classList.add("podium__item");
      podium_item.style.animationDelay = `${index * 0.2}s`;

      const podium_name = document.createElement("p");
      podium_name.classList.add("podium__name");
      podium_name.innerText = game_lead[index][0];

      const podium_rank_div = document.createElement("div");
      podium_rank_div.classList.add("podium__rank", config[1]);
      podium_rank_div.innerText = config[0];

      podium_item.appendChild(podium_name);
      podium_item.appendChild(podium_rank_div);
      podium.appendChild(podium_item);
  });
  podium.style.transform = `translateX(${game_lead.length < 5 ? (5 - game_lead.length) * 20 : 0}px)`;
});