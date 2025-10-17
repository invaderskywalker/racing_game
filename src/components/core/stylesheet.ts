// src/components/core/stylesheet.ts
export function loadStylesheet(shadow: ShadowRoot, url: string): void {
  const styleLink = document.createElement("link");
  styleLink.setAttribute("rel", "stylesheet");
  styleLink.setAttribute("href", url);
  shadow.appendChild(styleLink);
}
