const fileNameInput = document.getElementById("name");
const fileNameCounter = document.getElementById("file-name-counter");
const fileDescriptionInput = document.getElementById("description");
const fileDescriptionCounter = document.getElementById(
  "file-description-counter",
);
fileNameInput.addEventListener("input", (e) => {
  const content = e.target.value;
  const numOfChars = content.length;
  fileNameCounter.textContent = `${numOfChars}/64`;
  if (numOfChars > 64) {
    fileNameCounter.classList.remove("text-slate-600");
    fileNameCounter.classList.add("text-red-900");
  } else {
    fileNameCounter.classList.add("text-slate-600");
    fileNameCounter.classList.remove("text-red-900");
  }
});

fileDescriptionInput.addEventListener("input", (e) => {
  const content = e.target.value;
  const numOfChars = content.length;
  fileDescriptionCounter.textContent = `${numOfChars}/256`;
  if (numOfChars > 256) {
    fileDescriptionCounter.classList.remove("text-slate-600");
    fileDescriptionCounter.classList.add("text-red-900");
  } else {
    fileDescriptionCounter.classList.add("text-slate-600");
    fileDescriptionCounter.classList.remove("text-red-900");
  }
});
