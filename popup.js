
document.addEventListener("DOMContentLoaded", function () {
    const button = document.getElementById("open-popup"); // Replace with your actual button ID
    if (button) {
        button.addEventListener("click", function () {
            console.log("Button clicked!");
                chrome.runtime.sendMessage(
                    { type: "get_best_word", correct: [], present: [], absent: [] }, 
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.error("😢 error getting message:", chrome.runtime.lastError);
                        } else {
                            console.log("📩 got best word:", response.bestWord);
                        }
                    }
                );
        });
    } else {
        console.error("button go bye bye");
    }
});

