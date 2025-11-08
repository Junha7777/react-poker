import React from "react";
import ReactDOM from "react-dom/client";
import TexasHoldem from "./TexasHoldem";
import "./styles.css";

ReactDOM
    .createRoot(document.getElementById("root")as HTMLElement)
    .render(<React.StrictMode>
        <TexasHoldem/>
    </React.StrictMode>);
