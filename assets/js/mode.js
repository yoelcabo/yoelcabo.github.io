const toggleSwitch = document.querySelector("#dark-mode-toggle");
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
  document.documentElement.setAttribute("data-theme", "light");
} else {
  document.documentElement.setAttribute("data-theme", "dark");
}

if (currentTheme) {
  document.documentElement.setAttribute("data-theme", currentTheme);
}

function switchTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  if (currentTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  }
}

toggleSwitch.addEventListener("click", switchTheme, false);
