const loadingRegion = document.getElementById("dashboard-content");

const showUnavailable = () => {
  const section = document.createElement("section");
  section.className = "dashboard-unavailable";
  section.setAttribute("data-view", "unavailable");
  const heading = document.createElement("h2");
  heading.textContent = "Dashboard unavailable";
  const message = document.createElement("p");
  message.textContent = "Dashboard content cannot be shown.";
  section.append(heading, message);
  loadingRegion?.replaceWith(section);
};

try {
  const response = await fetch("/dashboard/content", { credentials: "same-origin" });
  if (!response.ok) throw new Error("Unavailable");
  const template = document.createElement("template");
  template.innerHTML = await response.text();
  loadingRegion?.replaceWith(template.content);
} catch {
  showUnavailable();
}
