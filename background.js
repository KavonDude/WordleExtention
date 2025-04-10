console.log("BACKGROUND IS GOOD");

const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const API_KEY = "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";  // Replace with your real key
let gameType = null;
let gameState = null; 
let firstTime = true;
let chosenWord = ""; // Stores the randomly chosen word


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url.includes("nytimes.com/games")) {
        console.log("👍👍👍👍 NYT Games page detected!");

        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["content.js"]
        }, () => {
            console.log("👍👍👍👍👍 Injected content.js");

            // chrome.tabs.sendMessage(tabId, { type: "get_best_word", best_word: "apple" })
            // .catch(error => console.error("❌ Failed to send message:", error));
        });
    }
});
// Handles all incoming messages in one listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received:", message);

    if (message.type === "game_detected") {
        console.log(`Game detected: ${message.game}`);
        gameType = message.game;

        if (!gameType === "wordle"){
            const gameData = {
                model: "meta-llama/llama-3.3-70b-instruct",
                messages: [
                    { role: "system", content: "You are an AI assistant that plays NYT games." },
                    { role: "user", content: `I'm playing ${message.game}. What should I do first?` }
                ]
            };

            sendToAPI(gameData)
            
                .then(response => sendResponse({ success: true, data: response }))
                .catch(error => sendResponse({ success: false, error: error.message }));

            return true;  // Keeps sendResponse open for async fetch
        }
    }
    if (message.type === "game_state"){
        gameState = message.gameState;
        console.log("GAMESTAES: ", gameState);
    }
    if (message.type === "get_best_word") {
        if (gameType === "wordle"){
            firstTime = true;
            getBestWord()
                .then(bestWord => {
                    console.log("👍👍👍👍👍 sent:", bestWord);
                    sendResponse({ bestWord });
                    sendMessageToContent({type: "best_word", bestWord: bestWord})
                })
                .catch(error => {
                    console.error("ORROR WHEN I DID WORDLE:", error);
                    sendResponse({ bestWords: "ERROR" });
                });
        }
        if (gameType === "connections"){
            askAiConnections(gameState)
                .then(result => {
                    const interval = setInterval(() => {
                        console.log("👍👍👍👍👍 sent:", result);
                        sendResponse({ result });
                        sendMessageToContent({type: "result", result: result})
                        clearInterval(interval);
                    }, 7000);
                })
                .catch(error => {
                    console.error("ORROR WHEN I DID something idk:", error);
                    sendResponse({ error: "ERROR" });
                });
            return true;
        }

        return true;  // <---- This keeps the message channel open for async responses
    }
    if (message.type === "request_feedback"){
        const interval = setInterval(() => {
            chrome.tabs.sendMessage(sender.tab.id, { type: "request_feedback"});
            clearInterval(interval);
        }, 2000);
    }
    if (message.type === "feedback") {
        if (gameType === "wordle"){
            getBestWord(message.feedback.correct, message.feedback.present, message.feedback.absent).then(bestWord => {
                if (bestWord) {
                    chrome.tabs.sendMessage(sender.tab.id, { type: "best_word", bestWord: bestWord });
                } else {
                    console.error("no real words exist.");
                }
            });
        }
        if (gameType === "connections"){
            askAiConnections(message.gameState)
                .then(result => {
                    console.log("👍👍👍👍👍 sent:", result);
                    sendResponse({ result });
                    sendMessageToContent({type: "result", result: result})
                })
                .catch(error => {
                    console.error("ORROR WHEN I DID something idk:", error);
                    sendResponse({ error: "ERROR" });
                });
            return true;
        }
    }
    return true;
});
// Function to send API request
async function sendToAPI(data) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
        }
        const result_1 = await response.json();
        console.log("API Response:", result_1);
        return result_1;
    } catch (error) {
        console.error("Error calling API:", error);
        throw error;
    }
}
// Track if content.js is ready
let contentScriptReady = false;
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "content_script_ready") {
        console.log("👍👍👍👍👍 Content script is ready!");
        contentScriptReady = true;
    }
});

// Function to send a message to content.js *only if it’s ready*
async function sendMessageToContent(message) {
    if (!contentScriptReady) {
        console.warn("❌ Content script is not ready yet. Message not sent.");
        return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("❌ Error sending message:", chrome.runtime.lastError);
                } else {
                    console.log("📩 Message sent successfully:", message);
                }
            });
        }
    });
}

async function loadWordList() {
    const response = await fetch(chrome.runtime.getURL("Words.txt"));
    const text = await response.text();
    const words = text.split("\n").map(word => word.trim().toLowerCase()); // Convert to array
    return words;
}

function filterWords(wordList, correct, present, absent) {
    chosenWord = "";

    if (firstTime && wordList.length > 0) {
        firstTime = false; // Ensure it only happens once
        chosenWord = wordList[Math.floor(Math.random() * wordList.length)];
    }

    return wordList.filter(word => {

        if (chosenWord) {
            return word === chosenWord; // Return true only for the chosen word
        }

        // Check Correct Letters (must be at the correct index)
        for (const { letter, index } of correct) {
            if (word[index] !== letter) return false;
        }

        // Check Present Letters (must be in the word but NOT at the specified index)
        for (const { letter, index } of present) {
            if (!word.includes(letter) || word[index] === letter) return false;
        }

        // Check Absent Letters (must NOT be in the word)
        for (const { letter, index } of absent) {
            if (word[index] === letter) return false;
        }

        return true;
    });
}

async function getBestWord(correct = [], present = [], absent = []) {
    const wordList = await loadWordList();
    if (wordList.length === 0) {
        console.warn("⚠️ No words found. Using fallback word.");
        return "audio"; // Fallback if scraping fails
    }

    const filteredWords = filterWords(wordList, correct, present, absent);
    return filteredWords.length > 0 ? filteredWords[0] : "place"; // Return the first valid word
}
async function askAiConnections(feedback) {
    const feedbackString = JSON.stringify(feedback, null, 2);
    // Send request to AI
    const requestData = {
        model: "meta-llama/llama-3.3-70b-instruct",
        messages: [
            { role: "user", content: `This is a game of New York Times Connections. 
                Here is the board state of the game:\n\n${feedbackString}.
                Please only give one group guess per response.
                One Group consists of only four words.
                make sure your guess are in brackets in this form:
                ["APPLE", "BANANA", "ORANGE", "PEAR"].` 
            }
        ]
    };

    sendToAPI(requestData)
        .then((result) => {
            result = result.choices?.[0]?.message?.content;
            console.log("👍👍👍 AI SAID SOMEHTING:", result);
            // result = extractWordsFromMessage(message);
            sendMessageToContent({ type: "result", result: result });
        })
        .catch((error) => {
            console.error("❌ AI is terrible, horrible, and terrible:", error);
            sendMessageToContent({ type: "ERROR", error});
        });
    
    return true;
}


