// src/components/base/image/image.js

import { BaseComponent } from "../../core/base-component.js";
import { BaseEvent } from "../../core/event-system.js";


export class CoolImage extends BaseComponent {
  static get observedAttributes() {
    return ["src", "alt", "caption", "width", "height"];
  }

  constructor(options = {}) {
    super(options);

    this._src = options.src || this.getAttribute("src") || "";
    this._alt = options.alt || this.getAttribute("alt") || "";
    this._caption = options.caption || this.getAttribute("caption") || "";
    this._width = options.width || this.getAttribute("width") || "100%";
    this._height = options.height || this.getAttribute("height") || "auto";

    // Initialize event for click
    this._onClick = new BaseEvent();

    this.initShadowDom(new URL("./image.css", import.meta.url).toString());

    this._container = this.createElement("figure", {
      class: "mdc-image",
      style: { margin: "0" },
    });

    this._img = this.createElement("img", {
      src: this._src,
      alt: this._alt,
      style: {
        width: this._width,
        height: this._height,
        objectFit: "cover",
      },
    });

    // Add click event listener to the image
    this._img.addEventListener("click", (event) => {
      this._onClick.dispatch({ event, src: this._src, alt: this._alt });
    });

    // Optional: Handle image load/error events
    this._img.addEventListener("load", () => {
      console.log(`Image loaded: ${this._src}`);
    });
    this._img.addEventListener("error", () => {
      console.error(`Failed to load image: ${this._src}`);
      this._img.src = "/fallback-image.jpg"; // Fallback image
    });

    if (this._caption) {
      this._captionEl = this.createElement(
        "figcaption",
        {
          class: "mdc-typography--caption",
        },
        this._caption
      );
      this._container.append(this._img, this._captionEl);
    } else {
      this._container.append(this._img);
    }

    this._shadow.appendChild(this._container);
  }

  // Getter for click event
  get onClick() {
    return this._onClick;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case "src":
        this._img.src = newValue || "";
        break;
      case "alt":
        this._img.alt = newValue || "";
        break;
      case "caption":
        if (newValue) {
          if (!this._captionEl) {
            this._captionEl = this.createElement(
              "figcaption",
              {
                class: "mdc-typography--caption",
              },
              newValue
            );
            this._container.appendChild(this._captionEl);
          } else {
            this._captionEl.textContent = newValue;
          }
        } else if (this._captionEl) {
          this._captionEl.remove();
          this._captionEl = null;
        }
        break;
      case "width":
        this._img.style.width = newValue || "100%";
        break;
      case "height":
        this._img.style.height = newValue || "auto";
        break;
    }
  }

  get src() {
    return this._img.src;
  }

  set src(value) {
    this._img.src = value || "";
    this.setAttribute("src", value);
  }

  get alt() {
    return this._img.alt;
  }

  set alt(value) {
    this._img.alt = value || "";
    this.setAttribute("alt", value);
  }

  get caption() {
    return this._captionEl ? this._captionEl.textContent : "";
  }

  set caption(value) {
    if (value) {
      if (!this._captionEl) {
        this._captionEl = this.createElement(
          "figcaption",
          {
            class: "mdc-typography--caption",
          },
          value
        );
        this._container.appendChild(this._captionEl);
      } else {
        this._captionEl.textContent = value;
      }
      this.setAttribute("caption", value);
    } else if (this._captionEl) {
      this._captionEl.remove();
      this._captionEl = null;
      this.removeAttribute("caption");
    }
  }
}

customElements.define("cool-image", CoolImage);
