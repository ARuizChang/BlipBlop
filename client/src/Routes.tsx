import { useContext } from "react";
import { UserContext } from "./UserContext";
import RegisterAndLoginForm from "./RegisterAndLoginForm";
import Chat from "./chat";

export default function Routes() {
    const {username, id} = useContext(UserContext);

    if (username) {
        return <Chat />;
    }

    return(
        <RegisterAndLoginForm />
    )
}