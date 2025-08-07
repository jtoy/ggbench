require('dotenv').config({ path: '.env' })

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

const testAnimations = [
  {
    name: 'Bouncing Ball',
    code: `function setup() {
  createCanvas(400, 400);
}

let x = 200;
let y = 200;
let speedX = 3;
let speedY = 2;

function draw() {
  background(220);
  
  // Draw the ball
  fill(255, 0, 0);
  ellipse(x, y, 50, 50);
  
  // Move the ball
  x += speedX;
  y += speedY;
  
  // Bounce off edges
  if (x > 375 || x < 25) {
    speedX *= -1;
  }
  if (y > 375 || y < 25) {
    speedY *= -1;
  }
}`
  },
  {
    name: 'Pulsing Circle',
    code: `function setup() {
  createCanvas(400, 400);
}

let size = 50;
let growing = true;

function draw() {
  background(0, 100, 200);
  
  // Draw pulsing circle
  fill(255, 255, 0);
  ellipse(width/2, height/2, size, size);
  
  // Animate size
  if (growing) {
    size += 2;
    if (size > 150) growing = false;
  } else {
    size -= 2;
    if (size < 50) growing = true;
  }
}`
  },
  {
    name: 'Fireflies',
    code: `function setup() {
  createCanvas(400, 400);
}

let fireflies = [];

function draw() {
  background(0, 20, 40);
  
  // Add new fireflies
  if (random() < 0.1) {
    fireflies.push({
      x: random(width),
      y: random(height),
      brightness: random(100, 255)
    });
  }
  
  // Draw fireflies
  for (let i = fireflies.length - 1; i >= 0; i--) {
    let f = fireflies[i];
    
    // Fade out
    f.brightness -= 2;
    
    if (f.brightness > 0) {
      fill(255, 255, 0, f.brightness);
      ellipse(f.x, f.y, 8, 8);
    } else {
      fireflies.splice(i, 1);
    }
  }
}`
  },
  {
    name: 'Mouse Tracker',
    code: `function setup() {
  createCanvas(400, 400);
}

let trail = [];

function draw() {
  background(50);
  
  // Add current mouse position to trail
  trail.push({x: mouseX, y: mouseY});
  
  // Keep only last 20 positions
  if (trail.length > 20) {
    trail.shift();
  }
  
  // Draw trail
  for (let i = 0; i < trail.length; i++) {
    let alpha = map(i, 0, trail.length, 255, 0);
    fill(0, 255, 255, alpha);
    ellipse(trail[i].x, trail[i].y, 20 - i, 20 - i);
  }
}`
  },
  {
    name: 'Color Cycling',
    code: `function setup() {
  createCanvas(400, 400);
}

let hue = 0;

function draw() {
  colorMode(HSB, 360, 100, 100);
  background(hue, 50, 50);
  
  // Draw some shapes
  fill(hue + 180, 80, 80);
  ellipse(100, 100, 60, 60);
  
  fill(hue + 90, 70, 90);
  rect(200, 150, 80, 80);
  
  fill(hue + 270, 60, 100);
  triangle(300, 200, 350, 300, 250, 300);
  
  // Cycle colors
  hue = (hue + 1) % 360;
}`
  },
  {
    name: 'Rotating Square',
    code: `function setup() {
  createCanvas(400, 400);
}

let angle = 0;

function draw() {
  background(240);
  
  push();
  translate(width/2, height/2);
  rotate(radians(angle));
  
  // Draw rotating square
  fill(255, 0, 150);
  rect(-25, -25, 50, 50);
  
  // Draw inner circle
  fill(0, 255, 200);
  ellipse(0, 0, 30, 30);
  
  pop();
  
  // Rotate
  angle += 2;
}`
  },
  {
    name: 'Sine Wave',
    code: `function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(0);
  
  stroke(0, 255, 255);
  strokeWeight(3);
  noFill();
  
  beginShape();
  for (let x = 0; x < width; x += 5) {
    let y = height/2 + sin(radians(x + frameCount * 2)) * 100;
    vertex(x, y);
  }
  endShape();
  
  // Draw moving point
  fill(255, 255, 0);
  let x = (frameCount * 2) % width;
  let y = height/2 + sin(radians(x + frameCount * 2)) * 100;
  ellipse(x, y, 10, 10);
}`
  },
  {
    name: 'Abstract Lines',
    code: `function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(0, 10);
  
  // Random lines
  stroke(random(255), random(255), random(255));
  strokeWeight(random(1, 5));
  
  let x1 = random(width);
  let y1 = random(height);
  let x2 = random(width);
  let y2 = random(height);
  
  line(x1, y1, x2, y2);
  
  // Occasionally clear
  if (random() < 0.01) {
    background(0);
  }
}`
  }
];

async function insertTestAnimations() {
  const client = await pool.connect()
  try {
    console.log('Inserting test animations...')
    
    // Get the first model and prompt
    const modelResult = await client.query('SELECT id FROM models LIMIT 1')
    const promptResult = await client.query('SELECT id FROM prompts LIMIT 1')
    
    if (modelResult.rows.length === 0) {
      console.error('No models found in database')
      return
    }
    
    if (promptResult.rows.length === 0) {
      console.error('No prompts found in database')
      return
    }
    
    const modelId = modelResult.rows[0].id
    const promptId = promptResult.rows[0].id
    
    // Insert test animations
    for (let i = 0; i < testAnimations.length; i++) {
      const animation = testAnimations[i]
      
      await client.query(`
        INSERT INTO animations (model_id, prompt_id, code) 
        VALUES ($1, $2, $3)
      `, [modelId, promptId, animation.code])
      
      console.log(`Inserted: ${animation.name}`)
    }
    
    console.log(`Successfully inserted ${testAnimations.length} test animations`)
    console.log('You can now go to /voting to see them in action!')
    
  } catch (error) {
    console.error('Error inserting test animations:', error)
  } finally {
    client.release()
  }
}

insertTestAnimations()
  .then(() => {
    console.log('Test animations insertion completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Test animations insertion failed:', error)
    process.exit(1)
  }) 