console.log("WhatsApp Marker Extension Loaded");

/* ---------------- CATEGORY COLORS ---------------- */
function getCategoryColor(category) {
  const map = {
    Notes: "#3b82f6",
    Tasks: "#f59e0b",
    Important: "#ef4444",
    Uncategorized: "#6b7280"
  };
  return map[category] || "#22c55e";
}

/* ---------------- ADD MARK BUTTON ---------------- */
function addMarkButtons() {
  const messages = document.querySelectorAll("div.message-in, div.message-out");

  messages.forEach((msg) => {
    if (msg.querySelector(".mark-btn")) return;

    const button = document.createElement("button");
    button.innerText = "Mark";
    button.className = "mark-btn";

    button.onclick = () => {
      let messageText = "";

      const textElement = msg.querySelector("span.selectable-text");
      if (textElement) {
        messageText = textElement.innerText;
      }

      const docElement = msg.querySelector("[title]");
      if (!messageText && docElement) {
        messageText = docElement.getAttribute("title");
      }

      if (!messageText) {
        messageText = msg.innerText;
      }

      showCategoryModal((category) => {
        const messageData = {
          text: messageText,
          category: category,
          time: new Date().toLocaleString(),
        };
      
        chrome.storage.local.get(["markedMessages"], (result) => {
          const existing = result.markedMessages || [];
          existing.push(messageData);
      
          chrome.storage.local.set({ markedMessages: existing }, () => {
            alert(`Saved under ${category}`);
          });
        });
      });
      return; // IMPORTANT: stop further execution

      const messageData = {
        text: messageText,
        category: category,
        time: new Date().toLocaleString(),
      };

      chrome.storage.local.get(["markedMessages"], (result) => {
        const existing = result.markedMessages || [];
        existing.push(messageData);

        chrome.storage.local.set({ markedMessages: existing }, () => {
          alert(`Saved under ${category}`);
        });
      });
    };

    msg.appendChild(button);
  });
}

// CUSTOM MODAL FOR CATEGORY SELECTION
function showCategoryModal(callback) {
  // prevent duplicate
  if (document.getElementById("custom-category-modal")) return;

  const modal = document.createElement("div");
  modal.id = "custom-category-modal";

  modal.innerHTML = `
    <div class="modal-box">
      <h3>Select Category</h3>

      <div class="category-options">
        <button class="cat-btn">Notes</button>
        <button class="cat-btn">Tasks</button>
        <button class="cat-btn">Important</button>
      </div>

      <input type="text" id="custom-category-input" placeholder="Or type custom category..." />

      <div class="modal-actions">
        <button id="cancel-btn">Cancel</button>
        <button id="ok-btn">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  let selectedCategory = "";

  // preset buttons
  modal.querySelectorAll(".cat-btn").forEach(btn => {
    btn.onclick = () => {
      selectedCategory = btn.innerText;
      document.getElementById("custom-category-input").value = selectedCategory;
    };
  });

  // cancel
  document.getElementById("cancel-btn").onclick = () => {
    modal.remove();
  };

  // save
  document.getElementById("ok-btn").onclick = () => {
    const inputVal = document.getElementById("custom-category-input").value.trim();

    if (!inputVal) {
      alert("Enter a category");
      return;
    }

    callback(inputVal);
    modal.remove();
  };
}

/* ---------------- OBSERVER ---------------- */
const observer = new MutationObserver(() => {
  addMarkButtons();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

setTimeout(addMarkButtons, 3000);

/* ---------------- SIDEBAR ---------------- */
function createSidebar() {
  if (document.getElementById("marker-sidebar")) return;

  const sidebar = document.createElement("div");
  sidebar.id = "marker-sidebar";

  sidebar.innerHTML = `
    <h3>Marked Messages</h3>
    <div id="marker-filters"></div>
    <div id="marker-list"></div>
  `;

  document.body.appendChild(sidebar);

  const toggleBtn = document.createElement("button");
  toggleBtn.id = "marker-toggle-btn";
  toggleBtn.innerText = "📌";

  toggleBtn.onclick = () => {
    if (sidebar.classList.contains("open")) {
      sidebar.classList.remove("open");
    } else {
      sidebar.classList.add("open");
      loadMessages();
    }
  };

  document.body.appendChild(toggleBtn);

  document.addEventListener("click", (e) => {
    const clickedInsideSidebar = sidebar.contains(e.target);
    const clickedToggleBtn = toggleBtn.contains(e.target);

    if (!clickedInsideSidebar && !clickedToggleBtn) {
      sidebar.classList.remove("open");
    }
  });
}

/* ---------------- LOAD MESSAGES ---------------- */
function loadMessages(selectedCategory = "All") {
  chrome.storage.local.get(["markedMessages"], (result) => {
    const list = document.getElementById("marker-list");
    const filterDiv = document.getElementById("marker-filters");

    list.innerHTML = "";
    filterDiv.innerHTML = "";

    const messages = result.markedMessages || [];

    const categories = [
      "All",
      ...new Set(messages.map(m => m.category || "Uncategorized"))
    ];

    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.innerText = cat;
      btn.className = "filter-btn";

      if (cat === selectedCategory) {
        btn.classList.add("active-filter");
      }

      btn.onclick = () => loadMessages(cat);

      filterDiv.appendChild(btn);
    });

    const filtered = selectedCategory === "All"
      ? messages
      : messages.filter(m => (m.category || "Uncategorized") === selectedCategory);

    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty-state">No messages here yet</div>`;
      return;
    }

    filtered.reverse().forEach((msg) => {
      const item = document.createElement("div");
      item.className = "marker-item";

      item.innerHTML = `
        <div class="marker-card">
          <div class="marker-top">
            <span class="marker-category" style="background:${getCategoryColor(msg.category)}">
              ${msg.category || "Uncategorized"}
            </span>
            <button class="delete-btn">✖</button>
          </div>

          <div class="marker-text">${msg.text}</div>
          <div class="marker-time">${msg.time}</div>
        </div>
      `;

      /* -------- CLICK → SCROLL TO MESSAGE -------- */
      item.onclick = (e) => {
        if (e.target.classList.contains("delete-btn")) return;

        const allMessages = Array.from(
          document.querySelectorAll("div.message-in, div.message-out")
        ).reverse();

        let found = false;

        for (let chatMsg of allMessages) {
          const textElement = chatMsg.querySelector("span.selectable-text");
          const text = textElement ? textElement.innerText : chatMsg.innerText;

          if (text && msg.text && text.includes(msg.text.substring(0, 25))) {
            chatMsg.scrollIntoView({ behavior: "smooth", block: "center" });

            chatMsg.style.backgroundColor = "#2a3942";

            setTimeout(() => {
              chatMsg.style.backgroundColor = "";
            }, 1500);

            found = true;
            break;
          }
        }

        if (!found) {
          alert("Message not found. Scroll up a bit and try again.");
        }
      };

      /* -------- DELETE -------- */
      const deleteBtn = item.querySelector(".delete-btn");

      deleteBtn.onclick = () => {
        chrome.storage.local.get(["markedMessages"], (result) => {
          let messages = result.markedMessages || [];

          messages = messages.filter(
            (m) =>
              !(m.text === msg.text &&
                m.time === msg.time &&
                m.category === msg.category)
          );

          chrome.storage.local.set({ markedMessages: messages }, () => {
            loadMessages(selectedCategory);
          });
        });
      };

      list.appendChild(item);
    });
  });
}

setTimeout(createSidebar, 3000);