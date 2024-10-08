const btns = document.querySelectorAll("[data-url]");

btns.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    if (!navigator.clipboard) {
      return;
    }
    const copyText = btn.dataset.url;
    try {
      navigator.clipboard.writeText(copyText);
      alert("share url has been copied");
    } catch (err) {
      console.error(err);
    }
  });
});
