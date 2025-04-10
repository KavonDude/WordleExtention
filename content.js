console.log("CONTENT IS GOOD");
chrome.runtime.sendMessage({ type: "content_script_ready" });
gameState = null;
let lastGuess = null; 
let letterCount = {}; // Track occurrences of letters in the guess
function detectGame() {
    if (window.location.href.includes("mini")) {
        return "mini";
    } else if (window.location.href.includes("strands")) {
        return "strands";
    } else if (window.location.href.includes("wordle")) {
        return "wordle";
    }else if (window.location.href.includes("connections")) {
        return "connections";
    }
    return null;
}
const gameType = detectGame();

chrome.runtime.onMessage.addListener((message) => {
    console.log("📩 got el message:", message);

    if (message.type === "best_word"){
        if (!(lastGuess === message.bestWord)){
            lastGuess === message.bestWord;
            console.log("chose:", message.bestWord);
            enterWord(message.bestWord);
        } else{
            console.log("KYS");
            requestBestWord();
        }
    }
    if (message.type === "result"){
        console.log("RESULT: ", message.result);

    }

    return true;
});

function clickPlayButton() {
    if (gameType == "wordle"){
        const playButton = document.querySelector('[data-testid="Play"]')
            if (playButton) {
            playButton.click();
        } else {
            console.error(`WOAH THE PLAY BUTTON IS: ${playButton}`);
        }
    }else if (gameType == "strands" || gameType == "connections"){
        const playButton = document.querySelector('[data-testid="moment-btn-play"]');
        if (playButton) {
            playButton.click();
        } else {
            console.error(`WOAH THE PLAY BUTTON IS: ${playButton}`);
        }
    } else if (gameType == "mini"){
        const playButton = document.querySelector('[class="pz-moment__button"]');
        if (playButton) {
            playButton.click();
        } else {
            console.error(`WOAH THE PLAY BUTTON IS: ${playButton}`);
        }
    }
}
if (gameType) {
    console.log(`Detected game: ${gameType}`);
    const interval = setInterval(() => {
        clickPlayButton();
        clearInterval(interval);  // Stop checking once button is found
    }, 1000);
    // Send detected game to background script
    chrome.runtime.sendMessage({ type: "game_detected", game: gameType });
}

//connections
function getConnectionsGameState() {
    
    // Extract board letters
    const boardTiles = document.querySelectorAll('[data-testid="card-label"]');
    const board = Array.from(boardTiles).map(tile => tile.textContent.trim());

    return {
        board
    };
}
if (gameType === "connections"){
    const interval = setInterval(() => {
        gameState = getConnectionsGameState();
        console.log("Connections Game State:", gameState);
        chrome.runtime.sendMessage({ type: "game_state", gameState: gameState }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("👹👹👹 orror:", chrome.runtime.lastError);
            } else {
                console.log("👌 we feed the back!", response);
            }
        });
        clearInterval(interval);
    }, 2000);
}
function getConnectionsFeedback(){
    return gameState;
}
function clickTiles(words) {
    words.forEach(word => {
        // Find the tile that matches the word
        let tile = [...document.querySelectorAll(".tile")].find(el => el.innerText.trim().toLowerCase() === word.toLowerCase());

        if (tile) {
            console.log(`✅ Clicking: ${word}`);
            tile.click();
        } else {
            console.warn(`❌ Tile not found for: ${word}`);
        }
    });
    let submitKey = document.querySelector('[data-testid="submit-btn"]');
    if (submitKey) {
        submitKey.click();
    } else {
        console.error("we no SUBMIT TO u house");
    }
}

// WORDLE
function enterWord(word) {
    console.log("typing:", word);
    
    for (let char of word) {
        let key = document.querySelector(`[data-key="${char}"]`);
        if (key) {
            key.click();
        } else {
            console.error("WHERE IS THIS BUTTON:", char);
        }
    }

    let enterKey = document.querySelector('[data-key="↵"]');
    if (enterKey) {
        enterKey.click();
    } else {
        console.error("we no ENTER u house");
    }
    requestBestWord(); 
}

