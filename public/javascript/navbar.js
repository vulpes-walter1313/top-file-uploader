document.addEventListener("DOMContentLoaded", () => {
  const menuToggleBtn = document.getElementById("nav-menu-toggle");
  const navItemsContainer = document.getElementById("nav-items-container");
  menuToggleBtn.addEventListener("click", () => {
    navItemsContainer.classList.toggle("-translate-x-full");
  })
})