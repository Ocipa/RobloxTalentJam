import { BaseComponent, Component } from "@flamework/components";
import { Dependency, OnStart } from "@flamework/core";
import { RobotService } from "server/services/robot";
import { Robot } from "shared/robot";





@Component({
    tag: "player"
})
export class Ply extends BaseComponent<{}, Player> implements OnStart {
    constructor() {
        super()
    }

    onStart(): void {
        const robotService = Dependency<RobotService>()

        this.instance.CharacterAdded.Connect((character) => {
            this.instance.CharacterAppearanceLoaded.Wait()

            task.wait()

            const robots: Array<Robot> = robotService.GetRobotsOwnedByPlayer(this.instance)

            for (const robot of robots) {
                robot.Spawn()
            }
        })

        print("%s joined the game".format(this.instance.Name))
    }
}