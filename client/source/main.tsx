import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
// Import App Components
import App from "./App";
// Import global styles
import "./main.css";

// Extract the style of the root container
const classNames = "relative w-screen h-screen";
document.getElementById("root")!.classList.add(...classNames.split(/\s+/g));

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
		<Toaster position="top-right" reverseOrder={false} />
	</StrictMode>
);
