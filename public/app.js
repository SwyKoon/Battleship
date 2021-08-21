document.addEventListener('DOMContentLoaded', () => {
    const userGrid = document.querySelector('.grid-user')
    const computerGrid = document.querySelector('.grid-computer')
    const displayGrid = document.querySelector('.grid-display')
    const ships = document.querySelectorAll('.ship')
    const destroyer = document.querySelector('.destroyer-container')
    const submarine = document.querySelector('.submarine-container')
    const cruiser = document.querySelector('.cruiser-container')
    const battleship = document.querySelector('.battleship-container')
    const carrier = document.querySelector('.carrier-container')
    const startButton = document.querySelector('#start')
    const rotateButton = document.querySelector('#rotate')
    const turnDisplay = document.querySelector('#whose-go')
    const infoDisplay = document.querySelector('#info')
    const setupButtons = document.getElementById('setup-buttons')

    // Array in which 100 divs of the user grid along with their id's are stored
    const userSquares = []
    // Array in which 100 divs of the computer grid along with their id's are stored
    const computerSquares = []
    let isHorizontal = true
    let isGameOver = false
    let currentPlayer = 'user'
    const width = 10
    let playerNum = 0
    let ready = false
    let enemyReady = false
    let allShipsPlaced = false
    let shotFired = -1

    //SHIPS
    // We have created an array of objects. There are 5 such objects in all for each of the 5 ship's locations
    // We have 2 properties inside each object. One is the name of the ship that object is for and the second is directions, the id's of the div's that ship would take.
    // Here we have assumed that all ships are placed at the starting of the grid. Firt are the id's of the div's cpvered by the ship when arranged horizontally
    // and second is the id's of the div's covered by the ship when in vertical position.
    // eg: The destroyer ship will cover 2 grids. So with the above assumption, in horizontal position, it will cover the div's with id's 0 and 1,
    // while in vertical postion, it will cover div's with id's 0,10.
    const shipArray = [
      {
        name: 'destroyer',
        directions: [
          [0, 1],
          [0, width]
        ]
      },
      {
        name: 'submarine',
        directions: [
          [0, 1, 2],
          [0, width, width*2]
        ]
      },
      {
        name: 'cruiser',
        directions: [
          [0, 1, 2],
          [0, width, width*2]
        ]
      },
      {
        name: 'battleship',
        directions: [
          [0, 1, 2, 3],
          [0, width, width*2, width*3]
        ]
      },
      {
        name: 'carrier',
        directions: [
          [0, 1, 2, 3, 4],
          [0, width, width*2, width*3, width*4]
        ]
      }
    ]
  
    // Function to make grid for the user 
    createBoard(userGrid, userSquares)
    // Function to make grid for the computer
    createBoard(computerGrid, computerSquares)
  
    // SELECT PLAYER MODE
    if (gameMode === 'singlePlayer') {
      startSinglePlayer()
    } else {
      startMultiPlayer()
    }
  
    // MULTIPLAYER
    function startMultiPlayer() {
      // The 'io' will come from the script tag that is being loaded in the multiplayer.html file's head tag
      const socket = io();
  
      // GET YOUR PLAYER NUMBER
      socket.on('player-number', num => {
        if (num === -1) {
          infoDisplay.innerHTML = "Sorry, the server is full"
        } else {
          playerNum = parseInt(num)
          if(playerNum === 1) currentPlayer = "enemy"
  
          console.log(playerNum)
  
          // GET OTHER PLAYER STATUS
          socket.emit('check-players')
        }
      })
  
      // ANOTHER PALYER HAS CONNECTED OR DISCONNECTED
      // We are recieving the message sent by socket.broadcast.emit here
      socket.on('player-connection', num => {
        console.log(`Player number ${num} has connected or disconnected`)
        playerConnectedOrDisconnected(num)
      })
  
      // ON ENEMY READY
      // We are listening to the request 'enemy-ready' in server.js
      socket.on('enemy-ready', num => {
        enemyReady = true
        playerReady(num)
        if (ready) {
          playGameMulti(socket)
          setupButtons.style.display = 'none'
        }
      })
  
      // CHECK PLAYER STATUS
      socket.on('check-players', players => {
        players.forEach((p, i) => {
          if(p.connected) playerConnectedOrDisconnected(i)
          if(p.ready) {
            playerReady(i)
            if(i !== playerNum) enemyReady = true
          }
        })
      })
  
      // ON TIMEOUT
      socket.on('timeout', () => {
        infoDisplay.innerHTML = 'You have reached the 10 minute limit'
      })
  
      // READY BUTTON CLICK
      startButton.addEventListener('click', () => {
        if(allShipsPlaced) playGameMulti(socket)
        else infoDisplay.innerHTML = "Please place all ships"
      })
  
      // SETUP EVENT LISTENERS FOR FIRING
      computerSquares.forEach(square => {
        square.addEventListener('click', () => {
          if(currentPlayer === 'user' && ready && enemyReady) {
            shotFired = square.dataset.id
            socket.emit('fire', shotFired)
          }
        })
      })
  
      // ON FIRE RECIEVED
      socket.on('fire', id => {
        enemyGo(id)
        const square = userSquares[id]
        socket.emit('fire-reply', square.classList)
        playGameMulti(socket)
      })
  
      // ON FIRE REPLY RECIEVED
      // classList contains the content of the squares that are being passed.
      // Here we are revealing the sqaures and then calling playMultiGame to inforn whose turn it is now.
      socket.on('fire-reply', classList => {
        revealSquare(classList)
        playGameMulti(socket)
      })
  
      function playerConnectedOrDisconnected(num) {
        // We are storing the class name of either p1 or p2 in player variable
        let player = `.p${parseInt(num) + 1}`
        // Now we select the div with class 'connected' which will be inside the class whose name is stored in player vaiable
        document.querySelector(`${player} .connected`).classList.toggle('active')
        if(parseInt(num) === playerNum) document.querySelector(player).style.fontWeight = 'bold'
      }
    }
  
    // SINGLE PLAYER
    function startSinglePlayer() {
      generate(shipArray[0])
      generate(shipArray[1])
      generate(shipArray[2])
      generate(shipArray[3])
      generate(shipArray[4])
  
      startButton.addEventListener('click', () => {
        setupButtons.style.display = 'none'
        playGameSingle()
      })
    }
  
    // CREATE BOARD
    // The first argument is the div that contains the complete grid assigned for the user/computer 
    // The second argument is the array that will store all the square divs for the user/computer grid along with the id's assigned to the divs
    function createBoard(grid, squares) {
      for (let i = 0; i < width*width; i++) {
        const square = document.createElement('div')
        square.dataset.id = i
        grid.appendChild(square)
        squares.push(square)
      }
    }
  
    //Draw the computers ships in random locations
    function generate(ship) {
      // The value residing in this variable is going to be b/w 0 or 1 coz random method produces floating values b/w 0 and 1.
      // Math.random may return 0 but never returns 1 as value.
      let randomDirection = Math.floor(Math.random() * ship.directions.length)
      // We want to choose one direction for our ship; vertical or horizontal
      let current = ship.directions[randomDirection]

      // This is being done so that we can put our ships on the grid
      if (randomDirection === 0) direction = 1
      if (randomDirection === 1) direction = 10

      // This variable is going to contain a random id of a div from where the computer's ship would begin
      let randomStart = Math.abs(Math.floor(Math.random() * computerSquares.length - (ship.directions[0].length * direction)))
  
      const isTaken = current.some(index => computerSquares[randomStart + index].classList.contains('taken'))
      const isAtRightEdge = current.some(index => (randomStart + index) % width === width - 1)
      const isAtLeftEdge = current.some(index => (randomStart + index) % width === 0)
  
      if (!isTaken && !isAtRightEdge && !isAtLeftEdge) current.forEach(index => computerSquares[randomStart + index].classList.add('taken', ship.name))
  
      else generate(ship)
    }
    
  
    //ROTATE THE SHIPS
    // In this function we are going to toggle the class 'destroyer-container'
    // to 'destroyer-container-vertical' to make the ships vertical and vice-versa to make ships horizontal
    function rotate() {
      if (isHorizontal) {
        destroyer.classList.toggle('destroyer-container-vertical')
        submarine.classList.toggle('submarine-container-vertical')
        cruiser.classList.toggle('cruiser-container-vertical')
        battleship.classList.toggle('battleship-container-vertical')
        carrier.classList.toggle('carrier-container-vertical')
        isHorizontal = false
        // console.log(isHorizontal)
        return
      }
      if (!isHorizontal) {
        destroyer.classList.toggle('destroyer-container-vertical')
        submarine.classList.toggle('submarine-container-vertical')
        cruiser.classList.toggle('cruiser-container-vertical')
        battleship.classList.toggle('battleship-container-vertical')
        carrier.classList.toggle('carrier-container-vertical')
        isHorizontal = true
        // console.log(isHorizontal)
        return
      }
    }
    rotateButton.addEventListener('click', rotate)
  
    // MOVE THE SHIPS AROUND
    ships.forEach(ship => ship.addEventListener('dragstart', dragStart))
    userSquares.forEach(square => square.addEventListener('dragstart', dragStart))
    userSquares.forEach(square => square.addEventListener('dragover', dragOver))
    userSquares.forEach(square => square.addEventListener('dragenter', dragEnter))
    userSquares.forEach(square => square.addEventListener('dragleave', dragLeave))
    userSquares.forEach(square => square.addEventListener('drop', dragDrop))
    userSquares.forEach(square => square.addEventListener('dragend', dragEnd))
  
    // Variables we are going to use in the following functions
    let selectedShipNameWithIndex
    let draggedShip
    let draggedShipLength

    // This function is for selecting the id's of the div's that make up a particular ship
    // This function is for selecting the name of the ship and its id that has been assigned to it by doing the above.
    ships.forEach(ship => ship.addEventListener('mousedown', (e) => {
      selectedShipNameWithIndex = e.target.id
      // console.log(selectedShipNameWithIndex)
    }))
  
    // The childNodes in this function will contain a NodeList of the div's that make up a perticular ship 
    // and we are finding its length so that we can determine which ship we are dragging. We are going inside the dragged ship div
    // so we use childNodes to get all the div's inside the ship name and then find its length
    function dragStart() {
      draggedShip = this
      draggedShipLength = this.childNodes.length
      // console.log(draggedShip)
    }
  
    function dragOver(e) {
      e.preventDefault()
    }
  
    function dragEnter(e) {
      e.preventDefault()
    }
  
    function dragLeave() {
      // console.log('drag leave')
    }
  
    function dragDrop() {
      // Id of the last div of the ship being dragged. eg: cruiser-2, carrier-4
      let shipNameWithLastId = draggedShip.lastChild.id
      // Name of the ship in shipClass variable
      let shipClass = shipNameWithLastId.slice(0, -2)
      // This variable will store the id of the last div of the chosen ship.
      // For carrier it will be 4 and for destroyer it will be 1 and so on
      let lastShipIndex = parseInt(shipNameWithLastId.substr(-1))
      // The variable shipLastId will store the last id on the user grid occupied by the ship.
      // The this object here specifies the div that the div of the ship will occupy. The div of the ship 
      // is the div from which we pick up the ship.
      let shipLastId = lastShipIndex + parseInt(this.dataset.id)
      // console.log(shipLastId)
      const notAllowedHorizontal = [0,10,20,30,40,50,60,70,80,90,1,11,21,31,41,51,61,71,81,91,2,22,32,42,52,62,72,82,92,3,13,23,33,43,53,63,73,83,93]
      const notAllowedVertical = [99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60]
      
      let newNotAllowedHorizontal = notAllowedHorizontal.splice(0, 10 * lastShipIndex)
      let newNotAllowedVertical = notAllowedVertical.splice(0, 10 * lastShipIndex)
  
      selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1))
  
      shipLastId = shipLastId - selectedShipIndex
      // console.log(shipLastId)
  
      if (isHorizontal && !newNotAllowedHorizontal.includes(shipLastId)) {
        for (let i=0; i < draggedShipLength; i++) {
          // This code is for adding the curves to the start or end of the ship irrespective of alignment
          let directionClass
          if (i === 0) directionClass = 'start'
          if (i === draggedShipLength - 1) directionClass = 'end'
          
          userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.add('taken', 'horizontal', directionClass, shipClass)
        }
      //As long as the index of the ship you are dragging is not in the newNotAllowedVertical array! This means that sometimes if you drag the ship by its
      //index-1 , index-2 and so on, the ship will rebound back to the displayGrid.
      } else if (!isHorizontal && !newNotAllowedVertical.includes(shipLastId)) {
        for (let i=0; i < draggedShipLength; i++) {
          // This code is for adding the curves to the start or end of the ship irrespective of alignment
          let directionClass
          if (i === 0) directionClass = 'start'
          if (i === draggedShipLength - 1) directionClass = 'end'

          // console.log(parseInt(this.dataset.id) - selectedShipIndex + width*i);
          userSquares[parseInt(this.dataset.id) + width*i].classList.add('taken', 'vertical', directionClass, shipClass)
        }
      } else return
  
      displayGrid.removeChild(draggedShip)
      if(!displayGrid.querySelector('.ship')) allShipsPlaced = true
    }
  
    function dragEnd() {
      // console.log('dragend')
    }
  
    // GAME LOGIC FOR MULTIPLAYER
    function playGameMulti(socket) {
      setupButtons.style.display = 'none'
      if(isGameOver) return
      if(!ready) {
        socket.emit('player-ready')
        ready = true
        playerReady(playerNum)
      }

      if(enemyReady) {
        if(currentPlayer === 'user') {
          turnDisplay.innerHTML = 'Your Go'
        }
        if(currentPlayer === 'enemy') {
          turnDisplay.innerHTML = "Enemy's Go"
        }
      }
    }
  
    function playerReady(num) {
      let player = `.p${parseInt(num) + 1}`
      document.querySelector(`${player} .ready`).classList.toggle('active')
    }
  
    // GAME LOGIC FOR SINGLE PLAYER
    function playGameSingle() {
      if (isGameOver) return
      if (currentPlayer === 'user') {
        turnDisplay.innerHTML = 'Your Go'
        computerSquares.forEach(square => square.addEventListener('click', function(e) {
          shotFired = square.dataset.id
          revealSquare(square.classList)
        }))
      }
      if (currentPlayer === 'enemy') {
        turnDisplay.innerHTML = 'Computers Go'
        setTimeout(enemyGo, 1000)
      }
    }
  
    // Variables to store the number of hits of a particular ship for the user/current player
    let destroyerCount = 0
    let submarineCount = 0
    let cruiserCount = 0
    let battleshipCount = 0
    let carrierCount = 0
  
    function revealSquare(classList) {
      const enemySquare = computerGrid.querySelector(`div[data-id='${shotFired}']`)
      const obj = Object.values(classList)
      // This line is like literally saying - "Agar abhi tk is enemy square pe hit nhi kiya aur agr user yaani hm khud khel rhe hai aur game game khatam nhi hua hai toh aage ka kaam krdo"
      if (!enemySquare.classList.contains('boom') && currentPlayer === 'user' && !isGameOver) {
        if (obj.includes('destroyer')) destroyerCount++
        if (obj.includes('submarine')) submarineCount++
        if (obj.includes('cruiser')) cruiserCount++
        if (obj.includes('battleship')) battleshipCount++
        if (obj.includes('carrier')) carrierCount++
      }

      // In this if-else code, if we hit we add class 'boom' to that div on which we clicked else we add 'miss'
      // class to that div. We style them using CSS.
      if (obj.includes('taken')) {
        enemySquare.classList.add('boom')
      } else {
        enemySquare.classList.add('miss')
      }
      checkForWins()
      currentPlayer = 'enemy'
      if(gameMode === 'singlePlayer') playGameSingle()
    }
  
    // Variables to store the number of hits of a particular ship for the computer/oppponent
    let cpuDestroyerCount = 0
    let cpuSubmarineCount = 0
    let cpuCruiserCount = 0
    let cpuBattleshipCount = 0
    let cpuCarrierCount = 0
  
  
    function enemyGo(square) {
      if (gameMode === 'singlePlayer') square = Math.floor(Math.random() * userSquares.length)
      if (!userSquares[square].classList.contains('boom')) {
        
        // These 2 lines of codes are first storing true or false in hit variable and then 
        // adding class boom or miss based on whether hit is true or false
        const hit = userSquares[square].classList.contains('taken')
        userSquares[square].classList.add(hit ? 'boom' : 'miss')

        if (userSquares[square].classList.contains('destroyer')) cpuDestroyerCount++
        if (userSquares[square].classList.contains('submarine')) cpuSubmarineCount++
        if (userSquares[square].classList.contains('cruiser')) cpuCruiserCount++
        if (userSquares[square].classList.contains('battleship')) cpuBattleshipCount++
        if (userSquares[square].classList.contains('carrier')) cpuCarrierCount++
        checkForWins()
      } else if (gameMode === 'singlePlayer') enemyGo()
      currentPlayer = 'user'
      turnDisplay.innerHTML = 'Your Go'
    }
  
    function checkForWins() {
      let enemy = 'computer'
      if(gameMode === 'multiPlayer') enemy = 'enemy'
      console.log(destroyerCount,submarineCount,cruiserCount,battleshipCount,carrierCount);
      if (destroyerCount === 2) {
        infoDisplay.innerHTML = `You sunk the ${enemy}'s destroyer`
        // When we have sunk a ship, we get 10 points for each ship so that in the end we can check that if we 
        // got 50 points then the game is over else keep playing
        destroyerCount = 10
      }
      if (submarineCount === 3) {
        infoDisplay.innerHTML = `You sunk the ${enemy}'s submarine`
        submarineCount = 10
      }
      if (cruiserCount === 3) {
        infoDisplay.innerHTML = `You sunk the ${enemy}'s cruiser`
        cruiserCount = 10
      }
      if (battleshipCount === 4) {
        infoDisplay.innerHTML = `You sunk the ${enemy}'s battleship`
        battleshipCount = 10
      }
      if (carrierCount === 5) {
        infoDisplay.innerHTML = `You sunk the ${enemy}'s carrier`
        carrierCount = 10
      }
      if (cpuDestroyerCount === 2) {
        infoDisplay.innerHTML = `${enemy} sunk your destroyer`
        // When computer has sunk a ship, it gets 10 points for each ship so that in the end we can check that if it 
        // got 50 points then the game is over else keep playing
        cpuDestroyerCount = 10
      }
      if (cpuSubmarineCount === 3) {
        infoDisplay.innerHTML = `${enemy} sunk your submarine`
        cpuSubmarineCount = 10
      }
      if (cpuCruiserCount === 3) {
        infoDisplay.innerHTML = `${enemy} sunk your cruiser`
        cpuCruiserCount = 10
      }
      if (cpuBattleshipCount === 4) {
        infoDisplay.innerHTML = `${enemy} sunk your battleship`
        cpuBattleshipCount = 10
      }
      if (cpuCarrierCount === 5) {
        infoDisplay.innerHTML = `${enemy} sunk your carrier`
        cpuCarrierCount = 10
      }
  
      if ((destroyerCount + submarineCount + cruiserCount + battleshipCount + carrierCount) === 50) {
        infoDisplay.innerHTML = "YOU WIN"
        gameOver()
      }
      if ((cpuDestroyerCount + cpuSubmarineCount + cpuCruiserCount + cpuBattleshipCount + cpuCarrierCount) === 50) {
        infoDisplay.innerHTML = `${enemy.toUpperCase()} WINS`
        gameOver()
      }
    }
  
    function gameOver() {
      isGameOver = true
      startButton.removeEventListener('click', playGameSingle)
    }
})