function requestBestWord() {
    console.log("we are waiting for u");
    chrome.runtime.sendMessage({ type: "request_feedback" });
}
let feedback = {
    correct: [], // [{ letter: "c", index: 0 }, ...]
    present: [], // [{ letter: "a", index: 2 }, ...]
    absent: []   // ["s", "t", "r", "o"]
};
let previousFeedback = {
    correct: [],
    present: [],
    absent: []
};
let num = 0;
function getWordleFeedback() {
    console.log("PREVIOUS FEEDBACL", previousFeedback);
    const rows = document.querySelectorAll('[class="Row-module_row__pwpBq"]'); // Select all rows
    const keys = document.querySelectorAll('[data-key]');  // Select all keyboard keys
    feedback = {
        correct: [],
        present: [],
        absent: previousFeedback.absent
    };  // Reset feedback

    let lastRow = null;
    
    // Find the last row with data-state values (latest submitted guess)
    for (let i = num; i < rows.length; i++) {
        let tiles = rows[i].querySelectorAll('[data-state]');
        if (tiles.length > 0) {
            lastRow = tiles;
            num++;
            break;
        }
    }

    if (!lastRow){
        console.warn("No valid row found.");
        return feedback; // No valid row found
    } 
    let letterCount = {}; // Track occurrences of letters in the guess

    lastRow.forEach((tile, index) => {
        const letter = tile.textContent.toLowerCase();
        const state = tile.getAttribute("data-state");

        if (!letterCount[letter]) {
            letterCount[letter] = {total: 0, correct: 0, present: 0, absent: 0, indexes: [] };
        }

        letterCount[letter].total++;
        letterCount[letter].indexes.push(index);

        if (state === "correct") {
            console.log("CORRECT:, ", letter);
            letterCount[letter].correct++;
            feedback.correct.push({letter, index});
        } else if (state === "present") {
            console.log("PRESEMT:, ", letter);
            letterCount[letter].present++;
            feedback.present.push({letter, index});
        } 
        else if (state === "absent") {
            console.log("ABSENT:, ", letter);
            letterCount[letter].absent++;
            feedback.absent.push({letter, index});
        }
    });
    console.log("LETTER COUNT:, ", letterCount);
    
    keys.forEach(key => {
        const letter = key.getAttribute("data-key").toLowerCase();
        const state = key.getAttribute("data-state");
        
        if (state) {
            let lettersss = letterCount;
            console.log("Checking letter:", letter, "Current lettersss object:", lettersss);
            // let theLetter = lettersss[letter];
            // let total = lettersss[letter].total;
            // let absents = lettersss[letter].absent;
            // let presents = lettersss[letter].present;
            // let corrects = lettersss[letter].correct;

            // if (corrects){
            //     let index = findLetterPosition(letter, "correct");
            //     if (index !== -1) feedback.correct.push({ letter, index });
            // }
            // if (presents){
            //     let index = findLetterPosition(letter, "present");
            //     if (index !== -1) feedback.present.push({ letter, index });
            // }
            // if (absents){
            //     let index = findLetterPosition(letter, "absent");
            //     if (index !== -1) feedback.absent.push({letter, index});
            // }


            // if (state === "correct") {
            //     // Find the position of this letter on the Wordle board
            //     let index = findLetterPosition(letter, "correct");
            //     if (index !== -1) feedback.correct.push({ letter, index });
            // }else if (state === "present") {
            //     let index = findLetterPosition(letter, "present");
            //     if (index !== -1) feedback.present.push({ letter, index });
            // }else if (state === "absent" && !feedback.absent.includes(letter)) {
            //     feedback.absent.push({letter});
            // } else{
            //     console.log("WOMP WOMP")
            // }
        }
    });
 

    console.log("we changed up the feekback:", feedback);
    return feedback;
}
function findLetterPosition(letter, type) {
    const rows = document.querySelectorAll('[class="Row-module_row__pwpBq"]');  // Select Wordle rows

    for (let row of rows) {
        let tiles = row.querySelectorAll('[data-state]');  // Select tiles with feedback
 
 
        for (let index = 0; index < tiles.length; index++) {
            if (
                tiles[index].textContent.toLowerCase() === letter.toLowerCase() &&
                tiles[index].getAttribute("data-state") === type
            ) {
                return index;  // Return the first matching position
            }
        }
    }
    return -1;  // If not found
 }


// 5️⃣ Listen for Requests from Background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "request_feedback" && gameType === "wordle") {
        const feedback = getWordleFeedback();
        previousFeedback = feedback;
        console.log("📤 yeet the feeckback:", feedback);
        if (feedback && feedback.correct.length < 9){
            const interval = setInterval(() => {
                chrome.runtime.sendMessage({ type: "feedback", feedback: feedback }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("👹👹👹 orror:", chrome.runtime.lastError);
                    } else {
                        console.log("👌 we feed the back!", response);
                    }
                });
                clearInterval(interval);
            }, 2000);
        }
    }
    if (message.type === "request_feedback" && gameType === "connections"){
        const conFeedback = getConnectionsFeedback();
        console.log("📤 yeet the feeckback:", conFeedback);
        if (conFeedback){
            const interval = setInterval(() => {
                chrome.runtime.sendMessage({ type: "feedback", feedback: conFeedback }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("👹👹👹 orror:", chrome.runtime.lastError);
                    } else {
                        console.log("👌 we feed the back!", response);
                    }
                });
                clearInterval(interval);
            }, 2000);
        }
    }
    return true;
});

// function sendFeedbackToAI() {
//     const feedback = getFeedback();

//     console.log("📤 yeet the feeckback:", feedback);
//         chrome.runtime.sendMessage({ type: "feedback", feedback: feedback }, (response) => {
//             if (chrome.runtime.lastError) {
//                 console.error("👹👹👹 orror:", chrome.runtime.lastError);
//             } else {
//                 console.log("👌 we feed the back!", response);
//             }
//         });

// }


