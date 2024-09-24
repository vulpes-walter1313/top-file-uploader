const folderNameInput = document.getElementById("name");
const folderNameCounter = document.getElementById("folder-name-counter");
const folderDescriptionInput = document.getElementById("description");
const folderDescriptionCounter = document.getElementById(
  "folder-description-counter",
);
folderNameInput.addEventListener("input", (e) => {
  const content = e.target.value;
  const numOfChars = content.length;
  folderNameCounter.textContent = `${numOfChars}/50`;
  if (numOfChars > 50) {
    folderNameCounter.classList.remove("text-slate-600");
    folderNameCounter.classList.add("text-red-900");
  } else {
    folderNameCounter.classList.add("text-slate-600");
    folderNameCounter.classList.remove("text-red-900");
  }
});

folderDescriptionInput.addEventListener("input", (e) => {
  const content = e.target.value;
  const numOfChars = content.length;
  folderDescriptionCounter.textContent = `${numOfChars}/256`;
  if (numOfChars > 256) {
    folderDescriptionCounter.classList.remove("text-slate-600");
    folderDescriptionCounter.classList.add("text-red-900");
  } else {
    folderDescriptionCounter.classList.add("text-slate-600");
    folderDescriptionCounter.classList.remove("text-red-900");
  }
});
