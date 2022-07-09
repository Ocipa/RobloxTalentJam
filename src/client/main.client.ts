import { Flamework } from "@flamework/core";
import { events } from "./controllers/networking";




Flamework.addPaths("./controllers")


Flamework.ignite()




const contextActionService = game.GetService("ContextActionService")

contextActionService.BindAction("spawnRobot", (name, inputState, inputObject) => {
    if (inputState === Enum.UserInputState.End) {
        events.AddRobot.fire()
    }
}, false, Enum.KeyCode.E)
