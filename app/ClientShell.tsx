import { BrowserRouter } from "react-router-dom";
import App from "./ui/App";
// import { ListManagerProvider } from "./ui/modules/Lists/ListManagerContext";

export default function ClientShell() {
    return (
        <BrowserRouter>
            {/*<ListManagerProvider>*/}
            <App />
            {/*</ListManagerProvider>*/}
        </BrowserRouter>
    );
}
