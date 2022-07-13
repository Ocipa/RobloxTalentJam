import { Networking } from "@flamework/networking";




// Client -> Server events
interface ServerEvents {
    AddRobot(): void
    RemoveRobot(): void
}


// Server -> Client events
interface ClientEvents {

}


// Returns an object containing a `server` and `client` field.
export const globalEvents = Networking.createEvent<ServerEvents, ClientEvents>();