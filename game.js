class ArtilleryGame {
    constructor(canvas) {
        this.canvas = canvas || document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 1200;
        this.height = 600;
        
        this.currentPlayer = 1;
        this.gameState = 'playing';
        this.projectiles = [];
        this.explosions = [];
        this.victoryAnimation = {
            active: false,
            winner: null,
            particles: [],
            timer: 0,
            maxTimer: 300
        };
        
        this.wind = {
            strength: 0,
            direction: 1, // 1 for right, -1 for left
            timer: 0,
            changeInterval: 300, // Change wind every 5 seconds (300 frames at 60fps)
            particles: []
        };
        
        // Dynamic foggy background system
        this.background = {
            type: 'battlefield', // battlefield, desert, mountain, urban
            fogLayers: [],
            clouds: [],
            colors: {},
            animationOffset: 0
        };
        
        this.generateWind();
        this.generateBackground();
        
        // Initialize sound system
        this.initSounds();
        
        this.player1 = {
            x: 150,
            y: this.height - 80,
            health: 100,
            color: '#4a7c59',
            cannonLength: 35,
            width: 35,
            height: 18,
            turretRadius: 10,
            lastAngle: 45,
            lastPower: 50
        };
        
        this.player2 = {
            x: this.width - 150,
            y: this.height - 80,
            health: 100,
            color: '#2d5016',
            cannonLength: 35,
            width: 35,
            height: 18,
            turretRadius: 10,
            lastAngle: 45,
            lastPower: 50
        };
        
        this.terrain = this.generateTerrain();
        this.setupControls();
        this.restorePlayerSettings(); // Initialize with player 1's settings
    }
    
    initSounds() {
        // Initialize Web Audio API
        this.audioContext = null;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
            this.audioContext = null;
        }
        
        this.sounds = {
            enabled: true,
            masterVolume: 0.3
        };
    }
    
    async initRiveAnimations() {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('Loading Rive file...');
                // Check if Rive is available
                if (typeof rive === 'undefined') {
                    throw new Error('Rive library not loaded');
                }
                
                console.log('Rive library version:', rive.RuntimeVersion);
                console.log('Available Rive exports:', Object.keys(rive));
                
                let player1Loaded = false;
                let player2Loaded = false;
                
                const checkBothLoaded = () => {
                    if (player1Loaded && player2Loaded) {
                        console.log('Both Rive instances loaded successfully');
                        resolve();
                    }
                };
                
                // Create canvases with proper dimensions first (2x bigger)
                const canvas1 = document.createElement('canvas');
                canvas1.width = 160;
                canvas1.height = 160;
                
                const canvas2 = document.createElement('canvas');
                canvas2.width = 160;
                canvas2.height = 160;
                
                this.riveInstances = {
                    player1: new rive.Rive({
                        src: './Rive.riv',
                        canvas: canvas1,
                        autoplay: true,
                        stateMachines: 'State Machine 1',
                        onLoad: () => {
                            console.log('✅ Player 1 Rive animation loaded successfully');
                            const instance = this.riveInstances.player1;
                            
                            // Set canvas dimensions after Rive loads (2x bigger)
                            instance.canvas.width = 160;
                            instance.canvas.height = 160;
                            console.log('Player 1 canvas size set to:', instance.canvas.width, 'x', instance.canvas.height);
                            
                            // Get the elevation input from the state machine
                            try {
                                const inputs = instance.stateMachineInputs('State Machine 1');
                                console.log(`Player 1 found ${inputs.length} state machine inputs`);
                                
                                const elevationInput = inputs.find(input => input.name === 'Elevation');
                                if (elevationInput) {
                                    console.log('✅ Player 1 found Elevation input!');
                                    elevationInput.value = -45; // Set initial elevation
                                    this.riveInstances.player1.elevationInput = elevationInput;
                                } else {
                                    console.log('❌ Player 1 Elevation input not found');
                                    console.log('Available inputs:', inputs.map(i => i.name).join(', '));
                                }
                            } catch (error) {
                                console.log('❌ Player 1 error accessing state machine inputs:', error.message);
                            }
                            
                            player1Loaded = true;
                            checkBothLoaded();
                        },
                        onLoadError: (error) => {
                            console.error('❌ Player 1 Rive load error:', error);
                            this.riveInstances.player1 = null;
                            player1Loaded = true;
                            checkBothLoaded();
                        }
                    }),
                    player2: new rive.Rive({
                        src: './Rive.riv',
                        canvas: canvas2,
                        autoplay: true,
                        stateMachines: 'State Machine 1',
                        onLoad: () => {
                            console.log('✅ Player 2 Rive animation loaded successfully');
                            const instance = this.riveInstances.player2;
                            
                            // Set canvas dimensions after Rive loads (2x bigger)
                            instance.canvas.width = 160;
                            instance.canvas.height = 160;
                            console.log('Player 2 canvas size set to:', instance.canvas.width, 'x', instance.canvas.height);
                            
                            // Get the elevation input from the state machine
                            try {
                                const inputs = instance.stateMachineInputs('State Machine 1');
                                console.log(`Player 2 found ${inputs.length} state machine inputs`);
                                
                                const elevationInput = inputs.find(input => input.name === 'Elevation');
                                if (elevationInput) {
                                    console.log('✅ Player 2 found Elevation input!');
                                    elevationInput.value = -45; // Set initial elevation
                                    this.riveInstances.player2.elevationInput = elevationInput;
                                } else {
                                    console.log('❌ Player 2 Elevation input not found');
                                    console.log('Available inputs:', inputs.map(i => i.name).join(', '));
                                }
                            } catch (error) {
                                console.log('❌ Player 2 error accessing state machine inputs:', error.message);
                            }
                            
                            player2Loaded = true;
                            checkBothLoaded();
                        },
                        onLoadError: (error) => {
                            console.error('❌ Player 2 Rive load error:', error);
                            this.riveInstances.player2 = null;
                            player2Loaded = true;
                            checkBothLoaded();
                        }
                    })
                };
                
            } catch (error) {
                console.error('Error initializing Rive animations:', error);
                reject(error);
            }
        }).catch(error => {
            console.warn('Rive animations failed to load, continuing without them:', error);
            // Don't reject, just continue without Rive animations
            if (this.riveInstances) {
                this.riveInstances = null;
            }
            // Return a resolved promise so the game can continue
            return Promise.resolve();
        });
    }
    
    updateRiveElevation(gameAngle) {
        if (!this.riveInstances) return;
        
        const currentPlayerInstance = this.currentPlayer === 1 ? 
            this.riveInstances.player1 : this.riveInstances.player2;
        
        if (!currentPlayerInstance || !currentPlayerInstance.elevationInput) return;
        
        const elevation = this.convertAngleToElevation(gameAngle);
        
        try {
            // Use the stored elevation input reference
            currentPlayerInstance.elevationInput.value = elevation;
            console.log(`Updated Player ${this.currentPlayer} elevation to:`, elevation);
        } catch (error) {
            console.warn('Could not update Rive elevation:', error);
        }
    }
    
    // Convert game angle (0-180°) to Rive elevation value (0 to -85)
    convertAngleToElevation(gameAngle) {
        // Game angle: 0° = horizontal right, 90° = straight up, 180° = horizontal left
        // Rive elevation: 0 = horizontal, -85 = maximum elevation
        // Map 0-90° to 0 to -85, and 90-180° to -85 to 0
        if (gameAngle <= 90) {
            return -(gameAngle / 90) * 85;
        } else {
            return -((180 - gameAngle) / 90) * 85;
        }
    }
    
    async startGame() {
        try {
            // Wait for Rive animations to initialize
            await this.initRiveAnimations();
            console.log('Rive animations initialized, starting game loop');
        } catch (error) {
           // Artillery Game - Worms-style game with Rive animations - NO FALLBACK CANNONS v2.0:', error);
        }
        
        // Start the game loop
        this.gameLoop();
    }
    
    // Create cannon fire sound
    playCannonSound() {
        if (!this.audioContext || !this.sounds.enabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Create oscillator for the main boom
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Cannon sound characteristics
        oscillator.frequency.setValueAtTime(80, now);
        oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(20, now + 0.3);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(this.sounds.masterVolume * 0.8, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        oscillator.type = 'sawtooth';
        oscillator.start(now);
        oscillator.stop(now + 0.4);
        
        // Add white noise for realistic effect
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.3;
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        
        noiseSource.buffer = noiseBuffer;
        noiseSource.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);
        
        noiseGain.gain.setValueAtTime(this.sounds.masterVolume * 0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        noiseSource.start(now);
    }
    
    // Create explosion sound
    playExplosionSound() {
        if (!this.audioContext || !this.sounds.enabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Main explosion boom
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(60, now);
        oscillator.frequency.exponentialRampToValueAtTime(30, now + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(15, now + 0.5);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(this.sounds.masterVolume, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        
        oscillator.type = 'square';
        oscillator.start(now);
        oscillator.stop(now + 0.6);
        
        // Add crackling noise
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.4, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.5;
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        
        noiseSource.buffer = noiseBuffer;
        noiseSource.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);
        
        noiseGain.gain.setValueAtTime(this.sounds.masterVolume * 0.6, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        noiseSource.start(now);
    }
    
    // Create victory fanfare
    playVictorySound() {
        if (!this.audioContext || !this.sounds.enabled) return;
        
        const now = this.audioContext.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C, E, G, C (major chord)
        
        notes.forEach((frequency, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, now + index * 0.1);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, now + index * 0.1);
            gainNode.gain.linearRampToValueAtTime(this.sounds.masterVolume * 0.3, now + index * 0.1 + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.1 + 0.8);
            
            oscillator.start(now + index * 0.1);
            oscillator.stop(now + index * 0.1 + 0.8);
        });
    }
    
    // Create wind ambient sound
    playWindSound() {
        if (!this.audioContext || !this.sounds.enabled || this.wind.strength < 1) return;
        
        const now = this.audioContext.currentTime;
        
        // Create filtered noise for wind
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 2, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.1;
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        const filter = this.audioContext.createBiquadFilter();
        const gainNode = this.audioContext.createGain();
        
        noiseSource.buffer = noiseBuffer;
        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        
        const windVolume = (this.wind.strength / 3) * this.sounds.masterVolume * 0.2;
        gainNode.gain.setValueAtTime(windVolume, now);
        
        noiseSource.start(now);
        noiseSource.stop(now + 2);
    }
    
    // Toggle sound on/off
    toggleSound() {
        this.sounds.enabled = !this.sounds.enabled;
        return this.sounds.enabled;
    }
    
    generateTerrain() {
        const terrain = [];
        const groundHeight = 50;
        
        // Random parameters for varied terrain generation
        const seed1 = Math.random() * 1000;
        const seed2 = Math.random() * 1000;
        const seed3 = Math.random() * 1000;
        
        // Random amplitudes for different wave layers
        const amplitude1 = 25 + Math.random() * 50; // 25-75 pixels
        const amplitude2 = 15 + Math.random() * 30; // 15-45 pixels
        const amplitude3 = 5 + Math.random() * 15;  // 5-20 pixels
        
        // Random frequencies for wave variation
        const freq1 = 0.005 + Math.random() * 0.01; // 0.005-0.015
        const freq2 = 0.02 + Math.random() * 0.02;  // 0.02-0.04
        const freq3 = 0.08 + Math.random() * 0.04;  // 0.08-0.12
        
        // Random vertical offset for overall terrain height variation
        const verticalOffset = -40 + Math.random() * 80; // -40 to +40 pixels
        
        for (let x = 0; x < this.width; x += 5) {
            // Combine multiple sine waves with random parameters for complex terrain
            const wave1 = Math.sin((x + seed1) * freq1) * amplitude1;
            const wave2 = Math.sin((x + seed2) * freq2) * amplitude2;
            const wave3 = Math.sin((x + seed3) * freq3) * amplitude3;
            
            // Add some random noise for extra variation
            const noise = (Math.random() - 0.5) * 8;
            
            const totalNoise = wave1 + wave2 + wave3 + noise + verticalOffset;
            
            terrain.push({
                x: x,
                y: this.height - groundHeight + totalNoise
            });
        }
        
        return terrain;
    }
    
    generateWind() {
        // Generate random wind strength (0-3 units)
        this.wind.strength = Math.random() * 3;
        // Generate random wind direction
        this.wind.direction = Math.random() < 0.5 ? -1 : 1;
        this.wind.timer = 0;
        
        // Create wind particles for visual effect
        this.wind.particles = [];
        for (let i = 0; i < 15; i++) {
            this.wind.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * (this.height - 100) + 50,
                size: Math.random() * 3 + 1,
                speed: this.wind.strength * 0.5 + 0.5,
                life: Math.random() * 100 + 50
            });
        }
    }
    
    updateWind() {
        this.wind.timer++;
        
        // Change wind every few seconds
        if (this.wind.timer >= this.wind.changeInterval) {
            this.generateWind();
            // Play wind sound occasionally
            if (Math.random() < 0.3) {
                this.playWindSound();
            }
        }
        
        // Update wind particles
        for (let i = this.wind.particles.length - 1; i >= 0; i--) {
            const particle = this.wind.particles[i];
            particle.x += this.wind.direction * particle.speed;
            particle.life--;
            
            // Remove particles that are off-screen or dead
            if (particle.x < -10 || particle.x > this.width + 10 || particle.life <= 0) {
                this.wind.particles.splice(i, 1);
            }
        }
        
        // Add new particles occasionally
        if (this.wind.particles.length < 15 && Math.random() < 0.3) {
            this.wind.particles.push({
                x: this.wind.direction > 0 ? -10 : this.width + 10,
                y: Math.random() * (this.height - 100) + 50,
                size: Math.random() * 3 + 1,
                speed: this.wind.strength * 0.5 + 0.5,
                life: Math.random() * 100 + 50
            });
        }
    }
    
    setupControls() {
        const angleSlider = document.getElementById('angleSlider');
        const powerSlider = document.getElementById('powerSlider');
        const angleValue = document.getElementById('angleValue');
        const powerValue = document.getElementById('powerValue');
        const player1FireButton = document.getElementById('player1FireButton');
        const player2FireButton = document.getElementById('player2FireButton');
        const resetButton = document.getElementById('resetButton');
        const soundButton = document.getElementById('soundButton');
        
        angleSlider.addEventListener('input', (e) => {
            angleValue.textContent = e.target.value + '°';
            this.updateHUDStats(); // Update HUD in real-time
            
            // Update Rive animation elevation for current player
            this.updateRiveElevation(parseFloat(e.target.value));
        });
        
        powerSlider.addEventListener('input', (e) => {
            powerValue.textContent = e.target.value + '%';
            this.updateHUDStats(); // Update HUD in real-time
        });
        
        player1FireButton.addEventListener('click', () => {
            if (this.currentPlayer === 1) {
                this.fireCannon();
            }
        });
        
        player2FireButton.addEventListener('click', () => {
            if (this.currentPlayer === 2) {
                this.fireCannon();
            }
        });
        
        resetButton.addEventListener('click', () => {
            this.resetGame();
        });
        
        soundButton.addEventListener('click', () => {
            const soundEnabled = this.toggleSound();
            soundButton.textContent = soundEnabled ? '🔊 SOUND ON' : '🔇 SOUND OFF';
            
            // Resume audio context if needed (browser security requirement)
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        });
    }
    
    fireCannon() {
        const angle = parseInt(document.getElementById('angleSlider').value);
        const power = parseInt(document.getElementById('powerSlider').value);
        
        const currentPlayerObj = this.currentPlayer === 1 ? this.player1 : this.player2;
        
        // Store the parameters for this player
        currentPlayerObj.lastAngle = angle;
        currentPlayerObj.lastPower = power;
        
        const radians = (angle * Math.PI) / 180;
        
        let adjustedAngle = radians;
        if (this.currentPlayer === 2) {
            adjustedAngle = Math.PI - radians;
        }
        
        const velocity = power * 0.3;
        const projectile = {
            x: currentPlayerObj.x + Math.cos(adjustedAngle) * currentPlayerObj.cannonLength,
            y: currentPlayerObj.y - Math.sin(adjustedAngle) * currentPlayerObj.cannonLength,
            vx: Math.cos(adjustedAngle) * velocity,
            vy: -Math.sin(adjustedAngle) * velocity,
            radius: 3,
            color: this.currentPlayer === 1 ? '#ff4444' : '#44ff44', // Bright red for P1, bright green for P2
            trail: []
        };
        
        this.projectiles.push(projectile);
        this.disableFireButtons();
        
        // Play cannon sound
        this.playCannonSound();
    }
    
    updateProjectiles() {
        const gravity = 0.3;
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            projectile.trail.push({ x: projectile.x, y: projectile.y });
            if (projectile.trail.length > 10) {
                projectile.trail.shift();
            }
            
            projectile.x += projectile.vx;
            projectile.y += projectile.vy;
            projectile.vy += gravity;
            
            // Apply wind effect to projectile
            projectile.vx += this.wind.direction * this.wind.strength * 0.02;
            
            let projectileRemoved = false;
            
            if (this.checkCollision(projectile)) {
                this.explode(projectile.x, projectile.y);
                this.projectiles.splice(i, 1);
                projectileRemoved = true;
                
                // Play explosion sound
                this.playExplosionSound();
            }
            
            if (!projectileRemoved && (projectile.x < 0 || projectile.x > this.width || projectile.y > this.height)) {
                this.projectiles.splice(i, 1);
                projectileRemoved = true;
            }
            
            // Only switch turn once per projectile removal
            if (projectileRemoved) {
                this.switchTurn();
            }
        }
    }
    
    checkCollision(projectile) {
        // Check if projectile hits terrain
        for (const point of this.terrain) {
            const distance = Math.sqrt(
                Math.pow(projectile.x - point.x, 2) + 
                Math.pow(projectile.y - point.y, 2)
            );
            if (distance < 10 && projectile.y >= point.y - 5) {
                return true;
            }
        }
        
        // Check if projectile hits ground level
        if (projectile.y >= this.height - 10) {
            return true;
        }
        
        // Check if projectile hits players
        const player1Distance = Math.sqrt(
            Math.pow(projectile.x - this.player1.x, 2) + 
            Math.pow(projectile.y - this.player1.y, 2)
        );
        
        const player2Distance = Math.sqrt(
            Math.pow(projectile.x - this.player2.x, 2) + 
            Math.pow(projectile.y - this.player2.y, 2)
        );
        
        if (player1Distance < 30) {
            this.player1.health -= 25;
            if (this.player1.health <= 0) {
                this.gameState = 'player2wins';
                this.startVictoryAnimation(2);
            }
            return true;
        }
        
        if (player2Distance < 30) {
            this.player2.health -= 25;
            if (this.player2.health <= 0) {
                this.gameState = 'player1wins';
                this.startVictoryAnimation(1);
            }
            return true;
        }
        
        return false;
    }
    
    explode(x, y) {
        this.explosions.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: 30,
            life: 20
        });
        
        // Destroy terrain in explosion radius
        this.destroyTerrain(x, y, 40);
        
        // Check if players need to fall due to terrain destruction
        this.updatePlayerPositions();
    }
    
    destroyTerrain(explosionX, explosionY, radius) {
        // Remove terrain points within explosion radius
        for (let i = this.terrain.length - 1; i >= 0; i--) {
            const point = this.terrain[i];
            const distance = Math.sqrt(
                Math.pow(point.x - explosionX, 2) + 
                Math.pow(point.y - explosionY, 2)
            );
            
            if (distance <= radius) {
                // Instead of removing, lower the terrain point
                const fallAmount = radius - distance;
                point.y += fallAmount * 0.5;
                
                // Don't let terrain go below ground level
                if (point.y > this.height - 10) {
                    point.y = this.height - 10;
                }
            }
        }
        
        // Smooth the terrain after destruction
        this.smoothTerrain();
    }
    
    smoothTerrain() {
        // Apply smoothing to make terrain destruction look more natural
        for (let i = 1; i < this.terrain.length - 1; i++) {
            const prev = this.terrain[i - 1];
            const current = this.terrain[i];
            const next = this.terrain[i + 1];
            
            // Average with neighbors for smoother terrain
            const avgY = (prev.y + current.y + next.y) / 3;
            current.y = current.y * 0.7 + avgY * 0.3;
        }
    }
    
    updatePlayerPositions() {
        // Make players fall if terrain beneath them is destroyed
        this.updatePlayerPosition(this.player1);
        this.updatePlayerPosition(this.player2);
    }
    
    updatePlayerPosition(player) {
        // Find the terrain height at player's x position
        let terrainHeight = this.height - 50; // Default ground level
        
        for (const point of this.terrain) {
            if (Math.abs(point.x - player.x) < 20) {
                terrainHeight = Math.min(terrainHeight, point.y);
            }
        }
        
        // If player is above terrain, make them fall
        const targetY = terrainHeight - player.height - 5;
        if (player.y < targetY) {
            player.y = Math.min(player.y + 2, targetY); // Gradual fall
        } else if (player.y > targetY) {
            player.y = targetY; // Snap to terrain if below
        }
    }
    
    switchTurn() {
        if (this.gameState === 'playing') {
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
            this.restorePlayerSettings();
            this.updateUI();
            this.enableFireButtons();
        }
    }
    
    updateUI() {
        const currentPlayerSpan = document.getElementById('currentPlayer');
        
        if (this.gameState === 'player1wins') {
            currentPlayerSpan.textContent = 'Player 1 Wins!';
            currentPlayerSpan.className = 'player1';
        } else if (this.gameState === 'player2wins') {
            currentPlayerSpan.textContent = 'Player 2 Wins!';
            currentPlayerSpan.className = 'player2';
        } else {
            currentPlayerSpan.textContent = `Player ${this.currentPlayer}'s Turn`;
            currentPlayerSpan.className = this.currentPlayer === 1 ? 'player1' : 'player2';
        }
        
        // Update HUD health bars
        const player1HealthPercent = (this.player1.health / 100) * 100;
        const player2HealthPercent = (this.player2.health / 100) * 100;
        
        document.getElementById('player1HealthHUD').style.width = player1HealthPercent + '%';
        document.getElementById('player2HealthHUD').style.width = player2HealthPercent + '%';
        document.getElementById('player1HealthTextHUD').textContent = this.player1.health + ' HP';
        document.getElementById('player2HealthTextHUD').textContent = this.player2.health + ' HP';
        
        // Update wind display
        document.getElementById('windStrength').textContent = this.wind.strength.toFixed(1);
        document.getElementById('windDirection').textContent = this.wind.direction > 0 ? '→' : '←';
        
        // Update HUD stats
        this.updateHUDStats();
        
        // Highlight active player's HUD
        this.highlightActivePlayerHUD();
    }
    
    updateHUDStats() {
        // Get current slider values
        const currentAngle = parseInt(document.getElementById('angleSlider').value);
        const currentPower = parseInt(document.getElementById('powerSlider').value);
        
        // Calculate player heights (distance from ground)
        const player1Height = Math.max(0, Math.round((this.height - this.player1.y - 50) / 10));
        const player2Height = Math.max(0, Math.round((this.height - this.player2.y - 50) / 10));
        
        // Update Player 1 HUD
        document.getElementById('player1Angle').textContent = this.player1.lastAngle + '°';
        document.getElementById('player1Power').textContent = this.player1.lastPower + '%';
        document.getElementById('player1Height').textContent = player1Height + 'm';
        
        // Update Player 2 HUD
        document.getElementById('player2Angle').textContent = this.player2.lastAngle + '°';
        document.getElementById('player2Power').textContent = this.player2.lastPower + '%';
        document.getElementById('player2Height').textContent = player2Height + 'm';
        
        // Update current player's stats with live values if they're adjusting
        if (this.currentPlayer === 1) {
            document.getElementById('player1Angle').textContent = currentAngle + '°';
            document.getElementById('player1Power').textContent = currentPower + '%';
        } else {
            document.getElementById('player2Angle').textContent = currentAngle + '°';
            document.getElementById('player2Power').textContent = currentPower + '%';
        }
    }
    
    highlightActivePlayerHUD() {
        const player1HUD = document.getElementById('player1HUD');
        const player2HUD = document.getElementById('player2HUD');
        const player1FireButton = document.getElementById('player1FireButton');
        const player2FireButton = document.getElementById('player2FireButton');
        
        if (this.currentPlayer === 1) {
            player1HUD.style.border = '2px solid #ff4444';
            player1HUD.style.boxShadow = '0 0 20px rgba(255, 68, 68, 0.5)';
            player2HUD.style.border = '1px solid rgba(0, 212, 255, 0.3)';
            player2HUD.style.boxShadow = 'none';
            
            // Show only Player 1's fire button
            player1FireButton.style.display = 'block';
            player2FireButton.style.display = 'none';
        } else {
            player2HUD.style.border = '2px solid #44ff44';
            player2HUD.style.boxShadow = '0 0 20px rgba(68, 255, 68, 0.5)';
            player1HUD.style.border = '1px solid rgba(0, 212, 255, 0.3)';
            player1HUD.style.boxShadow = 'none';
            
            // Show only Player 2's fire button
            player1FireButton.style.display = 'none';
            player2FireButton.style.display = 'block';
        }
    }
    
    enableFireButtons() {
        document.getElementById('player1FireButton').disabled = false;
        document.getElementById('player2FireButton').disabled = false;
    }
    
    disableFireButtons() {
        document.getElementById('player1FireButton').disabled = true;
        document.getElementById('player2FireButton').disabled = true;
    }
    
    restorePlayerSettings() {
        const currentPlayerObj = this.currentPlayer === 1 ? this.player1 : this.player2;
        const angleSlider = document.getElementById('angleSlider');
        const powerSlider = document.getElementById('powerSlider');
        const angleValue = document.getElementById('angleValue');
        const powerValue = document.getElementById('powerValue');
        
        angleSlider.value = currentPlayerObj.lastAngle;
        powerSlider.value = currentPlayerObj.lastPower;
        angleValue.textContent = currentPlayerObj.lastAngle + '°';
        powerValue.textContent = currentPlayerObj.lastPower + '%';
        
        // Update HUD immediately
        this.updateHUDStats();
    }
    
    resetGame() {
        this.currentPlayer = 1;
        this.gameState = 'playing';
        this.projectiles = [];
        this.explosions = [];
        this.victoryAnimation.active = false;
        this.victoryAnimation.particles = [];
        this.player1.health = 100;
        this.player2.health = 100;
        // Reset player parameters to defaults
        this.player1.lastAngle = 45;
        this.player1.lastPower = 50;
        this.player2.lastAngle = 45;
        this.player2.lastPower = 50;
        this.terrain = this.generateTerrain();
        this.player1.y = this.height - 80;
        this.player2.y = this.height - 80;
        this.generateWind(); // Reset wind
        this.generateBackground(); // Generate new dynamic background for fresh game
        this.restorePlayerSettings(); // Restore player 1's settings
        this.updateUI();
        document.getElementById('fireButton').disabled = false;
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw dynamic background first
        this.drawBackground();
        
        this.drawTerrain();
        this.drawPlayers();
        this.drawProjectiles();
        this.drawExplosions();
        this.drawWind();
        this.drawUI();
        
        if (this.victoryAnimation.active) {
            this.drawVictoryAnimation();
        }
    }
    
    drawTerrain() {
        // Draw base ground
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, this.height - 50, this.width, 50);
        
        // Draw terrain surface with gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#27ae60');
        gradient.addColorStop(0.3, '#2ecc71');
        gradient.addColorStop(1, '#1e8449');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height - 50);
        
        for (const point of this.terrain) {
            this.ctx.lineTo(point.x, point.y);
        }
        
        this.ctx.lineTo(this.width, this.height - 50);
        this.ctx.lineTo(this.width, this.height);
        this.ctx.lineTo(0, this.height);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add terrain outline
        this.ctx.strokeStyle = '#00d4ff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height - 50);
        for (const point of this.terrain) {
            this.ctx.lineTo(point.x, point.y);
        }
        this.ctx.stroke();
    }
    
    drawPlayers() {
        this.drawPlayer(this.player1);
        this.drawPlayer(this.player2);
    }
    
    drawPlayer(player) {
        const ctx = this.ctx;
        
        // Save context for transformations
        ctx.save();
        
        // Draw tank treads/tracks (simpler style)
        ctx.fillStyle = '#1a1a1a';
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        
        // Left tread
        ctx.fillRect(player.x - player.width/2 - 2, player.y - 3, 4, player.height + 6);
        ctx.strokeRect(player.x - player.width/2 - 2, player.y - 3, 4, player.height + 6);
        
        // Right tread
        ctx.fillRect(player.x + player.width/2 - 2, player.y - 3, 4, player.height + 6);
        ctx.strokeRect(player.x + player.width/2 - 2, player.y - 3, 4, player.height + 6);
        
        // Draw tread details (small lines)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const treadY = player.y + (i * 6) - 2;
            // Left tread lines
            ctx.beginPath();
            ctx.moveTo(player.x - player.width/2 - 2, treadY);
            ctx.lineTo(player.x - player.width/2 + 2, treadY);
            ctx.stroke();
            // Right tread lines
            ctx.beginPath();
            ctx.moveTo(player.x + player.width/2 - 2, treadY);
            ctx.lineTo(player.x + player.width/2 + 2, treadY);
            ctx.stroke();
        }
        
        // Draw main tank body (simple rectangle with military green)
        ctx.fillStyle = player.color;
        ctx.strokeStyle = this.darkenColor(player.color, 30);
        ctx.lineWidth = 2;
        
        // Main body
        ctx.fillRect(
            player.x - player.width/2, 
            player.y - player.height, 
            player.width, 
            player.height
        );
        ctx.strokeRect(
            player.x - player.width/2, 
            player.y - player.height, 
            player.width, 
            player.height
        );
        
        // Draw simple tank details
        ctx.fillStyle = this.darkenColor(player.color, 20);
        
        // Front detail
        ctx.fillRect(player.x - 6, player.y - player.height + 2, 4, 3);
        
        // Side details
        ctx.fillRect(player.x - player.width/2 + 2, player.y - player.height/2 - 1, 3, 2);
        ctx.fillRect(player.x + player.width/2 - 5, player.y - player.height/2 - 1, 3, 2);
        
        // Draw Rive cannon animation if available
        if (this.riveInstances) {
            const riveInstance = player === this.player1 ? this.riveInstances.player1 : this.riveInstances.player2;
            
            if (riveInstance && riveInstance.canvas && riveInstance.canvas.width > 0 && riveInstance.canvas.height > 0) {
                // Update elevation for current player only
                if (player === (this.currentPlayer === 1 ? this.player1 : this.player2)) {
                    const gameAngle = parseInt(document.getElementById('angleSlider').value);
                    this.updateRiveElevation(gameAngle);
                }
                
                // Draw the Rive canvas onto the main canvas (2x bigger)
                const cannonX = player.x - 80; // Center the 160px wide cannon
                const cannonY = player.y - player.height - 80; // Position above the tank
                
                // Draw the Rive animation (2x bigger)
                if (player === this.player2) {
                    // Flip Player 2's cannon horizontally to face Player 1
                    ctx.save();
                    ctx.scale(-1, 1); // Horizontal flip
                    ctx.drawImage(riveInstance.canvas, -cannonX - 160, cannonY, 160, 160);
                    ctx.restore();
                } else {
                    // Player 1 cannon draws normally
                    ctx.drawImage(riveInstance.canvas, cannonX, cannonY, 160, 160);
                }
            }
            // No fallback - if Rive is loaded but canvas isn't ready, just don't draw anything
        }
        // No fallback cannon at all - Rive animations only
        
        // Draw health bar above Rive cannon (higher position)
        const barWidth = 25;
        const barHeight = 3;
        const healthPercent = player.health / 100;
        const healthBarY = player.y - player.height - 90; // Just above the 160px Rive cannon
        
        // Health bar background
        ctx.fillStyle = '#333333';
        ctx.fillRect(player.x - barWidth/2, healthBarY, barWidth, barHeight);
        
        // Health bar fill
        const healthColor = healthPercent > 0.6 ? '#00ff00' : 
                           healthPercent > 0.3 ? '#ffff00' : '#ff0000';
        ctx.fillStyle = healthColor;
        ctx.fillRect(player.x - barWidth/2, healthBarY, barWidth * healthPercent, barHeight);
        
        // Health bar border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(player.x - barWidth/2, healthBarY, barWidth, barHeight);
        
        // Draw health text (smaller and simpler)
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText(`${player.health}`, player.x, healthBarY - 4);
        ctx.fillText(`${player.health}`, player.x, healthBarY - 4);
        
        ctx.restore();
    }
    
    // drawFallbackCannon method removed - using only Rive animations
    
    // Helper function to draw rounded rectangles
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    
    // Helper function to lighten a color
    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    
    // Helper function to darken a color
    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
            (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
            (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
    }
    
    drawProjectiles() {
        for (const projectile of this.projectiles) {
            // Draw projectile trail with glow
            for (let i = 0; i < projectile.trail.length; i++) {
                const alpha = i / projectile.trail.length;
                this.ctx.globalAlpha = alpha * 0.8;
                this.ctx.shadowColor = projectile.color;
                this.ctx.shadowBlur = 8;
                this.ctx.fillStyle = projectile.color;
                this.ctx.beginPath();
                this.ctx.arc(projectile.trail[i].x, projectile.trail[i].y, projectile.radius * alpha, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Draw main projectile with bright glow
            this.ctx.globalAlpha = 1;
            this.ctx.shadowColor = projectile.color;
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = projectile.color;
            this.ctx.beginPath();
            this.ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Reset shadow
            this.ctx.shadowBlur = 0;
        }
    }

    drawExplosions() {
        for (const explosion of this.explosions) {
            const alpha = explosion.life / 20;
            this.ctx.globalAlpha = alpha;
            
            // Create explosion gradient
            const gradient = this.ctx.createRadialGradient(
                explosion.x, explosion.y, 0,
                explosion.x, explosion.y, explosion.radius
            );
            gradient.addColorStop(0, '#ffff00');
            gradient.addColorStop(0.3, '#ff8c00');
            gradient.addColorStop(0.6, '#ff4500');
            gradient.addColorStop(1, '#ff0000');
            
            this.ctx.fillStyle = gradient;
            this.ctx.shadowColor = '#ffff00';
            this.ctx.shadowBlur = 20;
            this.ctx.beginPath();
            this.ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.shadowBlur = 0;
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawWind() {
        // Draw wind particles
        this.ctx.globalAlpha = 0.6;
        for (const particle of this.wind.particles) {
            const alpha = particle.life / 100;
            this.ctx.globalAlpha = alpha * 0.6;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
        
        // Draw wind indicator in top center
        const centerX = this.width / 2;
        const indicatorY = 60;
        
        // Background for wind indicator
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(centerX - 80, indicatorY - 25, 160, 50);
        this.ctx.strokeStyle = '#00d4ff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(centerX - 80, indicatorY - 25, 160, 50);
        
        // Wind direction arrow
        const arrowLength = Math.max(20, this.wind.strength * 15);
        const arrowX = centerX + (this.wind.direction * arrowLength);
        
        // Arrow shaft
        this.ctx.strokeStyle = this.wind.strength > 2 ? '#ff4444' : 
                              this.wind.strength > 1 ? '#ffaa44' : '#44ff44';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, indicatorY);
        this.ctx.lineTo(arrowX, indicatorY);
        this.ctx.stroke();
        
        // Arrow head
        const headSize = 8;
        this.ctx.fillStyle = this.wind.strength > 2 ? '#ff4444' : 
                            this.wind.strength > 1 ? '#ffaa44' : '#44ff44';
        this.ctx.beginPath();
        this.ctx.moveTo(arrowX, indicatorY);
        this.ctx.lineTo(arrowX - this.wind.direction * headSize, indicatorY - headSize/2);
        this.ctx.lineTo(arrowX - this.wind.direction * headSize, indicatorY + headSize/2);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Wind strength text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('WIND', centerX, indicatorY - 8);
        this.ctx.fillText(`${this.wind.strength.toFixed(1)}`, centerX, indicatorY + 15);
    }

    // Background generation methods
    generateBackground() {
        console.log('Generating new dynamic background...');
        
        // Reset background layers
        this.background.fogLayers = [];
        this.background.clouds = [];
        
        // Generate random color palette for this game
        const palettes = [
            { sky: '#87CEEB', fog: '#B0C4DE', accent: '#F0F8FF' }, // Sky blue
            { sky: '#FFB6C1', fog: '#FFC0CB', accent: '#FFCCCB' }, // Pink sunset
            { sky: '#DDA0DD', fog: '#E6E6FA', accent: '#F8F8FF' }, // Purple twilight
            { sky: '#F0E68C', fog: '#F5DEB3', accent: '#FFFACD' }, // Golden hour
            { sky: '#98FB98', fog: '#F0FFF0', accent: '#F5FFFA' }, // Misty green
            { sky: '#FFE4B5', fog: '#FFEFD5', accent: '#FFF8DC' }  // Warm beige
        ];
        
        this.background.palette = palettes[Math.floor(Math.random() * palettes.length)];
        console.log('Selected palette:', this.background.palette);
        
        // Generate fog layers (3-5 layers for depth)
        const numFogLayers = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numFogLayers; i++) {
            this.background.fogLayers.push({
                y: Math.random() * (this.height * 0.6), // Upper 60% of screen
                height: 80 + Math.random() * 120, // 80-200px height
                opacity: 0.1 + Math.random() * 0.3, // 10-40% opacity
                speed: 0.2 + Math.random() * 0.8, // Slow drift speed
                offset: Math.random() * this.width, // Random starting position
                color: this.background.palette.fog
            });
        }
        
        console.log(`Generated ${numFogLayers} fog layers`);
    }

    updateBackground() {
        // Update fog layer positions for gentle movement
        for (const layer of this.background.fogLayers) {
            layer.offset += layer.speed;
            if (layer.offset > this.width + 200) {
                layer.offset = -200; // Reset to left side
            }
        }
    }

    drawBackground() {
        // Draw sky gradient background
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        skyGradient.addColorStop(0, this.background.palette.sky);
        skyGradient.addColorStop(0.7, this.background.palette.fog);
        skyGradient.addColorStop(1, this.background.palette.accent);
        
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw fog layers
        for (const layer of this.background.fogLayers) {
            this.ctx.globalAlpha = layer.opacity;
            
            // Create fog gradient for each layer
            const fogGradient = this.ctx.createLinearGradient(0, layer.y, 0, layer.y + layer.height);
            fogGradient.addColorStop(0, 'transparent');
            fogGradient.addColorStop(0.5, layer.color);
            fogGradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = fogGradient;
            
            // Draw fog as a wavy, organic shape
            this.ctx.beginPath();
            this.ctx.moveTo(-50, layer.y);
            
            // Create wavy top edge
            for (let x = -50; x <= this.width + 50; x += 20) {
                const waveY = layer.y + Math.sin((x + layer.offset) * 0.01) * 15;
                this.ctx.lineTo(x, waveY);
            }
            
            // Create wavy bottom edge
            for (let x = this.width + 50; x >= -50; x -= 20) {
                const waveY = layer.y + layer.height + Math.sin((x + layer.offset) * 0.008) * 10;
                this.ctx.lineTo(x, waveY);
            }
            
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // Reset alpha
        this.ctx.globalAlpha = 1;
    }

    drawUI() {
        // Draw UI with modern styling
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.strokeText(`Player 1 HP: ${this.player1.health}`, 15, 35);
        this.ctx.fillText(`Player 1 HP: ${this.player1.health}`, 15, 35);
        
        this.ctx.textAlign = 'right';
        this.ctx.strokeText(`Player 2 HP: ${this.player2.health}`, this.width - 15, 35);
        this.ctx.fillText(`Player 2 HP: ${this.player2.health}`, this.width - 15, 35);
    }
    
    drawVictoryAnimation() {
        // Draw victory particles
        for (const particle of this.victoryAnimation.particles) {
            const alpha = particle.life / 100;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
        
        // Draw victory message
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Create pulsing effect
        const pulse = Math.sin(this.victoryAnimation.timer * 0.1) * 0.2 + 1;
        
        // Draw background for victory text
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(centerX - 200, centerY - 80, 400, 160);
        
        // Draw border
        this.ctx.strokeStyle = '#00d4ff';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(centerX - 200, centerY - 80, 400, 160);
        
        // Draw victory text
        const winnerColor = this.victoryAnimation.winner === 1 ? '#ff6b6b' : '#4ecdc4';
        this.ctx.fillStyle = winnerColor;
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 4;
        this.ctx.font = `bold ${Math.floor(48 * pulse)}px Arial`;
        this.ctx.textAlign = 'center';
        
        const victoryText = `Player ${this.victoryAnimation.winner} Wins!`;
        this.ctx.strokeText(victoryText, centerX, centerY - 10);
        this.ctx.fillText(victoryText, centerX, centerY - 10);
        
        // Draw "Press Reset to Play Again" text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.strokeText('Press Reset to Play Again', centerX, centerY + 40);
        this.ctx.fillText('Press Reset to Play Again', centerX, centerY + 40);
        
        // Add some sparkle effects
        if (this.victoryAnimation.timer % 10 === 0) {
            for (let i = 0; i < 3; i++) {
                this.ctx.fillStyle = '#ffff00';
                this.ctx.shadowColor = '#ffff00';
                this.ctx.shadowBlur = 15;
                const sparkleX = centerX + (Math.random() - 0.5) * 300;
                const sparkleY = centerY + (Math.random() - 0.5) * 100;
                this.ctx.beginPath();
                this.ctx.arc(sparkleX, sparkleY, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        this.ctx.shadowBlur = 0;
    }
    
    startVictoryAnimation(winner) {
        this.victoryAnimation.active = true;
        this.victoryAnimation.winner = winner;
        this.victoryAnimation.timer = 0;
        this.victoryAnimation.particles = [];
        
        // Create victory particles
        for (let i = 0; i < 50; i++) {
            this.victoryAnimation.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                color: winner === 1 ? '#ff6b6b' : '#4ecdc4',
                size: Math.random() * 5 + 2,
                life: Math.random() * 100 + 50
            });
        }
        
        // Play victory sound
        this.playVictorySound();
        
        // Disable fire button (if it exists)
        const fireButton = document.getElementById('fireButton');
        if (fireButton) {
            fireButton.disabled = true;
        }
    }
    
    updateVictoryAnimation() {
        if (!this.victoryAnimation.active) return;
        
        this.victoryAnimation.timer++;
        
        // Update particles
        for (let i = this.victoryAnimation.particles.length - 1; i >= 0; i--) {
            const particle = this.victoryAnimation.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            
            // Add some gravity to particles
            particle.vy += 0.1;
            
            if (particle.life <= 0) {
                this.victoryAnimation.particles.splice(i, 1);
            }
        }
        
        // Add more particles during animation
        if (this.victoryAnimation.timer < 200 && Math.random() < 0.3) {
            this.victoryAnimation.particles.push({
                x: Math.random() * this.width,
                y: -10,
                vx: (Math.random() - 0.5) * 3,
                vy: Math.random() * 2 + 1,
                color: this.victoryAnimation.winner === 1 ? '#ff6b6b' : '#4ecdc4',
                size: Math.random() * 4 + 2,
                life: Math.random() * 80 + 40
            });
        }
    }
    
    updateExplosions() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.radius += 2;
            explosion.life--;
            
            if (explosion.life <= 0) {
                this.explosions.splice(i, 1);
            }
        }
    }
    
    gameLoop() {
        this.updateWind();
        this.updateBackground(); // Update dynamic background
        this.updateProjectiles();
        this.updateExplosions();
        this.updatePlayerPositions(); // Continuously update player positions
        
        if (this.victoryAnimation.active) {
            this.updateVictoryAnimation();
        }
        
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Remove this old initialization since we now use the HTML initialization