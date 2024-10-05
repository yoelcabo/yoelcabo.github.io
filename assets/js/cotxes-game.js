        const GameConfig = {
            numCars: NUM_CARS || 2,
            carColors: [
                '#00BCD4',  // Cyan
                '#FF4081',  // Pink
                '#FFEB3B',  // Yellow
                '#4CAF50',  // Green
                '#FF5722',  // Deep Orange
                '#9C27B0',  // Purple
                '#3F51B5',  // Indigo
                '#795548'   // Brown
            ],
            startSpeed: 300,
            maxSpeed: 1000,
            acceleration: 10,
            minObstacleDistance: 150,
            maxObstaclesPerPair: 3,
            minObstaclesPerPair: 1,
            baseObstacleDistance: 300,
            fixedDeltaTime: 1000 / 60,
            bottomMargin: 0, // We'll calculate this dynamically now
            obstacleColors: [
                { circle: '#00BCD4', square: '#0097A7' },  // Cyan
                { circle: '#FF4081', square: '#C2185B' },  // Pink
                { circle: '#FFEB3B', square: '#FBC02D' },  // Yellow
                { circle: '#4CAF50', square: '#388E3C' },  // Green
                { circle: '#FF5722', square: '#E64A19' },  // Deep Orange
                { circle: '#9C27B0', square: '#7B1FA2' },  // Purple
                { circle: '#3F51B5', square: '#303F9F' },  // Indigo
                { circle: '#795548', square: '#5D4037' }   // Brown
            ],
            transitionDurations: {
                gameStart: 1000,
                gameRestart: 400,
                carMove: 250,
            }
        };

        // Set controls based on number of cars
        GameConfig.controls = GameConfig.numCars === 2 
            ? ['A', 'D', 'ArrowLeft', 'ArrowRight']
            : GameConfig.numCars <= 4 ? ['D', 'F', 'J', 'K']
            : ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];

        // Estat del joc
        const GameState = {
            cars: [],
            obstacles: [],
            score: 0,
            highScore: 0,
            isNewHighScore: false,
            gameOver: false,
            gameStarted: false,
            speed: GameConfig.startSpeed,
            lastObstacleTime: 0,
            distanceSinceLastObstacle: [],
            lastTime: 0,
            accumulator: 0,
            gameStartTransition: false,
            gameStartTransitionStart: 0,
            gameRestartTransition: false,
            gameRestartTransitionStart: 0,
            laneWidth: 0,
            lastAvoidedObstacle: null,
            gameOverObstacle: null,
            gameOverCar: null,

            initialize() {
                this.laneWidth = GameState.width / (GameConfig.numCars * 2);
                const carWidth = Math.min(50, this.laneWidth * 0.8);
                const carHeight = carWidth * 1.6;
                const initialY = GameState.height - GameConfig.bottomMargin - carHeight;
                
                // Initialize cars
                for (let i = 0; i < GameConfig.numCars; i++) {
                    const initialX = (i * 2 + 1) * this.laneWidth - carWidth / 2;
                    const isRightHalf = i >= Math.ceil(GameConfig.numCars / 2);
                    const lane = i * 2 + (isRightHalf ? 1 : 0);
                    
                    this.cars[i] = new Car(lane, GameConfig.carColors[i], initialX);
                    
                    this.cars[i].targetX = (lane + 0.5) * this.laneWidth - carWidth / 2;
                }
                
                this.obstacles = [];
                this.score = 0;
                this.gameOver = false;
                this.gameOverObstacle = null;
                this.gameOverCar = null;
                this.gameStarted = false;
                this.speed = GameConfig.startSpeed;
                this.lastObstacleTime = 0;
                this.highScore = parseInt(localStorage.getItem(`highScore_${GameConfig.numCars}cars`) || '0');
                this.isNewHighScore = false;
                
                // Initialize distance trackers for each pair of lanes
                this.distanceSinceLastObstacle = Array(GameConfig.numCars).fill(GameConfig.baseObstacleDistance);
            },

            reset() {
                if (!this.cars.length) {
                    this.initialize();
                    this.gameStartTransition = true;
                    this.gameStartTransitionStart = performance.now();
                } else {
                    // Keep the current positions for restart
                    const carCurrentPositions = this.cars.map(car => car.x);
                    
                    this.cars.forEach(car => car.remove());
                    this.obstacles.forEach(obstacle => obstacle.remove());

                    this.initialize();
                    
                    // Set the current positions as start positions
                    this.cars.forEach((car, index) => {
                        car.x = carCurrentPositions[index];
                        car.startX = carCurrentPositions[index];
                    });
                    this.gameRestartTransition = true;
                    this.gameRestartTransitionStart = performance.now();
                }
                
                this.gameStarted = true;
                this.isNewHighScore = false; 
            },

            checkTransitionEnd(currentTime) {
                if (this.gameStartTransition) {
                    const elapsedTime = currentTime - this.gameStartTransitionStart;
                    const progress = Math.min(elapsedTime / GameConfig.transitionDurations.gameStart, 1);
                    
                    // Update car positions during transition
                    this.cars.forEach(car => car.move(progress));
                    
                    if (progress >= 1) {
                        this.gameStartTransition = false;
                        this.initializeGameState();
                    }
                }
            },

            initializeGameState() {
                this.speed = GameConfig.startSpeed;
                this.lastObstacleTime = performance.now();
                this.distanceSinceLastObstacle = Array(GameConfig.numCars).fill(GameConfig.baseObstacleDistance);
            },

            updateSpeed(deltaTime) {
                if (this.speed < GameConfig.maxSpeed) {
                    this.speed += (GameConfig.acceleration * deltaTime) / 1000;
                }
            },

            createObstacle() {
                if (this.gameStartTransition || this.gameRestartTransition || !this.gameStarted) return false;
                
                let obstacleCreated = false;
                for (let i = 0; i < GameConfig.numCars; i++) {
                    const startLane = i * 2;
                    if (this.distanceSinceLastObstacle[i] >= GameConfig.baseObstacleDistance && Math.random() < 0.5) {
                        if (this.createObstacleForPair(startLane, startLane + 1)) {
                            this.distanceSinceLastObstacle[i] = 0;
                            obstacleCreated = true;
                        }
                    }
                }

                return obstacleCreated;
            },

            createObstacleForPair(lane1, lane2) {
                const pairObstacles = this.obstacles.filter(obs => obs.lane === lane1 || obs.lane === lane2);
                
                if (pairObstacles.length >= GameConfig.maxObstaclesPerPair) return false;

                const availableLanes = [lane1, lane2].filter(lane => 
                    !pairObstacles.some(obs => Math.abs(obs.y - (-obs.size)) < GameConfig.minObstacleDistance)
                );

                if (availableLanes.length === 0) return false;

                const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
                const colorSetIndex = Math.floor(lane / 2) % GameConfig.obstacleColors.length;
                const isCircle = Math.random() < 0.5;
                const obstacleColor = isCircle
                    ? GameConfig.obstacleColors[colorSetIndex].circle
                    : GameConfig.obstacleColors[colorSetIndex].square;

                const newObstacle = new Obstacle(
                    lane,
                    isCircle,
                    obstacleColor
                );
                this.obstacles.push(newObstacle);

                return true;
            },

            moveObstacles(deltaTime) {
                const moveDistance = (this.speed * deltaTime) / 1000;
                
                // Update distance for each pair of lanes
                for (let i = 0; i < this.distanceSinceLastObstacle.length; i++) {
                    this.distanceSinceLastObstacle[i] += moveDistance;
                }

                this.obstacles.forEach(obstacle => {
                    obstacle.move(moveDistance);
                    
                    if (!obstacle.isCircle && !obstacle.avoided && obstacle.y > this.height) {
                        this.score++;
                        obstacle.avoided = true;
                        this.lastAvoidedObstacle = obstacle;
                    }

                    if (obstacle.isCircle && obstacle.y + obstacle.size > this.height) {
                        this.gameOver = true;
                        this.gameOverObstacle = obstacle;
                        this.gameOverCar = this.cars[Math.floor(obstacle.lane / 2)];
                        this.gameOverObstacle.highlight();
                        this.gameOverCar.highlight();
                    }

                    // Remove obstacles that are off-screen
                    if (obstacle.y > this.height + obstacle.size) {
                        obstacle.remove();
                        this.obstacles = this.obstacles.filter(obs => obs !== obstacle);
                    }
                });
                
                this.ensureMinimumObstacles();
            },

            ensureMinimumObstacles() {
                const ensureForSide = (startLane) => {
                    const pair = this.obstacles.filter(obs => obs.lane >= startLane && obs.lane < startLane + 2);
                    if (pair.length < GameConfig.minObstaclesPerPair) {
                        this.createObstacleForPair(startLane, startLane + 1);
                    }
                };

                for (let i = 0; i < GameConfig.numCars; i += 2) {
                    ensureForSide(i);
                }
            },

            checkCollisions() {
                this.obstacles.forEach(obstacle => {
                    const carIndex = Math.floor(obstacle.lane / 2);
                    const car = this.cars[carIndex];
                    
                    // Check if the first half of the car overlaps with the obstacle
                    if (car.y < obstacle.y + obstacle.size && car.y + car.height / 2 > obstacle.y) {
                        const carRightEdge = car.x + car.width;
                        const obstacleRightEdge = obstacle.x + obstacle.size;
                        
                        // Check for overlap in x-axis
                        if (car.x < obstacleRightEdge && carRightEdge > obstacle.x) {
                            if (obstacle.isCircle) {
                                this.score++;
                                // Update high score if necessary
                                if (this.score > this.highScore) {
                                    this.highScore = this.score;
                                    localStorage.setItem(`highScore_${GameConfig.numCars}cars`, this.highScore.toString());
                                    this.isNewHighScore = true;
                                }
                                // Remove the collected obstacle
                                obstacle.remove();
                                this.obstacles = this.obstacles.filter(obs => obs !== obstacle);
                            } else {
                                this.gameOver = true;
                                this.gameOverObstacle = obstacle;
                                this.gameOverCar = car;
                                this.gameOverObstacle.highlight();
                                this.gameOverCar.highlight();
                            }
                        }
                    }
                });
            },

            updateCarPositions(deltaTime) {
                const currentTime = performance.now();
                
                const updateCarPosition = (car, transitionStart, duration) => {
                    const progress = Math.min((currentTime - transitionStart) / duration, 1);
                    car.move(progress);
                    
                    // Start straightening when the car is 80% through its movement
                    if (progress >= 0.8) {
                        car.targetTilt = 0;
                    }
                    
                    car.updateTilt(deltaTime);
                    return progress === 1;
                };

                if (this.gameStartTransition || this.gameRestartTransition) {
                    const transitionType = this.gameStartTransition ? 'gameStart' : 'gameRestart';
                    const transitionStart = this[`${transitionType}TransitionStart`];
                    const transitionDuration = GameConfig.transitionDurations[transitionType];

                    const carDoneStates = this.cars.map(car => 
                        updateCarPosition(car, transitionStart, transitionDuration)
                    );
                    const allCarsDone = carDoneStates.every(done => done);

                    if (allCarsDone) {
                        this[`${transitionType}Transition`] = false;
                        this.cars.forEach(car => car.x = car.targetX);
                    }
                } else {
                    // Calculate carMove duration based on current speed
                    const calculateCarMoveDuration = () => {
                        const minDuration = 50;
                        const maxDuration = GameConfig.transitionDurations.carMove;
                        const speedFactor = (GameConfig.maxSpeed - this.speed) / (GameConfig.maxSpeed - GameConfig.startSpeed);
                        return minDuration + speedFactor * (maxDuration - minDuration);
                    };

                    const carMoveDuration = calculateCarMoveDuration();

                    this.cars.forEach((car, index) => {
                        if (car.transitionStart > 0) {
                            const progress = Math.min((currentTime - car.transitionStart) / carMoveDuration, 1);
                            car.move(progress);
                            
                            // Start straightening when the car is 80% through its movement
                            if (progress >= 0.8) {
                                car.targetTilt = 0;
                            }
                            
                            car.updateTilt(deltaTime);

                            if (progress === 1) {
                                car.transitionStart = 0;
                            }
                        }
                    });
                }
            },

            moveCar(car, newLane) {
                const carIndex = this.cars.indexOf(car);
                const minLane = carIndex * 2;
                const maxLane = minLane + 1;
                
                if (newLane < minLane || newLane > maxLane) {
                    return false;
                }

                if (newLane !== car.lane) {
                    const oldLane = car.lane;
                    car.lane = newLane;
                    car.startX = car.x; // Set the start position
                    car.targetX = car.lane * this.laneWidth + this.laneWidth / 2 - car.width / 2;
                    car.targetTilt = (newLane > oldLane) ? Math.PI / 12 : -Math.PI / 12;
                    return true;
                }
                return false;
            },

            removeObstacle(obstacle) {
                if (obstacle.svgElement && obstacle.svgElement.parentNode) {
                    obstacle.svgElement.parentNode.removeChild(obstacle.svgElement);
                }
                this.obstacles = this.obstacles.filter(obs => obs !== obstacle);
            }
        };

        class Car {
            constructor(lane, color, initialX) {
                this.lane = lane;
                this.color = color;
                this.x = initialX;
                this.tilt = 0;
                this.targetTilt = 0;
                this.tiltVelocity = 0;
                this.updateDimensions();
                this.targetX = this.x;
                this.startX = this.x;
                this.svgElement = this.createSVGElement();
                console.log("car created")
            }

            createSVGElement() {
                const element = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                const carIndex = GameConfig.carColors.indexOf(this.color);
                element.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#car${carIndex}`);
                document.getElementById('layer-cars').appendChild(element);
                return element;
            }
            
            highlight() {
                const topLayer = document.getElementById('layer-gameOver');
                if (this.svgElement && this.svgElement.parentNode && topLayer) {
                    this.svgElement.parentNode.removeChild(this.svgElement);
                    topLayer.appendChild(this.svgElement);
                }
            }

            updateDimensions() {
                this.width = Math.min(50, GameState.laneWidth * 0.8);
                this.height = this.width * 1.6;
                // Adjust the vertical position of the car
                this.y = GameState.height - this.height - GameConfig.bottomMargin - (GameState.height * 0.02); // Lift the car by 5% of the game height instead of 10%
                this.updatePosition();
            }

            updatePosition() {
                this.targetX = this.lane * GameState.laneWidth + GameState.laneWidth / 2 - this.width / 2;
                if (this.x === undefined) {
                    this.x = this.targetX;
                }
            }

            updateVisibility() {
                this.svgElement.setAttribute('x', this.x);
                this.svgElement.setAttribute('y', this.y);
                this.svgElement.setAttribute('transform', `rotate(${this.tilt * (180 / Math.PI)}, ${this.x + this.width / 2}, ${this.y + this.height / 2})`);
            }

            move(progress) {
                this.x = this.startX + (this.targetX - this.startX) * progress;
            }

            updateTilt(deltaTime) {
                const springStrength = 0.3;
                const damping = 0.7;
                const maxTilt = Math.PI / 12;
                const returnSpeed = 0.008; // Reduced from 0.012

                if (this.targetTilt !== 0) {
                    // Tilting towards target
                    const tiltForce = (this.targetTilt - this.tilt) * springStrength;
                    this.tiltVelocity += tiltForce;
                    this.tiltVelocity *= damping;
                    this.tilt += this.tiltVelocity * deltaTime / 16;
                } else {
                    // Returning to straight position
                    const direction = Math.sign(this.tilt);
                    const newTilt = this.tilt - direction * returnSpeed * deltaTime;
                    
                    // Check if we've crossed zero
                    if (Math.sign(newTilt) !== direction) {
                        this.tilt = 0;
                        this.tiltVelocity = 0;
                    } else {
                        this.tilt = newTilt;
                    }
                }

                // Clamp tilt to max values
                this.tilt = Math.max(Math.min(this.tilt, maxTilt), -maxTilt);
            }

            remove() {
                if (this.svgElement && this.svgElement.parentNode) {
                    this.svgElement.parentNode.removeChild(this.svgElement);
                }
            }
        }

        class Obstacle {
            constructor(lane, isCircle, color) {
                this.lane = lane;
                this.isCircle = isCircle;
                this.color = color;
                this.avoided = false;
                this.updateDimensions();
                this.svgElement = this.createSVGElement();
            }

            createSVGElement() {
                const element = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                element.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${this.getPresetId()}`);
                document.getElementById('layer-obstacles').appendChild(element);
                return element;
            }

            highlight() {
                const topLayer = document.getElementById('layer-gameOver');
                if (this.svgElement && this.svgElement.parentNode && topLayer) {
                    this.svgElement.parentNode.removeChild(this.svgElement);
                    topLayer.appendChild(this.svgElement);
                }
            }

            getPresetId() {
                const colorIndex = Math.floor(this.lane / 2);
                const shapeType = this.isCircle ? 'circle' : 'square';
                return `${shapeType}${colorIndex}`;
            }

            updateDimensions() {
                this.size = Math.min(40, GameState.laneWidth * 0.6);
                this.x = (this.lane + 0.5) * GameState.laneWidth - this.size / 2;
                // Start obstacles higher in the game area, but adjusted for the new car position
                this.y = -this.size - (GameState.height * 0.05); // Start 5% of game height higher
            }

            updateVisibility() {
                this.svgElement.setAttribute('x', this.x);
                this.svgElement.setAttribute('y', this.y);
            }

            move(distance) {
                this.y += distance;
            }

            remove() {
                if (this.svgElement && this.svgElement.parentNode) {
                    this.svgElement.parentNode.removeChild(this.svgElement);
                }
            }
        }

        function drawScore(ctx) {
            const svg = document.getElementById('gameSVG');
            
            // Remove previous score elements
            const oldScoreElements = svg.querySelectorAll('.score-element');
            oldScoreElements.forEach(el => el.remove());

            // Score background
            const scoreBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            scoreBackground.setAttribute('x', '10');
            scoreBackground.setAttribute('y', '10');
            scoreBackground.setAttribute('width', '80');
            scoreBackground.setAttribute('height', '40');
            scoreBackground.setAttribute('rx', '20');
            scoreBackground.setAttribute('ry', '20');
            scoreBackground.setAttribute('fill', GameState.isNewHighScore ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)');
            scoreBackground.classList.add('score-element');
            svg.appendChild(scoreBackground);

            // Score text
            const scoreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            scoreText.setAttribute('x', '50');
            scoreText.setAttribute('y', '38');
            scoreText.setAttribute('text-anchor', 'middle');
            scoreText.setAttribute('font-family', 'Poppins');
            scoreText.setAttribute('font-size', '24');
            scoreText.setAttribute('font-weight', 'bold');
            scoreText.setAttribute('fill', GameState.isNewHighScore ? 'rgba(255, 223, 0, 0.9)' : 'white');
            scoreText.textContent = GameState.score.toString();
            scoreText.classList.add('score-element');
            svg.appendChild(scoreText);

            // High score (if applicable)
            if (GameState.highScore >= 10 && !GameState.isNewHighScore) {
                const highScoreBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                highScoreBackground.setAttribute('x', GameState.width - 90);
                highScoreBackground.setAttribute('y', '10');
                highScoreBackground.setAttribute('width', '80');
                highScoreBackground.setAttribute('height', '40');
                highScoreBackground.setAttribute('rx', '20');
                highScoreBackground.setAttribute('ry', '20');
                highScoreBackground.setAttribute('fill', 'rgba(255, 215, 0, 0.1)');
                highScoreBackground.classList.add('score-element');
                svg.appendChild(highScoreBackground);

                const highScoreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                highScoreText.setAttribute('x', GameState.width - 50);
                highScoreText.setAttribute('y', '38');
                highScoreText.setAttribute('text-anchor', 'middle');
                highScoreText.setAttribute('font-family', 'Poppins');
                highScoreText.setAttribute('font-size', '24');
                highScoreText.setAttribute('font-weight', 'bold');
                highScoreText.setAttribute('fill', 'rgba(255, 223, 0, 0.9)');
                highScoreText.textContent = GameState.highScore.toString();
                highScoreText.classList.add('score-element');
                svg.appendChild(highScoreText);
            }
        }

        const GameOverScreen = {
            group: null,
            lowScoreElements: null,
            highScoreElements: null,

            draw() {
                const svg = document.getElementById('layer-gameOver');

                // Remove old group if it exists
                if (this.group) {
                    svg.removeChild(this.group);
                }

                // Create new group
                this.group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                this.group.setAttribute('id', 'gameOverScreenGroup');
                svg.appendChild(this.group);

                // Semi-transparent overlay
                const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                overlay.setAttribute('width', GameState.width);
                overlay.setAttribute('height', GameState.height);
                overlay.setAttribute('fill', 'rgba(0, 0, 0, 0.7)');
                this.group.appendChild(overlay);

                this.drawLowScoreGameOver();
                this.drawHighScoreGameOver();
                this.drawRestartButton();

                this.updateVisibility();
            },

            drawLowScoreGameOver() {
                this.lowScoreElements = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                this.group.appendChild(this.lowScoreElements);

                const scoreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                scoreText.setAttribute('x', GameState.width / 2);
                scoreText.setAttribute('y', GameState.height / 2 - 100);
                scoreText.setAttribute('text-anchor', 'middle');
                scoreText.setAttribute('font-family', 'Poppins');
                scoreText.setAttribute('font-size', '80');
                scoreText.setAttribute('font-weight', 'bold');
                scoreText.setAttribute('fill', 'white');
                scoreText.textContent = '0';  // Will be updated later
                this.lowScoreElements.appendChild(scoreText);

                const messageText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                messageText.setAttribute('x', GameState.width / 2);
                messageText.setAttribute('y', GameState.height / 2 - 20);
                messageText.setAttribute('text-anchor', 'middle');
                messageText.setAttribute('font-family', 'Poppins');
                messageText.setAttribute('font-size', '40');
                messageText.setAttribute('font-weight', 'bold');
                messageText.setAttribute('fill', 'white');
                this.lowScoreElements.appendChild(messageText);

                const instructionText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                instructionText.setAttribute('x', GameState.width / 2);
                instructionText.setAttribute('y', GameState.height / 2 + 30);
                instructionText.setAttribute('text-anchor', 'middle');
                instructionText.setAttribute('font-family', 'Poppins');
                instructionText.setAttribute('font-size', '24');
                instructionText.setAttribute('fill', 'white');
                this.lowScoreElements.appendChild(instructionText);
            },

            drawHighScoreGameOver() {
                this.highScoreElements = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                this.group.appendChild(this.highScoreElements);

                const scoreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                scoreText.setAttribute('x', GameState.width / 2);
                scoreText.setAttribute('y', GameState.height / 2);
                scoreText.setAttribute('text-anchor', 'middle');
                scoreText.setAttribute('font-family', 'Poppins');
                scoreText.setAttribute('font-size', '80');
                scoreText.setAttribute('font-weight', 'bold');
                scoreText.setAttribute('fill', 'white');
                scoreText.textContent = '0';  // Will be updated later
                this.highScoreElements.appendChild(scoreText);

                const newRecordText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                newRecordText.setAttribute('x', GameState.width / 2);
                newRecordText.setAttribute('y', GameState.height / 2 - 80);
                newRecordText.setAttribute('text-anchor', 'middle');
                newRecordText.setAttribute('font-family', 'Poppins');
                newRecordText.setAttribute('font-size', '24');
                newRecordText.setAttribute('font-weight', 'bold');
                newRecordText.setAttribute('fill', 'url(#goldGradient)');
                newRecordText.textContent = 'NOU RÈCORD!';
                this.highScoreElements.appendChild(newRecordText);
            },

            drawRestartButton() {
                const buttonGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

                const buttonRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                buttonRect.setAttribute('x', GameState.width / 2 - 75);
                buttonRect.setAttribute('y', GameState.height / 2 + 80);
                buttonRect.setAttribute('width', '150');
                buttonRect.setAttribute('height', '40');
                buttonRect.setAttribute('rx', '10');
                buttonRect.setAttribute('ry', '10');
                buttonRect.setAttribute('fill', '#f0f0f0');
                buttonRect.setAttribute('stroke', '#999');
                buttonRect.setAttribute('stroke-width', '2');
                buttonGroup.appendChild(buttonRect);

                const buttonText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                buttonText.setAttribute('x', GameState.width / 2);
                buttonText.setAttribute('y', GameState.height / 2 + 108);
                buttonText.setAttribute('text-anchor', 'middle');
                buttonText.setAttribute('font-family', 'Poppins');
                buttonText.setAttribute('font-size', '24');
                buttonText.setAttribute('font-weight', 'bold');
                buttonText.setAttribute('fill', '#333');
                buttonText.textContent = isMobile() ? 'TOCA' : 'ESPAI';
                buttonGroup.appendChild(buttonText);

                this.group.appendChild(buttonGroup);

                const instructionText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                instructionText.setAttribute('x', GameState.width / 2);
                instructionText.setAttribute('y', GameState.height / 2 + 150);
                instructionText.setAttribute('text-anchor', 'middle');
                instructionText.setAttribute('font-family', 'Poppins');
                instructionText.setAttribute('font-size', '20');
                instructionText.setAttribute('fill', 'white');
                instructionText.textContent = 'per tornar-hi';
                this.group.appendChild(instructionText);
            },

            updateVisibility() {
                if (GameState.gameOver) {
                    this.show();
                } else {
                    this.hide();
                }

                if (GameState.score < 10) {
                    this.lowScoreElements.style.display = 'block';
                    this.highScoreElements.style.display = 'none';
                    
                    const scoreText = this.lowScoreElements.querySelector('text');
                    scoreText.textContent = GameState.score.toString();

                    const messageText = this.lowScoreElements.querySelectorAll('text')[1];
                    messageText.textContent = GameState.gameOverObstacle && GameState.gameOverObstacle.isCircle ? "Se t'ha escapat!" : 'Has xocat!';

                    const instructionText = this.lowScoreElements.querySelectorAll('text')[2];
                    instructionText.textContent = GameState.gameOverObstacle && GameState.gameOverObstacle.isCircle ? "agafa tots els cercles" : "evita els quadrats";
                } else {
                    this.lowScoreElements.style.display = 'none';
                    this.highScoreElements.style.display = 'block';

                    const scoreText = this.highScoreElements.querySelector('text');
                    scoreText.textContent = GameState.score.toString();
                    scoreText.setAttribute('fill', GameState.isNewHighScore ? 'url(#goldGradient)' : 'white');

                    const newRecordText = this.highScoreElements.querySelectorAll('text')[1];
                    newRecordText.style.display = GameState.isNewHighScore ? 'block' : 'none';
                }
            },

            show() {
                if (this.group) {
                    this.group.style.display = 'block';
                } else {
                    this.draw();
                }
            },

            hide() {
                if (this.group) {
                    this.group.style.display = 'none';
                }
            }
        };

        const GameScreen = {
            group: null,
            laneLines: [],
            scoreElements: [],

            draw() {
                const svg = document.getElementById('layer-ui');

                // Remove old group if it exists
                if (this.group) {
                    svg.removeChild(this.group);
                }

                // Create new group
                this.group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                this.group.setAttribute('id', 'gameScreenGroup');
                svg.appendChild(this.group);

                this.drawBackground();
                this.drawLanes();
                this.drawScore();
            },

            drawBackground() {
                const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                background.setAttribute('width', '100%');
                background.setAttribute('height', '100%');
                background.setAttribute('fill', 'url(#gameBackgroundGradient)');
                this.group.insertBefore(background, this.group.firstChild);
            },

            drawLanes() {
                this.laneLines = [];
                for (let i = 1; i < GameConfig.numCars * 2; i++) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', i * GameState.laneWidth);
                    line.setAttribute('y1', 0);
                    line.setAttribute('x2', i * GameState.laneWidth);
                    line.setAttribute('y2', GameState.height);
                    line.setAttribute('stroke', 'rgba(255, 255, 255, 0.2)');
                    line.setAttribute('stroke-width', '2');

                    if (i % 2 === 0) {
                        // Central double solid line
                        line.setAttribute('stroke-width', '4');
                    } else {
                        // Dashed lines
                        line.setAttribute('stroke-dasharray', '20, 60');
                    }

                    this.group.appendChild(line);
                    this.laneLines.push(line);
                }
            },

            drawScore() {
                this.scoreElements = [];

                // Score background
                const scoreBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                scoreBackground.setAttribute('x', '10');
                scoreBackground.setAttribute('y', '10');
                scoreBackground.setAttribute('width', '80');
                scoreBackground.setAttribute('height', '40');
                scoreBackground.setAttribute('rx', '20');
                scoreBackground.setAttribute('ry', '20');
                scoreBackground.setAttribute('fill', GameState.isNewHighScore ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)');
                this.group.appendChild(scoreBackground);
                this.scoreElements.push(scoreBackground);

                // Score text
                const scoreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                scoreText.setAttribute('x', '50');
                scoreText.setAttribute('y', '38');
                scoreText.setAttribute('text-anchor', 'middle');
                scoreText.setAttribute('font-family', 'Poppins');
                scoreText.setAttribute('font-size', '24');
                scoreText.setAttribute('font-weight', 'bold');
                scoreText.setAttribute('fill', GameState.isNewHighScore ? 'rgba(255, 223, 0, 0.9)' : 'white');
                scoreText.textContent = GameState.score.toString();
                this.group.appendChild(scoreText);
                this.scoreElements.push(scoreText);

                const highScoreBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                highScoreBackground.setAttribute('x', GameState.width - 90);
                highScoreBackground.setAttribute('y', '10');
                highScoreBackground.setAttribute('width', '80');
                highScoreBackground.setAttribute('height', '40');
                highScoreBackground.setAttribute('rx', '20');
                highScoreBackground.setAttribute('ry', '20');
                highScoreBackground.setAttribute('fill', 'rgba(255, 215, 0, 0.1)');
                this.group.appendChild(highScoreBackground);
                this.scoreElements.push(highScoreBackground);

                const highScoreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                highScoreText.setAttribute('x', GameState.width - 50);
                highScoreText.setAttribute('y', '38');
                highScoreText.setAttribute('text-anchor', 'middle');
                highScoreText.setAttribute('font-family', 'Poppins');
                highScoreText.setAttribute('font-size', '24');
                highScoreText.setAttribute('font-weight', 'bold');
                highScoreText.setAttribute('fill', 'rgba(255, 223, 0, 0.9)');
                highScoreText.textContent = GameState.highScore.toString();
                this.group.appendChild(highScoreText);
                this.scoreElements.push(highScoreText);
            },

            updateScore() {
                const scoreText = this.scoreElements[1];
                scoreText.textContent = GameState.score.toString();

                const scoreBackground = this.scoreElements[0];

                const highScoreBackground = this.scoreElements[2];
                const highScoreText = this.scoreElements[3];
                highScoreText.textContent = GameState.highScore.toString();
                
                if (GameState.isNewHighScore) {
                    scoreBackground.setAttribute('fill', 'rgba(255, 215, 0, 0.2)');
                    scoreText.setAttribute('fill', 'rgba(255, 223, 0, 0.9)');

                } else {
                    scoreBackground.setAttribute('fill', 'rgba(255, 255, 255, 0.1)');
                    scoreText.setAttribute('fill', 'white');
                }

                const showHighScore = GameState.highScore >= 10 && !GameState.isNewHighScore;
                highScoreBackground.setAttribute('display', showHighScore ? 'block' : 'none');
                highScoreText.setAttribute('display', showHighScore ? 'block' : 'none');
            },

            show() {
                if (this.group) {
                    this.group.style.display = 'block';
                } else {
                    this.draw();
                }
            },

            hide() {
                if (this.group) {
                    this.group.style.display = 'none';
                }
            },

            updateVisibility() {
                this.show();
                this.updateScore();
                GameState.cars.forEach(car => car.updateVisibility());
                GameState.obstacles.forEach(obstacle => obstacle.updateVisibility());
            }
        };

        const StartScreen = {
            group: null,
            
            draw() {
                const svg = document.getElementById('layer-ui');
                
                // Remove old group if it exists
                if (this.group) {
                    svg.removeChild(this.group);
                }
                
                // Create new group
                this.group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                this.group.setAttribute('id', 'startScreenGroup');
                svg.appendChild(this.group);

                // Background
                const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                background.setAttribute('width', GameState.width);
                background.setAttribute('height', GameState.height);
                background.setAttribute('fill', 'url(#startScreenGradient)');
                this.group.appendChild(background);

                // Title
                const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                title.setAttribute('x', GameState.width / 2);
                title.setAttribute('y', GameState.height / 2 - 40);
                title.setAttribute('text-anchor', 'middle');
                title.setAttribute('font-family', 'Poppins');
                title.setAttribute('font-size', '36');
                title.setAttribute('font-weight', 'bold');
                title.setAttribute('fill', 'white');
                title.textContent = this.getGameTitle();
                this.group.appendChild(title);

                // Start button
                const startButton = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                
                const buttonRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                buttonRect.setAttribute('x', GameState.width / 2 - 75);
                buttonRect.setAttribute('y', GameState.height / 2 + 20);
                buttonRect.setAttribute('width', '150');
                buttonRect.setAttribute('height', '40');
                buttonRect.setAttribute('rx', '10');
                buttonRect.setAttribute('ry', '10');
                buttonRect.setAttribute('fill', '#f0f0f0');
                buttonRect.setAttribute('stroke', '#999');
                buttonRect.setAttribute('stroke-width', '2');
                startButton.appendChild(buttonRect);

                const buttonText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                buttonText.setAttribute('x', GameState.width / 2);
                buttonText.setAttribute('y', GameState.height / 2 + 48);
                buttonText.setAttribute('text-anchor', 'middle');
                buttonText.setAttribute('font-family', 'Poppins');
                buttonText.setAttribute('font-size', '24');
                buttonText.setAttribute('font-weight', 'bold');
                buttonText.setAttribute('fill', '#333');
                buttonText.textContent = isMobile() ? 'TOCA' : 'ESPAI';
                startButton.appendChild(buttonText);

                this.group.appendChild(startButton);

                const instructionText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                instructionText.setAttribute('x', GameState.width / 2);
                instructionText.setAttribute('y', GameState.height / 2 + 90);
                instructionText.setAttribute('text-anchor', 'middle');
                instructionText.setAttribute('font-family', 'Poppins');
                instructionText.setAttribute('font-size', '20');
                instructionText.setAttribute('fill', 'white');
                instructionText.textContent = 'per començar';
                this.group.appendChild(instructionText);
            },

            getGameTitle() {
                const numberWords = ['Zero', 'Un', 'Dos', 'Tres', 'Quatre', 'Cinc', 'Sis', 'Set', 'Vuit'];
                const carWord = GameConfig.numCars === 1 ? 'cotxe' : 'cotxes';
                return `${numberWords[GameConfig.numCars]} ${carWord}`;
            },

            show() {
                if (this.group) {
                    this.group.style.display = 'block';
                } else {
                    this.draw();
                }
            },

            updateVisibility() {
                if (GameState.gameStarted) {
                    this.hide();
                } else {
                    this.show();
                }
            },

            hide() {
                if (this.group) {
                    this.group.style.display = 'none';
                }
            }
        };

        // Funcions principals del joc
        function resizeCanvas() {
            const container = document.getElementById('gameContainer');
            const controlsPanel = document.getElementById('controlsPanel');
            const gameSVG = document.getElementById('gameSVG');
            
            const fixedHeight = 900;

            if (isMobile()) {
                GameState.width = window.innerWidth;
                GameState.height = window.innerHeight;
                controlsPanel.style.display = 'none';
            } else {
                // Adjust width based on number of cars, but keep height fixed
                const baseWidth = GameConfig.numCars * 200;
                GameState.width = Math.min(baseWidth, window.innerWidth * 0.8);
                GameState.height = fixedHeight;
                container.style.width = `${GameState.width}px`;
                container.style.height = `${GameState.height + controlsPanel.clientHeight}px`;
                controlsPanel.style.display = 'flex';
            }
            
            GameState.laneWidth = GameState.width / (GameConfig.numCars * 2);
            
            if (GameState.cars.length > 0) {
                GameState.cars.forEach(car => car.updateDimensions());
                GameState.obstacles.forEach(obstacle => obstacle.updateDimensions());
            }
            
            gameSVG.setAttribute('width', GameState.width);
            gameSVG.setAttribute('height', GameState.height);
            
            // Recalculate bottom margin based on fixed height
            GameConfig.bottomMargin = GameState.height * 0.05; // 5% of game height

            GameScreen.draw();
            StartScreen.draw();
            GameOverScreen.draw();
        }

        function gameLoop(currentTime) {
            if (GameState.lastTime === 0) {
                GameState.lastTime = currentTime;
            }
            const deltaTime = currentTime - GameState.lastTime;
            GameState.lastTime = currentTime;
            
            GameState.checkTransitionEnd(currentTime);

            if (GameState.gameStarted && !GameState.gameOver) {
                gameUpdate(deltaTime);
            }
            updateVisibility();

            requestAnimationFrame(gameLoop);
        }

        function updateVisibility() {
            StartScreen.updateVisibility();
            GameOverScreen.updateVisibility();
            GameScreen.updateVisibility();
        }

        function gameUpdate(deltaTime) {
            GameState.accumulator += deltaTime;
            while (GameState.accumulator >= GameConfig.fixedDeltaTime) {
                gameStep(GameConfig.fixedDeltaTime);
                GameState.accumulator -= GameConfig.fixedDeltaTime;
            }
        }

        function gameStep(deltaTime) {
            GameState.updateCarPositions(deltaTime);
            if (!GameState.gameStartTransition && !GameState.gameRestartTransition && GameState.gameStarted) {
                GameState.moveObstacles(deltaTime);
                GameState.checkCollisions();
                GameState.createObstacle();
                GameState.updateSpeed(deltaTime);
            }
        }

        // Gestió d'entrada
        function handleStart(event) {
            event.preventDefault();
            if (!GameState.gameStarted || GameState.gameOver) {
                GameState.reset();
                return;
            }
            
            const touches = event.changedTouches;
            for (let i = 0; i < touches.length; i++) {
                handleTouch(touches[i]);
            }
        }

        function handleTouch(touch) {
            if (GameState.gameStartTransition) return;

            // Check if the touch is on the fullscreen button
            const fullscreenButton = document.getElementById('fullscreenButton');
            const buttonRect = fullscreenButton.getBoundingClientRect();
            if (touch.clientX >= buttonRect.left && touch.clientX <= buttonRect.right &&
                touch.clientY >= buttonRect.top && touch.clientY <= buttonRect.bottom) {
                return; // Ignore touches on the fullscreen button
            }

            const rect = document.getElementById('gameSVG').getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const currentTime = performance.now();

            if (GameConfig.numCars === 2) {
                // Existing touch handling for two cars
                const isRightHalf = x > GameState.width / 2;
                if (isRightHalf) {
                    const newLane = GameState.cars[1].lane === 2 ? 3 : 2;
                    if (GameState.moveCar(GameState.cars[1], newLane)) {
                        GameState.cars[1].transitionStart = currentTime;
                    }
                } else {
                    const newLane = GameState.cars[0].lane === 0 ? 1 : 0;
                    if (GameState.moveCar(GameState.cars[0], newLane)) {
                        GameState.cars[0].transitionStart = currentTime;
                    }
                }
            } else {
                const carIndex = Math.floor(x / (GameState.width / GameConfig.numCars));
                if (carIndex < GameState.cars.length) {
                    const car = GameState.cars[carIndex];
                    const newLane = (car.lane === carIndex * 2) ? carIndex * 2 + 1 : carIndex * 2;
                    if (GameState.moveCar(car, newLane)) {
                        car.transitionStart = currentTime;
                    }
                }
            }
        }

        function handleKeyDown(event) {
            if (event.code === 'Space') {
                if (!GameState.gameStarted || GameState.gameOver) {
                    GameState.reset();
                }
                return;
            }

            if (!GameState.gameStarted || GameState.gameOver || GameState.gameStartTransition) return;

            const currentTime = performance.now();
            const key = event.key.toUpperCase();

            if (GameConfig.numCars === 2) {
                // Original control scheme for 2 cars
                switch(key) {
                    case 'A':
                        if (GameState.moveCar(GameState.cars[0], GameState.cars[0].lane - 1)) {
                            GameState.cars[0].transitionStart = currentTime;
                        }
                        break;
                    case 'D':
                        if (GameState.moveCar(GameState.cars[0], GameState.cars[0].lane + 1)) {
                            GameState.cars[0].transitionStart = currentTime;
                        }
                        break;
                    case 'ARROWLEFT':
                        if (GameState.moveCar(GameState.cars[1], GameState.cars[1].lane - 1)) {
                            GameState.cars[1].transitionStart = currentTime;
                        }
                        break;
                    case 'ARROWRIGHT':
                        if (GameState.moveCar(GameState.cars[1], GameState.cars[1].lane + 1)) {
                            GameState.cars[1].transitionStart = currentTime;
                        }
                        break;
                }
            } else {
                // New control scheme for 3 or more cars
                const carIndex = GameConfig.controls.indexOf(key);
                if (carIndex !== -1 && carIndex < GameState.cars.length) {
                    const car = GameState.cars[carIndex];
                    const newLane = (car.lane === carIndex * 2) ? carIndex * 2 + 1 : carIndex * 2;
                    if (GameState.moveCar(car, newLane)) {
                        car.transitionStart = currentTime;
                    }
                }
            }
        }

        // Funcions d'utilitat
        function isMobile() {
            return window.innerWidth / window.innerHeight <= 9/16
        }

        function shadeColor(color, percent) {
            let R = parseInt(color.substring(1,3),16);
            let G = parseInt(color.substring(3,5),16);
            let B = parseInt(color.substring(5,7),16);

            R = parseInt(R * (100 + percent) / 100);
            G = parseInt(G * (100 + percent) / 100);
            B = parseInt(B * (100 + percent) / 100);

            R = (R<255)?R:255;  
            G = (G<255)?G:255;  
            B = (B<255)?B:255;  

            let RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
            let GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
            let BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

            return "#"+RR+GG+BB;
        }

        // Afegeix aquesta funció al final del teu codi JavaScript
        function hideAuthorInfo() {
            const authorInfo = document.getElementById('author-info');
            if (window.innerWidth / window.innerHeight <= 9/16) {
                authorInfo.style.display = 'none';
            } else {
                authorInfo.style.display = 'block';
            }
        }

        window.addEventListener('resize', () => {
            resizeCanvas();
            hideAuthorInfo();
        });

        // Add this to ensure proper sizing on orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(resizeCanvas, 100);
        });

        document.getElementById('gameContainer').addEventListener('mousedown', function(event) {
            handleTouch(event);
        });
        document.getElementById('gameContainer').addEventListener('touchstart', handleStart, { passive: false });
        document.addEventListener('keydown', handleKeyDown);

        // Add this near the end of your JavaScript, just before the event listeners
        console.log('Is mobile:', isMobile());
        console.log('Fullscreen button:', document.getElementById('fullscreenButton'));

        function initializeSVG() {
            const svg = document.getElementById('gameSVG');
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

            // Start screen gradient
            const startScreenGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
            startScreenGradient.setAttribute('id', 'startScreenGradient');
            startScreenGradient.setAttribute('x1', '0%');
            startScreenGradient.setAttribute('y1', '0%');
            startScreenGradient.setAttribute('x2', '0%');
            startScreenGradient.setAttribute('y2', '100%');

            const startStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            startStop1.setAttribute('offset', '0%');
            startStop1.setAttribute('stop-color', '#1a237e');

            const startStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            startStop2.setAttribute('offset', '100%');
            startStop2.setAttribute('stop-color', '#4a148c');

            startScreenGradient.appendChild(startStop1);
            startScreenGradient.appendChild(startStop2);
            defs.appendChild(startScreenGradient);

            // Gold gradient for high score
            const goldGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
            goldGradient.setAttribute('id', 'goldGradient');
            goldGradient.setAttribute('x1', '0%');
            goldGradient.setAttribute('y1', '0%');
            goldGradient.setAttribute('x2', '100%');
            goldGradient.setAttribute('y2', '100%');

            const goldStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            goldStop1.setAttribute('offset', '0%');
            goldStop1.setAttribute('stop-color', 'rgba(255, 223, 0, 0.9)');

            const goldStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            goldStop2.setAttribute('offset', '100%');
            goldStop2.setAttribute('stop-color', 'rgba(255, 223, 0, 0.7)');

            goldGradient.appendChild(goldStop1);
            goldGradient.appendChild(goldStop2);
            defs.appendChild(goldGradient);

            // Add game background gradient
            const gameBackgroundGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
            gameBackgroundGradient.setAttribute('id', 'gameBackgroundGradient');
            gameBackgroundGradient.setAttribute('x1', '0%');
            gameBackgroundGradient.setAttribute('y1', '0%');
            gameBackgroundGradient.setAttribute('x2', '0%');
            gameBackgroundGradient.setAttribute('y2', '100%');

            const gameBackgroundStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            gameBackgroundStop1.setAttribute('offset', '0%');
            gameBackgroundStop1.setAttribute('stop-color', '#1A237E');

            const gameBackgroundStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            gameBackgroundStop2.setAttribute('offset', '100%');
            gameBackgroundStop2.setAttribute('stop-color', '#311B92');

            gameBackgroundGradient.appendChild(gameBackgroundStop1);
            gameBackgroundGradient.appendChild(gameBackgroundStop2);
            defs.appendChild(gameBackgroundGradient);

            svg.appendChild(defs);

            // Create layers
            const layers = ['background', 'ui','obstacles', 'cars', 'gameOver'];
            layers.forEach((layer, index) => {
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('id', `layer-${layer}`);
                g.style.zIndex = index.toString();
                svg.appendChild(g);
            });
        }

        initializeSVG();

        // Add this function to create obstacle presets
        function createObstaclePresets() {
            const svg = document.getElementById('gameSVG');
            
            // Ensure SVG is visible
            svg.style.display = 'block';
            svg.style.zIndex = '1000';

            const createDefs = (targetSVG) => {
                const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                targetSVG.appendChild(defs);

                const presetSize = 40;
                const presets = [
                    ...GameConfig.obstacleColors.flatMap((colorSet, index) => [
                        { id: `circle${index}`, isCircle: true, color: colorSet.circle },
                        { id: `square${index}`, isCircle: false, color: colorSet.square }
                    ]),
                    ...GameConfig.carColors.map((color, index) => ({ id: `car${index}`, isCar: true, color: color }))
                ];

                presets.forEach((preset) => {
                    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                    group.setAttribute('id', preset.id);

                    if (preset.isCar) {
                        const carWidth = presetSize;
                        const carHeight = carWidth * 1.6;

                        // Main body
                        const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        body.setAttribute('width', carWidth);
                        body.setAttribute('height', carHeight);
                        body.setAttribute('rx', 15);
                        body.setAttribute('ry', 15);
                        body.setAttribute('fill', preset.color);
                        group.appendChild(body);

                        // Roof
                        const roof = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        roof.setAttribute('x', 5);
                        roof.setAttribute('y', 15);
                        roof.setAttribute('width', carWidth - 10);
                        roof.setAttribute('height', carHeight - 35);
                        roof.setAttribute('rx', 10);
                        roof.setAttribute('ry', 10);
                        roof.setAttribute('fill', shadeColor(preset.color, -20));
                        group.appendChild(roof);

                        // Window
                        const window = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        window.setAttribute('x', 8);
                        window.setAttribute('y', 20);
                        window.setAttribute('width', carWidth - 16);
                        window.setAttribute('height', carHeight - 45);
                        window.setAttribute('rx', 5);
                        window.setAttribute('ry', 5);
                        window.setAttribute('fill', 'url(#windowGradient)');
                        group.appendChild(window);

                        // Headlights
                        const headlight1 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                        headlight1.setAttribute('cx', 10);
                        headlight1.setAttribute('cy', 5);
                        headlight1.setAttribute('rx', 5);
                        headlight1.setAttribute('ry', 3);
                        headlight1.setAttribute('fill', '#FFEB3B');
                        group.appendChild(headlight1);

                        const headlight2 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                        headlight2.setAttribute('cx', carWidth - 10);
                        headlight2.setAttribute('cy', 5);
                        headlight2.setAttribute('rx', 5);
                        headlight2.setAttribute('ry', 3);
                        headlight2.setAttribute('fill', '#FFEB3B');
                        group.appendChild(headlight2);

                        // Taillights
                        const taillight1 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                        taillight1.setAttribute('cx', 10);
                        taillight1.setAttribute('cy', carHeight - 5);
                        taillight1.setAttribute('rx', 5);
                        taillight1.setAttribute('ry', 3);
                        taillight1.setAttribute('fill', '#FFA000');
                        group.appendChild(taillight1);

                        const taillight2 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                        taillight2.setAttribute('cx', carWidth - 10);
                        taillight2.setAttribute('cy', carHeight - 5);
                        taillight2.setAttribute('rx', 5);
                        taillight2.setAttribute('ry', 3);
                        taillight2.setAttribute('fill', '#FFA000');
                        group.appendChild(taillight2);

                    } else if (preset.isCircle) {
                        const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                        outerCircle.setAttribute('cx', presetSize / 2);
                        outerCircle.setAttribute('cy', presetSize / 2);
                        outerCircle.setAttribute('r', presetSize / 2);
                        outerCircle.setAttribute('fill', preset.color);
                        group.appendChild(outerCircle);

                        const whiteRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                        whiteRing.setAttribute('cx', presetSize / 2);
                        whiteRing.setAttribute('cy', presetSize / 2);
                        whiteRing.setAttribute('r', presetSize * 0.4);
                        whiteRing.setAttribute('fill', 'rgba(255, 255, 255, 0.8)');
                        group.appendChild(whiteRing);

                        const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                        innerCircle.setAttribute('cx', presetSize / 2);
                        innerCircle.setAttribute('cy', presetSize / 2);
                        innerCircle.setAttribute('r', presetSize * 0.3);
                        innerCircle.setAttribute('fill', preset.color);
                        group.appendChild(innerCircle);

                        const centralDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                        centralDot.setAttribute('cx', presetSize / 2);
                        centralDot.setAttribute('cy', presetSize / 2);
                        centralDot.setAttribute('r', presetSize * 0.1);
                        centralDot.setAttribute('fill', 'white');
                        group.appendChild(centralDot);
                    } else {
                        const square = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        square.setAttribute('width', presetSize);
                        square.setAttribute('height', presetSize);
                        square.setAttribute('rx', presetSize / 5);
                        square.setAttribute('ry', presetSize / 5);
                        square.setAttribute('fill', preset.color);
                        group.appendChild(square);

                        const warningSymbol = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        warningSymbol.setAttribute('d', `M${presetSize / 4},${presetSize / 4} L${3 * presetSize / 4},${3 * presetSize / 4} M${3 * presetSize / 4},${presetSize / 4} L${presetSize / 4},${3 * presetSize / 4}`);
                        warningSymbol.setAttribute('stroke', 'rgba(255, 255, 255, 0.9)');
                        warningSymbol.setAttribute('stroke-width', 4);
                        group.appendChild(warningSymbol);
                    }

                    defs.appendChild(group);
                });

                const windowGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
                windowGradient.setAttribute('id', 'windowGradient');
                windowGradient.setAttribute('x1', '0%');
                windowGradient.setAttribute('y1', '0%');
                windowGradient.setAttribute('x2', '0%');
                windowGradient.setAttribute('y2', '100%');

                const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                stop1.setAttribute('offset', '0%');
                stop1.setAttribute('stop-color', 'rgba(255, 255, 255, 0.9)');

                const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                stop2.setAttribute('offset', '100%');
                stop2.setAttribute('stop-color', 'rgba(255, 255, 255, 0.3)');

                windowGradient.appendChild(stop1);
                windowGradient.appendChild(stop2);
                defs.appendChild(windowGradient);
            };

            createDefs(svg);
        }

        window.addEventListener('load', () => {
            createObstaclePresets();
            resizeCanvas();
            GameState.initialize();
            generateControlPanel();  // Add this line
            hideAuthorInfo();
            updatePageTitle();  // Add this line
            requestAnimationFrame(gameLoop);
        });

        function generateControlPanel() {
            const controlsPanel = document.getElementById('controlsPanel');
            controlsPanel.innerHTML = '';

            if (GameConfig.numCars === 2) {
                // Original layout for 2 cars
                const controls = ['A', 'D', '←', '→'];
                controls.forEach((key, index) => {
                    const controlKey = document.createElement('div');
                    controlKey.className = 'controlKey';
                    controlKey.setAttribute('data-lane', index);
                    controlKey.textContent = key;
                    controlsPanel.appendChild(controlKey);
                });
            } else {
                // Layout for 3 or more cars
                for (let i = 0; i < GameConfig.numCars; i++) {
                    const carControls = document.createElement('div');
                    carControls.className = 'carControls';
                    
                    const key = document.createElement('div');
                    key.className = 'controlKey';
                    key.setAttribute('data-car', i);
                    key.textContent = GameConfig.controls[i];
                    
                    carControls.appendChild(key);
                    controlsPanel.appendChild(carControls);
                }
            }
        }

        const style = document.createElement('style');
        style.textContent = `
            #gameContainer {
                max-width: 800px;
                margin: 0 auto;
            }
            #controlsPanel {
                display: flex;
                justify-content: space-around;
                padding: 10px 0;
            }
            .carControls {
                display: flex;
                gap: 10px;
            }
            .controlKey {
                width: 40px;
                height: 40px;
                background-color: rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                display: flex;
                justify-content: center;
                align-items: center;
                font-weight: bold;
                font-size: 18px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
            }
            .controlKey:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 8px rgba(0,0,0,0.2);
            }
        `;
        document.head.appendChild(style);

        // Add this function somewhere in your script
        function updatePageTitle() {
            document.title = StartScreen.getGameTitle();
        }

        // Call this function after setting GameConfig.numCars
        updatePageTitle();
