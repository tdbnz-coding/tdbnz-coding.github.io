
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreBox = document.getElementById('scoreBox');
const sprite = new Image();
sprite.src = '123.png';

// Sounds
const sounds = {
  flap: new Audio('sfx_wing.wav'),
  point: new Audio('sfx_point.wav'),
  hit: new Audio('sfx_hit.wav'),
  die: new Audio('sfx_die.wav'),
  swoosh: new Audio('sfx_swooshing.wav'),
};

let frames = 0;
const DEGREE = Math.PI / 180;

let isPaused = false;

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') {
    isPaused = !isPaused;
  }
});

canvas.addEventListener("click", () => {
  switch (state.current) {
    case state.getReady:
      state.current = state.game;
      sounds.swoosh.play();
      break;
    case state.game:
      bird.flap();
      break;
    case state.over:
      pipes.reset();
      bird.reset();
      score.value = 0;
      state.current = state.getReady;
      break;
  }
});

const state = { current: 0, getReady: 0, game: 1, over: 2 };

// Score handling
const score = {
  value: 0,
  best: parseInt(localStorage.getItem("best")) || 0,
  draw() {
    scoreBox.innerText = `Score: ${this.value} | Best: ${this.best}`;
  },
  saveBest() {
    localStorage.setItem("best", this.best);
  }
};

const bg = {
  sX: 0, sY: 0, w: 138, h: 512, x: 0, y: canvas.height - 512,
  draw() {
    ctx.drawImage(sprite, this.sX, this.sY, this.w, this.h, this.x, this.y, this.w, this.h);
    ctx.drawImage(sprite, this.sX, this.sY, this.w, this.h, this.x + this.w, this.y, this.w, this.h);
  }
};

const bird = {
  animation: [
    { sX: 3, sY: 491 },
    { sX: 61, sY: 491 },
    { sX: 119, sY: 491 },
    { sX: 61, sY: 491 }
  ],
  x: 50,
  y: 150,
  w: 34,
  h: 24,
  frame: 0,
  gravity: 0.25,
  jump: 4.6,
  speed: 0,
  rotation: 0,
  draw() {
    let b = this.animation[this.frame];
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
    ctx.rotate(this.rotation);
    ctx.drawImage(sprite, b.sX, b.sY, this.w, this.h, -this.w / 2, -this.h / 2, this.w, this.h);
    ctx.restore();
  },
  flap() {
    this.speed = -this.jump;
    sounds.flap.play();
  },
  update() {
    if (state.current === state.getReady) {
      this.y = 150;
      this.rotation = 0;
    } else {
      this.speed += this.gravity;
      this.y += this.speed;
      if (this.y + this.h / 2 >= canvas.height) {
        this.y = canvas.height - this.h / 2;
        if (state.current === state.game) {
          state.current = state.over;
          sounds.hit.play();
          sounds.die.play();
          score.best = Math.max(score.value, score.best);
          score.saveBest();
        }
      }
      this.rotation = this.speed >= this.jump ? 90 * DEGREE : -25 * DEGREE;
    }
    this.frame += frames % 5 === 0 ? 1 : 0;
    this.frame %= this.animation.length;
  },
  reset() {
    this.speed = 0;
    this.y = 150;
  }
};

const pipes = {
  position: [],
  top: { sX: 56, sY: 323 },
  bottom: { sX: 84, sY: 323 },
  w: 52,
  h: 320,
  gap: 100,
  dx: 2,
  draw() {
    for (let p of this.position) {
      ctx.drawImage(sprite, this.top.sX, this.top.sY, this.w, this.h, p.x, p.y, this.w, this.h);
      ctx.drawImage(sprite, this.bottom.sX, this.bottom.sY, this.w, this.h, p.x, p.y + this.h + this.gap, this.w, this.h);
    }
  },
  update() {
    if (state.current !== state.game) return;
    if (frames % 100 === 0) {
      this.position.push({ x: canvas.width, y: -Math.floor(Math.random() * 200 + 100) });
    }
    for (let i = 0; i < this.position.length; i++) {
      let p = this.position[i];
      p.x -= this.dx;
      if (p.x + this.w === bird.x) {
        score.value++;
        sounds.point.play();
      }
      if (p.x + this.w <= 0) this.position.shift();
    }
  },
  reset() {
    this.position = [];
  }
};

function drawOverlayText(text, subtext = '') {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "36px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "20px sans-serif";
  ctx.fillText(subtext, canvas.width / 2, canvas.height / 2 + 20);
}

function draw() {
  ctx.fillStyle = "#70c5ce";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  bg.draw();
  pipes.draw();
  bird.draw();

  if (state.current === state.getReady) {
    drawOverlayText("Tap to Start", "Flap to begin");
  } else if (state.current === state.over) {
    drawOverlayText("Game Over", "Tap to Restart");
  } else if (isPaused) {
    drawOverlayText("Paused", "Press 'P' to Resume");
  }
}

function update() {
  if (!isPaused) {
    bird.update();
    pipes.update();
  }
}

function loop() {
  draw();
  update();
  score.draw();
  frames++;
  requestAnimationFrame(loop);
}

loop();
